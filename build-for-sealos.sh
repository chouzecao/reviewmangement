#!/bin/bash

# 设置环境变量避免跨设备链接问题
export TMPDIR=/tmp

echo "===== 准备后端环境 ====="
cd /home/devbox/project/server

# 确保后端依赖已安装 - 增加内存限制
NODE_OPTIONS="--max-old-space-size=512" npm install

# 创建.env.production文件（如果不存在）
if [ ! -f .env.production ]; then
  echo "创建后端环境配置文件..."
  cat > .env.production << 'EOF'
# 服务器配置
PORT=3000
NODE_ENV=production

# 数据库配置
MONGODB_URI=mongodb://root:8gx89ljj@comdb-mongodb.ns-dc2goees.svc:27017/review_management?authSource=admin&retryWrites=true&w=majority

# JWT配置
JWT_SECRET=finnertrip-review-management-secret
JWT_EXPIRES_IN=24h

# Session配置
SESSION_SECRET=finnertrip-session-secret

# 文件上传配置
UPLOAD_DIR=uploads
MAX_FILE_SIZE=5242880  # 5MB
EOF
  echo "后端环境配置文件创建完成"
fi

echo "===== 后端环境准备完成 ====="

echo "===== 开始构建前端应用 ====="
cd /home/devbox/project/client

# 创建.env.production文件
echo "VITE_API_URL=/api" > .env.production

# 清理旧的构建文件
rm -rf dist
rm -rf node_modules/.vite

# 构建前端 - 增加内存限制
NODE_ENV=production NODE_OPTIONS="--max-old-space-size=4096" npm run build

# 确保serve.json文件存在且内容正确
cat > serve.json << 'EOF'
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "${API_URL:-http://localhost:3000}/api/:path*" },
    { "source": "/uploads/:path*", "destination": "${API_URL:-http://localhost:3000}/uploads/:path*" }
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
EOF

# 复制serve.json到dist目录
cp serve.json dist/

echo "===== 前端构建完成 ====="

# 更新entrypoint.sh脚本
echo "===== 更新启动脚本 ====="
cd /home/devbox/project

cat > entrypoint.sh << 'EOF'
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
log "等待后端服务启动 (5秒)..."
sleep 5

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

# 明确使用127.0.0.1而不是localhost来确保网络访问
BACKEND_API="http://127.0.0.1:${PORT}"
log "前端服务配置:"
log "  API地址: ${BACKEND_API}"
log "  服务选项: ${SERVE_OPTIONS}"

# 创建并验证serve.json配置
log "创建serve.json配置文件..."
mkdir -p dist
cat > dist/serve.json << EOFINNER
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "${BACKEND_API}/api/:path*" },
    { "source": "/uploads/:path*", "destination": "${BACKEND_API}/uploads/:path*" }
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

# 添加测试连接后端
log "测试后端API连接..."
if command -v curl > /dev/null; then
    curl -s -o /dev/null -w "API连接测试结果: %{http_code}\n" "${BACKEND_API}/api/health" || log_error "无法连接到后端API"
elif command -v wget > /dev/null; then
    wget -q -O /dev/null "${BACKEND_API}/api/health" && log "API连接测试成功" || log_error "无法连接到后端API"
else
    log "无法测试API连接 (缺少curl或wget)"
fi

# 启动前端服务
log "启动前端服务..."
npx serve -s dist -l ${FRONTEND_PORT:-8080} --cors --config ./dist/serve.json ${SERVE_OPTIONS} &
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
EOF

# 给 entrypoint.sh 添加执行权限
chmod +x entrypoint.sh

echo "===== 构建完成 ====="
echo "现在可以在 Sealos 上部署应用了。请确保设置适当的内存限制:"
echo "- 前端容器至少 256MB 内存"
echo "- 后端容器至少 512MB 内存" 