const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');

// 创建按日期分类的上传目录
const createUploadDir = (req, file, cb) => {
    // 生成今日日期格式的文件夹名 YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];
    const uploadDir = path.join('uploads', today);
    
    // 确保目录存在
    fs.ensureDirSync(uploadDir);
    
    return cb(null, uploadDir);
};

// 配置文件上传
const storage = multer.diskStorage({
    destination: createUploadDir,
    filename: (req, file, cb) => {
        // 获取文件扩展名
        const ext = path.extname(file.originalname).toLowerCase();
        // 使用 reviewId（如果提供）和时间戳创建唯一文件名
        const reviewId = req.params.id || 'new';
        const timestamp = Date.now();
        const filename = `${reviewId}_${timestamp}_original${ext}`;
        
        cb(null, filename);
    }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
    // 允许的文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('不支持的文件类型，仅支持jpg、jpeg和png格式'));
    }
};

// 创建上传中间件
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 限制文件大小为5MB
    }
});

module.exports = upload; 