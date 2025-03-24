#!/bin/bash

# 日志输出函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# 错误日志输出函数
log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [错误] $1" >&2
}

# 设置环境变量
export NODE_ENV=production
export PORT=${PORT:-3000}
# 设置TMPDIR环境变量解决文件系统跨设备链接问题
export TMPDIR=/tmp
# 设置内存限制以优化性能
export NODE_OPTIONS="--max-old-space-size=${NODE_MEMORY:-512}"

# 打印运行环境信息
log "======= 应用启动 ======="
log "运行模式: ${NODE_ENV}"
log "内存限制: ${NODE_OPTIONS}"
log "后端端口: ${PORT}"
log "前端端口: ${FRONTEND_PORT:-8080}"
log "MongoDB URI: ${MONGODB_URI:-使用默认配置}"
log "工作目录: $(pwd)"
log "系统内存信息:"
free -h | while read line; do log "  $line"; done
log "======================="

# 启动后端服务
log "切换到后端目录..."
cd /home/devbox/project/server || {
    log_error "切换到后端目录失败"
    exit 1
}
log "当前目录: $(pwd)"

# 检查上传目录
if [ -d "uploads" ]; then
    log "上传目录已存在: $(pwd)/uploads"
    # 检查目录是否可写
    if [ -w "uploads" ]; then
        log "上传目录权限正常（可写）"
    else
        log "上传目录为只读（使用持久卷时这是正常的）"
    fi
else
    log "创建上传目录..."
    mkdir -p uploads 2>/dev/null || {
        log_error "无法创建上传目录，将使用已存在的目录"
    }
fi

# 检查数据库连接
log "检查数据库连接..."
node -e "
const mongoose = require('mongoose');
const uri = process.env.MONGODB_URI || require('./src/config/config').db.uri;
console.log('[' + new Date().toISOString() + '] 尝试连接数据库: ' + uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
  .then(() => console.log('[' + new Date().toISOString() + '] 数据库连接正常'))
  .catch((err) => {
    console.error('[' + new Date().toISOString() + '] 数据库连接失败:', err);
    process.exit(1);
  });
"

# 检查网络情况
log "检查网络配置..."
ip addr show | grep -E "inet " | while read line; do log "  $line"; done

# 修改服务器配置，确保监听在0.0.0.0
log "检查并确保后端服务监听在所有网络接口(0.0.0.0)..."
if [ -f "src/app.js" ]; then
    # 确保app.js中的监听地址是0.0.0.0
    grep -q "app.listen.*'0.0.0.0'" src/app.js || {
        log_error "警告: 后端服务可能没有监听在所有接口上，可能导致网络连接问题"
    }
fi

# 在后台启动后端服务
log "启动后端服务..."
node src/app.js &
BACKEND_PID=$!
log "后端服务进程ID: ${BACKEND_PID}"

# 等待后端服务启动
log "等待后端服务启动 (10秒)..."
sleep 10

# 验证后端服务是否正常运行
if kill -0 $BACKEND_PID 2>/dev/null; then
    log "后端服务启动成功"
    # 验证端口是否正在监听
    if command -v netstat > /dev/null; then
        log "检查端口状态:"
        netstat -tulpn 2>/dev/null | grep "LISTEN" | grep ":${PORT}" | while read line; do 
            log "  $line"
        done
    elif command -v ss > /dev/null; then
        log "检查端口状态:"
        ss -tulpn 2>/dev/null | grep "LISTEN" | grep ":${PORT}" | while read line; do 
            log "  $line"
        done
    fi
else
    log_error "后端服务启动失败"
    exit 1
fi

# 启动前端服务
log "切换到前端目录..."
cd /home/devbox/project/client || {
    log_error "切换到前端目录失败"
    kill -15 $BACKEND_PID
    exit 1
}
log "当前目录: $(pwd)"

# 设置前端服务配置
export SERVE_OPTIONS="--symlinks --no-clipboard --single"
log "前端服务选项: ${SERVE_OPTIONS}"

# 尝试不同的后端地址选项
log "测试不同的API连接方式..."
CONNECTION_OK=false

# 选项1: 检查127.0.0.1
BACKEND_API="http://127.0.0.1:${PORT}"
log "尝试连接后端: ${BACKEND_API}"
if command -v curl > /dev/null; then
    if curl -s -o /dev/null -w "%{http_code}\n" "${BACKEND_API}/api/health" | grep -q "200"; then
        log "API连接成功 (127.0.0.1)"
        CONNECTION_OK=true
    else
        log_error "无法连接到后端API (127.0.0.1)"
    fi
fi

# 选项2: 如果选项1失败，尝试使用localhost
if [ "$CONNECTION_OK" = "false" ]; then
    BACKEND_API="http://localhost:${PORT}"
    log "尝试连接后端: ${BACKEND_API}"
    if command -v curl > /dev/null; then
        if curl -s -o /dev/null -w "%{http_code}\n" "${BACKEND_API}/api/health" | grep -q "200"; then
            log "API连接成功 (localhost)"
            CONNECTION_OK=true
        else
            log_error "无法连接到后端API (localhost)"
        fi
    fi
fi

# 选项3: 如果前两个选项都失败，尝试使用0.0.0.0
if [ "$CONNECTION_OK" = "false" ]; then
    BACKEND_API="http://0.0.0.0:${PORT}"
    log "尝试连接后端: ${BACKEND_API}"
    if command -v curl > /dev/null; then
        if curl -s -o /dev/null -w "%{http_code}\n" "${BACKEND_API}/api/health" | grep -q "200"; then
            log "API连接成功 (0.0.0.0)"
            CONNECTION_OK=true
        else
            log_error "无法连接到后端API (0.0.0.0)"
        fi
    fi
fi

# 如果所有选项都失败，记录警告但继续尝试
if [ "$CONNECTION_OK" = "false" ]; then
    log_error "警告: 所有API连接测试都失败。将使用127.0.0.1作为后备选项"
    BACKEND_API="http://127.0.0.1:${PORT}"
fi

log "使用的后端API地址: ${BACKEND_API}"

# 创建并验证serve.json配置
log "创建serve.json配置文件..."
mkdir -p dist
cat > dist/serve.json << EOFINNER
{
  "rewrites": [
    { "source": "/api/*", "destination": "${BACKEND_API}/api/:splat" },
    { "source": "/uploads/*", "destination": "${BACKEND_API}/uploads/:splat" }
  ],
  "headers": [
    {
      "source": "**/*",
      "headers": [
        { "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" },
        { "key": "Access-Control-Allow-Origin", "value": "*" }
      ]
    },
    {
      "source": "/api/**",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET, POST, PUT, DELETE, OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Origin, X-Requested-With, Content-Type, Accept, Authorization" }
      ]
    }
  ]
}
EOFINNER

