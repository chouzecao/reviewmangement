const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const path = require('path');
const config = require('./config/config');
const connectDB = require('./config/db');

// 连接数据库
connectDB();

const app = express();

// CORS中间件配置，明确允许所有跨域请求
app.use(cors({
    origin: true, // 允许请求的来源 - 生产环境中可以设置为具体域名
    credentials: true, // 重要：允许携带凭证
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Disposition'], // 允许客户端访问的响应头
    // 增加预检请求缓存时间，减少OPTIONS请求
    maxAge: 86400 // 24小时
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 配置会话，使用MongoDB作为存储
const sessionConfig = {
    ...config.session,
    store: MongoStore.create({
        mongoUrl: config.db.uri,
        ttl: 60 * 60 * 24, // 会话保存1天
        autoRemove: 'native', // 使用MongoDB的TTL索引自动移除过期会话
        touchAfter: 24 * 3600 // 每24小时更新会话，无论活动多少次
    })
};

app.use(session(sessionConfig));

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 路由
const authRoutes = require('./routes/auth.routes');
const reviewRoutes = require('./routes/review.routes');
const reportRoutes = require('./routes/report.routes');

app.use('/api/auth', authRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/reports', reportRoutes);

// 添加健康检查路由
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', time: new Date().toISOString() });
});

// 保留旧的健康检查路由以兼容现有调用
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', time: new Date().toISOString() });
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: '服务器内部错误' });
});

const PORT = config.server.port;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`服务器运行在端口 ${PORT}`);
});

module.exports = app; 