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
  
  # 更新serve.json配置
  echo "更新API代理配置..."
  BACKEND_API=${API_URL:-http://localhost:3000}
  echo "API指向: ${BACKEND_API}"
  
  # 创建serve.json文件
  cat > dist/serve.json << EOF
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
EOF
  
  # 验证配置文件
  echo "serve.json 配置文件内容:"
  cat dist/serve.json
  
  echo "启动前端服务，监听端口: ${FRONTEND_PORT:-8080}"
  # 使用serve的代理功能指向后端API
  npx serve -s dist -l ${FRONTEND_PORT:-8080} --cors --config ./dist/serve.json ${SERVE_OPTIONS}
fi

# 保持容器运行
wait
