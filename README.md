# 评价管理系统

评价管理系统是一个帮助管理和生成评价记录的平台，支持多项目管理、生成报表和导出数据。

## 功能

- 用户登录认证
- 评价记录生成和管理
- 项目筛选和查询
- 数据统计和报表生成
- 图片上传
- 数据导出

## 技术栈

- 前端：Vue 3, Element Plus, ECharts
- 后端：Node.js, Express, MongoDB
- 认证：JWT

## 部署指南

### Sealos 部署

#### 准备工作

在部署前，先运行构建脚本准备部署文件：

```bash
# 运行构建脚本
./build-for-sealos.sh
```

这个脚本会帮你解决可能出现的跨设备链接问题，并完成前端构建。

#### 方案一：单实例部署（可能内存不足）

1. 配置环境变量
在 Sealos 环境变量中设置:
- `MONGODB_URI`: MongoDB连接字符串
- `JWT_SECRET`: JWT密钥
- `SESSION_SECRET`: Session密钥
- `PORT`: 后端服务端口（默认3000）
- `FRONTEND_PORT`: 前端服务端口（默认8080）
- `TMPDIR`: 临时目录（设置为 `/tmp`）

2. 配置持久卷
为上传文件创建一个持久化卷，并挂载到 `/home/devbox/project/server/uploads`

#### 方案二：分离部署（推荐）

分别部署前端和后端两个应用：

1. 后端部署：
   - 设置环境变量 `RUN_BACKEND=true`
   - 配置持久卷挂载到 `/home/devbox/project/server/uploads`
   - 设置端口为 3000
   - 设置环境变量 `TMPDIR=/tmp`

2. 前端部署：
   - 设置环境变量 `RUN_BACKEND=false`
   - 设置后端API地址：`API_URL=http://<后端服务地址>:3000`
   - 设置端口为 8080
   - 设置环境变量 `TMPDIR=/tmp`

### 解决常见问题

#### 内存不足 (错误码137)
如果遇到内存不足，可以：
1. 增加实例的内存限制
2. 使用分离部署方案，降低单个实例的内存占用
3. 调整 `NODE_OPTIONS` 环境变量限制Node.js内存使用

#### 跨设备链接错误 (EXDEV)
如果遇到 `EXDEV: cross-device link not permitted` 错误，请确保：
1. 使用了提供的构建脚本 `build-for-sealos.sh`
2. 设置了环境变量 `TMPDIR=/tmp`

### 本地开发

1. 安装依赖
```bash
# 安装后端依赖
cd server
npm install

# 安装前端依赖
cd ../client
npm install
```

2. 启动服务
```bash
# 启动后端
cd server
npm run dev

# 启动前端
cd ../client
npm run dev
``` 