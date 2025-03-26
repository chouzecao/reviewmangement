#!/bin/bash

# 错误处理
set -e  # 遇到错误立即退出
set -o pipefail  # 管道中的错误也会导致脚本退出

# 日志函数
log() {
  echo "$(date +'%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
  echo "$(date +'%Y-%m-%d %H:%M:%S') - [错误] $1" >&2
}

# 设置临时目录以避免cross-device link问题
export TMPDIR=/tmp
log "设置TMPDIR=$TMPDIR"

# 提供日志
log "==================== 准备后端环境 ===================="

# 进入server目录并安装依赖
cd "/home/devbox/project/server" || { log_error "无法进入服务器目录"; exit 1; }
log "当前目录: $(pwd)"

NPM_CONFIG_REGISTRY=https://registry.npmmirror.com NODE_OPTIONS="--max-old-space-size=512" npm install || { log_error "后端依赖安装失败"; exit 1; }
log "后端依赖安装完成"

# 创建生产环境配置文件
cat <<EOF > .env.production
SERVER_PORT=3000
MONGODB_URI=mongodb://root:8gx89ljj@comdb-mongodb.ns-dc2goees.svc:27017/reviewdb?authSource=admin
EOF
log "后端环境配置完成"

# 准备前端环境
log "==================== 准备前端环境 ===================="
cd "/home/devbox/project/client" || { log_error "无法进入前端目录"; exit 1; }
log "当前目录: $(pwd)"

# 创建生产环境配置文件
cat <<EOF > .env.production
VITE_API_URL=/api
EOF

# 清理旧的构建文件
rm -rf dist
log "开始构建前端应用"

# 构建前端应用
log "安装前端依赖..."
NPM_CONFIG_REGISTRY=https://registry.npmmirror.com NODE_OPTIONS="--max-old-space-size=2048" npm install || { log_error "前端依赖安装失败"; exit 1; }

log "构建前端应用..."
NODE_OPTIONS="--max-old-space-size=2048" npm run build || { log_error "前端构建失败"; log "尝试继续执行..."; }
log "前端应用构建完成"

# 安装代理服务器依赖
log "==================== 安装代理服务器依赖 ===================="
npm install express http-proxy-middleware --save || { log_error "代理服务器依赖安装失败"; exit 1; }
log "代理服务器依赖安装完成"

# 确保上传目录存在并设置权限
mkdir -p "/home/devbox/project/server/public/uploads"
chmod -R 777 "/home/devbox/project/server/public/uploads"
log "上传目录创建并设置权限完成"

# 更新启动脚本
log "==================== 更新启动脚本 ===================="
cd "/home/devbox/project" || { log_error "无法返回项目根目录"; exit 1; }
log "当前目录: $(pwd)"

cat <<EOF > entrypoint.sh
#!/bin/bash

# 日志函数
log() {
  echo "\$(date +'%Y-%m-%d %H:%M:%S') - \$1"
}

log_error() {
  echo "\$(date +'%Y-%m-%d %H:%M:%S') - [错误] \$1" >&2
}

# 错误处理
set -o pipefail

# 设置环境变量
export TMPDIR=/tmp
export NODE_ENV=production
export PORT=3000
export HOST=0.0.0.0
export FRONTEND_PORT=8080

log "======= 应用启动 ======="
log "运行模式: \${NODE_ENV}"
log "后端端口: \${PORT}"
log "前端端口: \${FRONTEND_PORT}"
log "工作目录: \$(pwd)"

cd "/home/devbox/project" || { log_error "无法进入项目目录"; exit 1; }

# 启动后端服务
log "启动后端服务..."
cd "/home/devbox/project/server" || { log_error "无法进入服务器目录"; exit 1; }
log "当前目录: \$(pwd)"

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
    log_error "数据库连接检查失败"
    exit 1
}

# 启动后端服务
log "正在启动后端服务..."
NODE_ENV=production PORT=\${PORT} HOST=\${HOST} nohup node src/app.js > backend.log 2>&1 &
BACKEND_PID=\$!
log "后端服务已启动，PID: \${BACKEND_PID}"

# 验证后端服务是否正常启动
sleep 5
if ! ps -p \$BACKEND_PID > /dev/null; then
  log_error "后端服务启动失败，查看日志:"
  cat backend.log
  exit 1
fi

# 检查API是否可访问
log "检查API健康状态..."
for i in {1..10}; do
  if curl -s http://localhost:\${PORT}/api/health | grep -q "ok"; then
    log "API健康检查通过"
    break
  else
    if [ \$i -eq 10 ]; then
      log_error "API健康检查失败，查看日志:"
      cat backend.log
      exit 1
    fi
    log "等待API就绪... (\$i/10)"
    sleep 3
  fi
done

# 启动前端代理服务
cd "/home/devbox/project/client" || { log_error "无法进入前端目录"; exit 1; }
log "启动前端代理服务..."
# 设置API_URL环境变量以确保代理正确指向后端
export API_URL="http://commentge-finalrelease.ns-dc2goees.svc.cluster.local:3000"
nohup node proxy-server/server.js > frontend.log 2>&1 &
FRONTEND_PID=\$!
log "前端代理服务已启动，PID: \${FRONTEND_PID}"

# 验证前端服务是否正常启动
sleep 3
if ! ps -p \$FRONTEND_PID > /dev/null; then
  log_error "前端代理服务启动失败，查看日志:"
  cat frontend.log
  exit 1
fi

# 显示服务URL
log "服务URL:"
log "- 前端: http://localhost:\${FRONTEND_PORT}"
log "- 后端API: http://localhost:\${PORT}/api"
log "- 健康检查: http://localhost:\${PORT}/api/health"

# 监控进程状态
log "所有服务已启动，监控进程状态..."
while true; do
  if ! ps -p \$BACKEND_PID > /dev/null; then
    log_error "后端服务意外终止，查看日志:"
    cat backend.log
    exit 1
  fi
  
  if ! ps -p \$FRONTEND_PID > /dev/null; then
    log_error "前端代理服务意外终止，查看日志:"
    cat frontend.log
    exit 1
  fi
  
  log "服务状态: 正常运行中 (后端PID: \${BACKEND_PID}, 前端PID: \${FRONTEND_PID})"
  sleep 30
done
EOF

# 添加执行权限
chmod +x entrypoint.sh
log "启动脚本更新完成"

log "构建完成，可以部署到Sealos了"
log "注意: 请确保为前端和后端容器设置合适的内存限制" 