log "serve.json 配置文件内容:"
cat dist/serve.json

# 启动前端服务
log "启动前端服务..."
npx serve -s dist -l ${FRONTEND_PORT:-8080} --cors --config ./dist/serve.json ${SERVE_OPTIONS} --debug &
FRONTEND_PID=$!
log "前端服务进程ID: ${FRONTEND_PID}"

# 进程监控函数
monitor_processes() {
    log "启动进程监控..."
    while true; do
        if ! kill -0 $BACKEND_PID 2>/dev/null; then
            log_error "后端服务已停止 (PID: ${BACKEND_PID})"
            kill -15 $FRONTEND_PID 2>/dev/null || true
            return 1
        fi
        if ! kill -0 $FRONTEND_PID 2>/dev/null; then
            log_error "前端服务已停止 (PID: ${FRONTEND_PID})"
            kill -15 $BACKEND_PID 2>/dev/null || true
            return 1
        fi
        log "服务状态检查: 正常运行中 (后端PID: ${BACKEND_PID}, 前端PID: ${FRONTEND_PID})"
        sleep 30
    done
}

# 启动监控进程
monitor_processes &
MONITOR_PID=$!
log "监控进程已启动 (PID: ${MONITOR_PID})"

# 等待任意子进程退出
log "等待服务运行..."
wait -n
EXIT_CODE=$?

# 清理进程
log_error "检测到服务异常退出 (退出码: ${EXIT_CODE})"
log "正在关闭所有服务..."
kill -15 $BACKEND_PID 2>/dev/null || true
kill -15 $FRONTEND_PID 2>/dev/null || true
kill -15 $MONITOR_PID 2>/dev/null || true

log "应用退出"
exit 1
