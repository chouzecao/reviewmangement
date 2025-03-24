#!/bin/bash

# 日志输出函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# 错误日志输出函数
log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [错误] $1" >&2
}

# 调试日志
log_debug() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [调试] $1" >&2
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

# 检查网络配置
log "检查网络配置..."
log "主机名: $(hostname)"
log "网络接口:"
ip addr show | grep -E "inet " | while read line; do log "  $line"; done

# DNS 解析检查
log "检查DNS解析..."
if command -v dig > /dev/null || command -v nslookup > /dev/null; then
    if command -v dig > /dev/null; then
        dig +short localhost
        log "localhost DNS解析: $(dig +short localhost)"
    elif command -v nslookup > /dev/null; then
        log "localhost DNS解析: $(nslookup localhost | grep Address | tail -n1)"
    fi
fi

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

# 检查后端配置文件
log "检查app.js文件..."
if [ -f "src/app.js" ]; then
    # 显示app.listen部分
    log "后端服务监听配置:"
    grep -A 3 "app.listen" src/app.js | while read line; do log "  $line"; done
fi

# 添加健康检查路由（如果不存在）
log "确保健康检查端点存在..."
if [ -f "src/app.js" ]; then
    if ! grep -q "app.get('/api/health'" src/app.js; then
        log "添加/api/health路由用于健康检查"
        # 创建临时文件添加健康检查路由
        TEMP_FILE=$(mktemp)
        awk '/app.use/ && !health_added {print "// 添加健康检查路由\napp.get(\"/api/health\", (req, res) => { res.status(200).json({ status: \"ok\", time: new Date().toISOString() }); });\n"; health_added=1} {print}' src/app.js > $TEMP_FILE
        cat $TEMP_FILE > src/app.js
        rm $TEMP_FILE
        log "健康检查路由添加完成"
    else
        log "健康检查路由已存在"
    fi
fi

# 在后台启动后端服务
log "启动后端服务..."
node src/app.js > server.log 2>&1 &
BACKEND_PID=$!
log "后端服务进程ID: ${BACKEND_PID}"

# 等待后端服务启动
log "等待后端服务启动 (15秒)..."
for i in {1..15}; do
    log "等待后端服务启动: $i 秒"
    sleep 1
    if grep -q "服务器运行在端口" server.log; then
        log "后端服务已启动，监听端口信息:"
        grep "服务器运行在端口" server.log | while read line; do log "  $line"; done
        break
    fi
done

# 显示后端日志
log "后端服务启动日志 (最近20行):"
tail -n 20 server.log | while read line; do log "  $line"; done

# 验证后端服务是否正常运行
if kill -0 $BACKEND_PID 2>/dev/null; then
    log "后端服务进程运行正常"
    
    # 验证端口是否正在监听
    PORTS_LISTENING=false
    if command -v lsof > /dev/null; then
        log "检查端口状态 (lsof):"
        lsof -i :${PORT} | while read line; do log "  $line"; done
        lsof -i :${PORT} | grep -q LISTEN && PORTS_LISTENING=true
    elif command -v netstat > /dev/null; then
        log "检查端口状态 (netstat):"
        netstat -tulpn 2>/dev/null | grep "LISTEN" | grep ":${PORT}" | while read line; do log "  $line"; done
        netstat -tulpn 2>/dev/null | grep "LISTEN" | grep ":${PORT}" | grep -q "." && PORTS_LISTENING=true
    elif command -v ss > /dev/null; then
        log "检查端口状态 (ss):"
        ss -tulpn 2>/dev/null | grep "LISTEN" | grep ":${PORT}" | while read line; do log "  $line"; done
        ss -tulpn 2>/dev/null | grep "LISTEN" | grep ":${PORT}" | grep -q "." && PORTS_LISTENING=true
    fi
    
    if [ "$PORTS_LISTENING" = "true" ]; then
        log "后端服务正在监听端口 ${PORT}"
    else
        log_error "警告：未检测到后端服务监听端口 ${PORT}"
    fi
else
    log_error "后端服务进程已退出"
    log_error "查看错误日志:"
    cat server.log
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

# 安装http-server（如果需要）
if ! command -v http-server > /dev/null; then
    log "安装http-server..."
    npm install -g http-server
fi

# 启动前端服务
log "启动前端服务..."
http-server dist -p ${FRONTEND_PORT:-8080} --proxy http://127.0.0.1:${PORT} --cors --silent > frontend.log 2>&1 &
FRONTEND_PID=$!
log "前端服务进程ID: ${FRONTEND_PID}"

# 等待前端服务启动
log "等待前端服务启动 (5秒)..."
sleep 5

# 显示前端日志
log "前端服务启动日志 (最近20行):"
tail -n 20 frontend.log | while read line; do log "  $line"; done

# 验证前端服务是否正常运行
if kill -0 $FRONTEND_PID 2>/dev/null; then
    log "前端服务进程运行正常"
    
    # 验证端口是否正在监听
    if command -v lsof > /dev/null; then
        log "检查前端端口状态 (lsof):"
        lsof -i :${FRONTEND_PORT:-8080} | while read line; do log "  $line"; done
    elif command -v netstat > /dev/null; then
        log "检查前端端口状态 (netstat):"
        netstat -tulpn 2>/dev/null | grep "LISTEN" | grep ":${FRONTEND_PORT:-8080}" | while read line; do log "  $line"; done
    elif command -v ss > /dev/null; then
        log "检查前端端口状态 (ss):"
        ss -tulpn 2>/dev/null | grep "LISTEN" | grep ":${FRONTEND_PORT:-8080}" | while read line; do log "  $line"; done
    fi
else
    log_error "前端服务进程已退出"
    log_error "查看错误日志:"
    cat frontend.log
    kill -15 $BACKEND_PID
    exit 1
fi

# 进程监控函数
monitor_processes() {
    log "启动进程监控..."
    while true; do
        if ! kill -0 $BACKEND_PID 2>/dev/null; then
            log_error "后端服务已停止 (PID: ${BACKEND_PID})"
            log_error "后端服务日志尾部:"
            tail -n 20 server.log | while read line; do log_error "  $line"; done
            kill -15 $FRONTEND_PID 2>/dev/null || true
            return 1
        fi
        if ! kill -0 $FRONTEND_PID 2>/dev/null; then
            log_error "前端服务已停止 (PID: ${FRONTEND_PID})"
            log_error "前端服务日志尾部:"
            tail -n 20 frontend.log | while read line; do log_error "  $line"; done
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
