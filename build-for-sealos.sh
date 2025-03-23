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

# 设置环境变量
export NODE_ENV=production
export PORT=${PORT:-3000}
# 设置TMPDIR环境变量解决文件系统跨设备链接问题
export TMPDIR=/tmp
# 设置内存限制以优化性能
export NODE_OPTIONS="--max-old-space-size=${NODE_MEMORY:-512}"

# 创建上传目录
mkdir -p /home/devbox/project/server/uploads
chmod -R 777 /home/devbox/project/server/uploads

# 打印运行环境信息
echo "======= 应用启动 ======="
echo "运行模式: ${NODE_ENV}"
echo "内存限制: ${NODE_OPTIONS}"
echo "端口: ${PORT}"
echo "======================="

# 只运行前端或后端，以减少内存占用
if [ "${RUN_BACKEND:-true}" = "true" ]; then
  # 启动后端服务
  cd /home/devbox/project/server
  
  # 启动前检查数据库连接
  echo "检查数据库连接..."
  node -e "
  const mongoose = require('mongoose');
  const uri = process.env.MONGODB_URI || require('./src/config/config').db.uri;
  mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
    .then(() => console.log('数据库连接正常'))
    .catch((err) => {
      console.error('数据库连接失败:', err);
      process.exit(1);
    });
  "
  
  echo "启动后端服务..."
  node src/app.js
else
  # 启动前端服务
  cd /home/devbox/project/client
  echo "启动前端服务..."
  
  # 设置低内存消耗模式
  export SERVE_OPTIONS="--symlinks --no-clipboard --single"
  
  # 使用serve的代理功能指向后端API
  npx serve -s dist -l ${FRONTEND_PORT:-8080} --cors --config ./serve.json ${SERVE_OPTIONS}
fi

# 保持容器运行
wait
EOF

# 给 entrypoint.sh 添加执行权限
chmod +x entrypoint.sh

echo "===== 构建完成 ====="
echo "现在可以在 Sealos 上部署应用了。请确保设置适当的内存限制:"
echo "- 前端容器至少 256MB 内存"
echo "- 后端容器至少 512MB 内存" 