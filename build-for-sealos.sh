#!/bin/bash

# 设置环境变量避免跨设备链接问题
export TMPDIR=/tmp

echo "===== 准备后端环境 ====="
cd /home/devbox/project/server

# 确保后端依赖已安装
npm install

echo "===== 后端环境准备完成 ====="

echo "===== 开始构建前端应用 ====="
cd /home/devbox/project/client

# 创建.env.production文件
echo "VITE_API_URL=/api" > .env.production

# 清理旧的构建文件
rm -rf dist
rm -rf node_modules/.vite

# 构建前端
NODE_ENV=production npm run build

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

# 回到项目根目录
cd /home/devbox/project

# 给 entrypoint.sh 添加执行权限
chmod +x entrypoint.sh

echo "===== 构建完成 ====="
echo "现在可以在 Sealos 上部署应用了" 