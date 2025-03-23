#!/bin/bash

# 设置环境变量
export NODE_ENV=production
export PORT=${PORT:-3000}
# 设置TMPDIR环境变量解决文件系统跨设备链接问题
export TMPDIR=/tmp

# 创建上传目录
mkdir -p /home/devbox/project/server/uploads
chmod -R 777 /home/devbox/project/server/uploads

# 只运行前端或后端，以减少内存占用
if [ "${RUN_BACKEND:-true}" = "true" ]; then
  # 启动后端服务
  cd /home/devbox/project/server
  # 添加内存限制
  NODE_OPTIONS="--max-old-space-size=256" node src/app.js
else
  # 启动前端服务
  cd /home/devbox/project/client
  # 使用serve的代理功能指向后端API，修正配置文件路径
  npx serve -s dist -l ${FRONTEND_PORT:-8080} --cors --config ./serve.json --no-clipboard
fi

# 保持容器运行
wait