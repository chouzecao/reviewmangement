#!/bin/bash

# 日志函数
log() {
  echo "$(date +'%Y-%m-%d %H:%M:%S') - $1"
}

# 设置环境变量
export TMPDIR=/tmp
cd "/home/devbox/project" || exit

# 启动后端服务
log "启动后端服务..."
cd "/home/devbox/project/server" || exit

# 先检查能否连接到数据库
log "检查数据库连接..."
node -e "
const mongoose = require('mongoose');
const uri = process.env.MONGODB_URI || process.env.DB_URL || require('./src/config/config').db.uri;
console.log('[' + new Date().toISOString() + '] 尝试连接数据库: ' + uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    console.log('[' + new Date().toISOString() + '] 数据库连接正常');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[' + new Date().toISOString() + '] 数据库连接失败:', err);
    process.exit(1);
  });
" || {
    log "数据库连接检查失败"
    exit 1
}

# 启动后端服务
log "正在启动后端服务..."
nohup node src/app.js > backend.log 2>&1 &
BACKEND_PID=$!
log "后端服务已启动，PID: $BACKEND_PID"

# 验证后端服务是否正常启动
sleep 5
if ! ps -p $BACKEND_PID > /dev/null; then
  log "后端服务启动失败，查看日志:"
  cat backend.log
  exit 1
fi

# 检查API是否可访问
log "检查API健康状态..."
for i in {1..10}; do
  if curl -s http://localhost:3000/api/health | grep -q "ok"; then
    log "API健康检查通过"
    break
  else
    if [ $i -eq 10 ]; then
      log "API健康检查失败，查看日志:"
      cat backend.log
      exit 1
    fi
    log "等待API就绪... ($i/10)"
    sleep 3
  fi
done

# 启动前端代理服务
cd "/home/devbox/project/client" || exit
log "启动前端代理服务..."
export FRONTEND_PORT=8080
nohup node proxy-server/server.js > frontend.log 2>&1 &
FRONTEND_PID=$!
log "前端代理服务已启动，PID: $FRONTEND_PID"

# 验证前端服务是否正常启动
sleep 3
if ! ps -p $FRONTEND_PID > /dev/null; then
  log "前端代理服务启动失败，查看日志:"
  cat frontend.log
  exit 1
fi

# 监控进程状态
log "所有服务已启动，监控进程状态..."
while true; do
  if ! ps -p $BACKEND_PID > /dev/null; then
    log "后端服务意外终止，查看日志:"
    cat backend.log
    exit 1
  fi
  
  if ! ps -p $FRONTEND_PID > /dev/null; then
    log "前端代理服务意外终止，查看日志:"
    cat frontend.log
    exit 1
  fi
  
  sleep 30
done
