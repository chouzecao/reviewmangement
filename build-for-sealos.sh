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

# 添加http-server到依赖
if ! grep -q "http-server" package.json; then
  echo "添加http-server到依赖..."
  npm install --save-dev http-server
fi

# 创建客户端serve.json
cat > serve.json << 'EOF'
{
  "rewrites": [
    { "source": "/api/**", "destination": "http://127.0.0.1:3000/api/**" },
    { "source": "/uploads/**", "destination": "http://127.0.0.1:3000/uploads/**" }
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

# 创建dist目录下的serve.json
cat > dist/serve.json << 'EOF'
{
  "rewrites": [
    { "source": "/api/**", "destination": "http://127.0.0.1:3000/api/**" },
    { "source": "/uploads/**", "destination": "http://127.0.0.1:3000/uploads/**" }
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

echo "===== 前端构建完成 ====="

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
EOF

# 给 entrypoint.sh 添加执行权限
chmod +x entrypoint.sh

echo "===== 构建完成 ====="
echo "现在可以在 Sealos 上部署应用了。请确保设置适当的内存限制:"
echo "- 前端容器至少 256MB 内存"
echo "- 后端容器至少 512MB 内存" 