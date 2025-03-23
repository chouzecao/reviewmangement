require('dotenv').config()

module.exports = {
    // 数据库配置
    db: {
        uri: process.env.MONGODB_URI
    },
    // 服务器配置
    server: {
        port: process.env.PORT || 3000
    },
    // Session配置
    session: {
        secret: process.env.SESSION_SECRET || 'comment-generator-secret',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 24小时
        }
    },
    // JWT配置
    jwt: {
        secret: process.env.JWT_SECRET || 'your-secret-key',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    },
    // 文件上传配置
    upload: {
        dir: process.env.UPLOAD_DIR || 'uploads',
        allowedTypes: ['image/jpeg', 'image/jpg', 'image/png'],
        maxSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB
    }
}; 