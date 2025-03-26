# 评价管理系统部署指南 - 单应用模式

本文档提供在 Sealos 平台上进行部署的详细步骤。

## 准备工作

1. 确保已经执行了构建脚本：
   ```bash
   ./build-for-sealos.sh
   ```

2. 确认构建成功，没有错误信息

## 部署步骤

### 部署应用

在 Sealos 平台上创建应用：

1. **基本配置**
   - 应用名称：`commentge`
   - 镜像：与之前使用的相同镜像
   - 实例数：1

2. **环境变量配置**
   ```
   NODE_ENV=production
   PORT=3000
   HOST=0.0.0.0
   FRONTEND_PORT=8080
   MONGODB_URI=mongodb://root:8gx89ljj@comdb-mongodb.ns-dc2goees.svc:27017/reviewdb?authSource=admin
   JWT_SECRET=finnertrip-review-management-secret
   SESSION_SECRET=finnertrip-session-secret
   UPLOAD_DIR=uploads
   MAX_FILE_SIZE=5242880
   ```

3. **存储卷配置**
   - 添加持久卷
   - 挂载路径：`/home/devbox/project/server/uploads`
   - 卷大小：根据需要设置，建议最少 1GB

4. **网络配置**
   - 暴露端口：8080（前端）和3000（后端API）
   - 服务类型：LoadBalancer（需要对外暴露）

5. **资源配置**
   - CPU：最少 1 核
   - 内存：最少 768 MB（同时运行前端和后端）

## 验证部署

1. **验证应用启动**
   - 检查服务日志，确认前端和后端服务都已启动
   - 验证日志中显示"数据库连接正常"
   - 验证日志中显示"API健康检查通过"

2. **验证功能**
   - 访问前端服务URL（通过Sealos平台获取，通常是8080端口）
   - 尝试登录系统
   - 验证是否可以正常查询评价数据
   - 验证是否可以生成和导出报表

## 常见问题排查

1. **服务启动失败**
   - 检查容器日志，查找错误信息
   - 确认环境变量是否正确设置
   - 验证数据库连接是否正常

2. **图片上传/显示问题**
   - 确认持久卷挂载正确
   - 验证上传目录权限（应为777）

3. **内存不足问题**
   - 检查日志中是否有OOM错误
   - 增加容器内存限制

## 维护指南

1. **查看日志**
   - 通过 Sealos 平台查看容器日志

2. **更新应用**
   - 构建新版本后，重新部署应用

3. **数据备份**
   - 定期备份 MongoDB 数据库
   - 备份上传的图片文件 