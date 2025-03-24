#!/bin/bash

# 设置临时目录以避免cross-device link问题
export TMPDIR=/tmp

# 提供日志
echo "==================== 准备后端环境 ===================="

# 进入server目录并安装依赖
cd "$PWD/server" || exit
NPM_CONFIG_REGISTRY=https://registry.npmmirror.com NODE_OPTIONS="--max-old-space-size=512" npm install
echo "后端依赖安装完成"

# 创建生产环境配置文件
cat <<EOF > .env.production
SERVER_PORT=3000
DB_URL=mongodb://mongo:27017/reviewdb
EOF
echo "后端环境配置完成"

# 准备前端环境
echo "==================== 准备前端环境 ===================="
cd "$PWD/../client" || exit

# 创建生产环境配置文件
cat <<EOF > .env.production
VITE_API_URL=/api
EOF

# 清理旧的构建文件
rm -rf dist
echo "开始构建前端应用"

# 构建前端应用
NPM_CONFIG_REGISTRY=https://registry.npmmirror.com NODE_OPTIONS="--max-old-space-size=512" npm install
NODE_OPTIONS="--max-old-space-size=512" npm run build
echo "前端应用构建完成"

# 安装代理服务器依赖
echo "==================== 安装代理服务器依赖 ===================="
npm install express http-proxy-middleware --save
echo "代理服务器依赖安装完成"

# 确保上传目录存在并设置权限
mkdir -p "$PWD/../server/public/uploads"
chmod -R 777 "$PWD/../server/public/uploads"
echo "上传目录创建并设置权限完成"

# 更新启动脚本
echo "==================== 更新启动脚本 ===================="
cd "$PWD/.." || exit

cat <<EOF > entrypoint.sh
#!/bin/bash

# 日志函数
log() {
  echo "\$(date +'%Y-%m-%d %H:%M:%S') - \$1"
}

# 设置环境变量
export TMPDIR=/tmp
cd "$PWD" || exit

# 启动后端服务
log "启动后端服务..."
cd "$PWD/server" || exit

# 先检查能否连接到数据库
log "检查数据库连接..."
node -e "
const mongoose = require('mongoose');
const uri = process.env.DB_URL || 'mongodb://mongo:27017/reviewdb';
mongoose.connect(uri).then(() => {
  console.log('数据库连接成功');
  process.exit(0);
}).catch(err => {
  console.error('数据库连接失败:', err);
  process.exit(1);
});
"

if [ \$? -ne 0 ]; then
  log "数据库连接失败，等待10秒后重试..."
  sleep 10
  node -e "
  const mongoose = require('mongoose');
  const uri = process.env.DB_URL || 'mongodb://mongo:27017/reviewdb';
  mongoose.connect(uri).then(() => {
    console.log('数据库连接成功');
    process.exit(0);
  }).catch(err => {
    console.error('数据库连接失败:', err);
    process.exit(1);
  });
  "
  
  if [ \$? -ne 0 ]; then
    log "数据库连接失败，退出服务"
    exit 1
  fi
fi

# 启动后端服务
log "正在启动后端服务..."
nohup node app.js > backend.log 2>&1 &
BACKEND_PID=\$!
log "后端服务已启动，PID: \$BACKEND_PID"

# 验证后端服务是否正常启动
sleep 5
if ! ps -p \$BACKEND_PID > /dev/null; then
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
    if [ \$i -eq 10 ]; then
      log "API健康检查失败，查看日志:"
      cat backend.log
      exit 1
    fi
    log "等待API就绪... (\$i/10)"
    sleep 3
  fi
done

# 启动前端代理服务
cd "$PWD/../client" || exit
log "启动前端代理服务..."
nohup node proxy-server/server.js > frontend.log 2>&1 &
FRONTEND_PID=\$!
log "前端代理服务已启动，PID: \$FRONTEND_PID"

# 验证前端服务是否正常启动
sleep 3
if ! ps -p \$FRONTEND_PID > /dev/null; then
  log "前端代理服务启动失败，查看日志:"
  cat frontend.log
  exit 1
fi

# 监控进程状态
log "所有服务已启动，监控进程状态..."
while true; do
  if ! ps -p \$BACKEND_PID > /dev/null; then
    log "后端服务意外终止，查看日志:"
    cat backend.log
    exit 1
  fi
  
  if ! ps -p \$FRONTEND_PID > /dev/null; then
    log "前端代理服务意外终止，查看日志:"
    cat frontend.log
    exit 1
  fi
  
  sleep 30
done
EOF

# 添加执行权限
chmod +x entrypoint.sh
echo "启动脚本更新完成"

echo "构建完成，可以部署到Sealos了"
echo "注意: 请确保为前端和后端容器设置合适的内存限制" 