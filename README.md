# 评价管理系统

## 项目介绍

评价管理系统是一个用于收集、管理和分析客户评价的全栈应用。系统支持评价的录入、筛选、统计分析和多种格式的报表导出功能，包括HTML、PDF、Markdown和Excel格式。

## 技术栈

### 前端
- Vue.js 3
- Vite
- Element Plus
- Axios
- jsPDF (PDF生成)
- js-xlsx (Excel处理)
- ECharts (数据可视化)

### 后端
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT认证
- Multer (文件上传)

## 主要功能

1. **用户管理**
   - 登录/注册
   - 用户角色管理（管理员、普通用户）

2. **评价管理**
   - 评价录入（支持多个截图上传）
   - 评价列表查看和筛选
   - 评价详情查看和编辑

3. **数据统计与分析**
   - 评价类型分布统计
   - 评价金额统计
   - 时间段数据对比

4. **报表生成与导出**
   - HTML报表（支持打印）
   - PDF报表（支持自定义配置）
   - Markdown报表（支持图片链接）
   - Excel报表（支持数据筛选）

## 安装与运行

### 开发环境

1. **克隆仓库**
   ```bash
   git clone <repository-url>
   cd project
   ```

2. **安装后端依赖**
   ```bash
   cd server
   npm install
   ```

3. **安装前端依赖**
   ```bash
   cd ../client
   npm install
   ```

4. **环境配置**
   
   创建`.env`文件：
   
   后端(.env)：
   ```
   PORT=3000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/review_management
   JWT_SECRET=your-jwt-secret
   JWT_EXPIRES_IN=24h
   SESSION_SECRET=your-session-secret
   UPLOAD_DIR=uploads
   MAX_FILE_SIZE=5242880
   ```
   
   前端(.env.local)：
   ```
   VITE_API_URL=http://localhost:3000/api
   ```

5. **运行开发服务器**
   
   后端：
   ```bash
   cd server
   npm run dev
   ```
   
   前端：
   ```bash
   cd client
   npm run dev
   ```

### 生产环境

使用提供的构建脚本：
```bash
chmod +x build-for-sealos.sh
./build-for-sealos.sh
```

生产环境部署参考[发布检查清单](release-checklist.md)。

## 使用指南

### 1. 登录系统
访问系统首页，输入用户名和密码登录。首次使用可通过注册页面创建账户。

### 2. 评价管理
- **添加评价**：点击"添加评价"按钮，填写评价信息，上传截图。
- **查看评价**：在评价列表中可以查看所有评价，支持按时间、类型等筛选。
- **编辑评价**：点击评价项的"编辑"按钮进行修改。

### 3. 报表生成
- **生成报表**：在"报表"页面，选择时间范围和筛选条件。
- **导出格式**：选择需要的导出格式（HTML/PDF/Markdown/Excel）。
- **自定义配置**：根据需要调整报表配置。

## 问题排查

### 常见问题

1. **图片无法加载**
   - 检查上传目录权限
   - 验证图片URL格式

2. **报表导出失败**
   - 检查数据量是否过大
   - 查看浏览器控制台错误信息

3. **中文显示乱码**
   - 确保使用了正确的字体配置
   - 检查编码设置

### 日志查看
- 前端错误日志可在浏览器控制台查看
- 后端日志存储在`server/logs`目录

## 系统配置优化

### 大数据量处理
对于大数据量场景，建议：
- 启用数据分页加载
- 增加服务器内存配置
- 使用流式处理导出大型报表

### 性能优化
- 前端构建时增加内存限制：`NODE_OPTIONS="--max-old-space-size=4096"`
- 后端服务运行时增加内存限制：`NODE_OPTIONS="--max-old-space-size=512"`

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request

## 许可证

[MIT](LICENSE) 