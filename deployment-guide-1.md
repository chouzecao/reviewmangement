# 评价管理系统部署指南 - 前后端分离模式

本文档提供在 Sealos 平台上进行前后端分离部署的详细步骤。

## 准备工作

1. 确保已经执行了构建脚本：
   ```bash
   ./build-for-sealos.sh
   ```

2. 确认构建成功，没有错误信息

## 部署步骤

### 1. 部署后端服务

在 Sealos 平台上创建第一个应用：

1. **基本配置**
   - 应用名称：`commentge-backend`
   - 镜像：与之前使用的相同镜像
   - 实例数：1

2. **环境变量配置**
   ```
   RUN_BACKEND=true
   NODE_ENV=production
   PORT=3000
   MONGODB_URI=mongodb://root:8gx89ljj@comdb-mongodb.ns-dc2goees.svc:27017/review_management?authSource=admin&retryWrites=true&w=majority
   JWT_SECRET=finnertrip-review-management-secret
   SESSION_SECRET=finnertrip-session-secret
   UPLOAD_DIR=uploads
   MAX_FILE_SIZE=5242880
   NODE_MEMORY=512
   ```

3. **存储卷配置**
   - 添加持久卷
   - 挂载路径：`/home/devbox/project/server/uploads`
   - 卷大小：根据需要设置，建议最少 1GB

4. **网络配置**
   - 暴露端口：3000
   - 服务类型：根据需要选择（ClusterIP或LoadBalancer）

5. **资源配置**
   - CPU：最少 0.5 核
   - 内存：最少 512 MB

### 2. 部署前端服务

在 Sealos 平台上创建第二个应用：

1. **基本配置**
   - 应用名称：`commentge-frontend`
   - 镜像：与之前使用的相同镜像
   - 实例数：1

2. **环境变量配置**
   ```
   RUN_BACKEND=false
   NODE_ENV=production
   FRONTEND_PORT=8080
   API_URL=http://commentge-backend:3000
   ```

3. **网络配置**
   - 暴露端口：8080
   - 服务类型：LoadBalancer（需要对外暴露）

4. **资源配置**
   - CPU：最少 0.2 核
   - 内存：最少 256 MB

## 验证部署

1. **验证后端服务**
   - 检查后端服务日志，确认服务已启动
   - 验证日志中显示"数据库连接正常"

2. **验证前端服务**
   - 访问前端服务URL（通过Sealos平台获取）
   - 尝试登录系统
   - 验证是否可以正常查询评价数据
   - 验证是否可以生成和导出报表

## 常见问题排查

1. **前端无法连接到后端**
   - 检查`API_URL`是否正确设置
   - 确认后端服务是否正常运行
   - 检查日志中是否有连接错误

2. **图片上传/显示问题**
   - 确认后端持久卷挂载正确
   - 验证上传目录权限（应为777）

3. **内存不足问题**
   - 增加资源限制，特别是对于前端服务

## 维护指南

1. **查看日志**
   - 通过 Sealos 平台查看容器日志

2. **更新应用**
   - 构建新版本后，重新部署对应服务

3. **数据备份**
   - 定期备份 MongoDB 数据库
   - 备份上传的图片文件 