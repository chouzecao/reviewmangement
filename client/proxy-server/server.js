const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const fs = require('fs');

// 配置
const PORT = process.env.FRONTEND_PORT || 8080;
const API_URL = process.env.API_URL || 'http://commentge-finalrelease.ns-dc2goees.svc.cluster.local:3000';
const STATIC_DIR = path.resolve(__dirname, '../dist');

// 打印配置信息
console.log(`[${new Date().toISOString()}] 代理服务器配置:`);
console.log(`[${new Date().toISOString()}] - 端口: ${PORT}`);
console.log(`[${new Date().toISOString()}] - API URL: ${API_URL}`);
console.log(`[${new Date().toISOString()}] - 静态目录: ${STATIC_DIR}`);

// 创建Express应用
const app = express();

// 请求日志中间件
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} 开始处理`);
  
  // 记录请求头信息
  console.log(`[${new Date().toISOString()}] 请求头:`, JSON.stringify({
    host: req.headers.host,
    origin: req.headers.origin,
    referer: req.headers.referer,
    'user-agent': req.headers['user-agent']
  }));
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

// API代理配置
const apiProxy = createProxyMiddleware({
  target: API_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api' 
  },
  // 详细日志记录
  logLevel: 'debug',
  onProxyReq: (proxyReq, req, res) => {
    // 记录代理请求信息
    console.log(`[${new Date().toISOString()}] 代理请求: ${req.method} ${req.url} -> ${proxyReq.path}`);
    
    // 维持原始请求头
    if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
      console.log(`[${new Date().toISOString()}] 检测到文件上传请求`);
    }
    
    // 确保Authorization头被正确传递
    if (req.headers.authorization) {
      console.log(`[${new Date().toISOString()}] 带有Authorization请求: ${req.url.substring(0, 100)}`);
    }
  },
  // 增加超时设置，文件上传可能需要更长时间
  proxyTimeout: 300000, // 5分钟
  timeout: 300000
});

// 为API请求添加代理
app.use('/api', apiProxy);

// 添加CORS头
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 静态文件服务
app.use(express.static(STATIC_DIR, {
  index: false // 不自动返回index.html
}));

// 对于所有其他请求，返回index.html（SPA路由）
app.get('*', (req, res) => {
  res.sendFile(path.join(STATIC_DIR, 'index.html'));
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[${new Date().toISOString()}] 代理服务器运行在 http://0.0.0.0:${PORT}`);
  console.log(`[${new Date().toISOString()}] API请求将代理到 ${API_URL}`);
  console.log(`[${new Date().toISOString()}] 静态文件目录: ${STATIC_DIR}`);
}); 