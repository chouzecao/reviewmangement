const mongoose = require('mongoose');

// 添加截图对象子模式
const screenshotSchema = new mongoose.Schema({
    originalPath: String,       // 原图路径
    thumbnail80Path: String,    // 80% 缩略图路径
    thumbnail50Path: String,    // 50% 缩略图路径
    uploadTime: {
        type: Date,
        default: Date.now
    },
    fileSize: Number,           // 文件大小 (bytes)
    fileType: String,           // 文件类型 (MIME)
    isDeleted: {
        type: Boolean,
        default: false
    }
});

const reviewSchema = new mongoose.Schema({
    project: {
        type: String,
        required: true,
        enum: ['无界·长安', '兵马俑日游', '兵马俑讲解'],
        default: '无界·长安'
    },
    orderDate: {
        type: Date,
        required: true
    },
    customerName: {
        type: String,
        required: true
    },
    customerId: {
        type: String,
        required: true
    },
    product: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    travelDate: {
        type: Date,
        required: true
    },
    reviewDate: {
        type: Date,
        required: true
    },
    reviewType: {
        type: String,
        required: true,
        enum: ['5分', '分+字', '分+字图']
    },
    reviewContent: String,
    phone: String,
    pfOrderId: String,
    mtOrderId: String,
    hlyOrderId: String,
    pfCancelled: {
        type: Boolean,
        default: false
    },
    hlyCancelled: {
        type: Boolean,
        default: false
    },
    // 兼容旧数据的单张截图字段
    screenshot: String,
    // 新增多张截图支持
    screenshots: [screenshotSchema]
}, {
    timestamps: true
});

// 创建索引
reviewSchema.index({ orderDate: 1 });
reviewSchema.index({ customerName: 1 });
reviewSchema.index({ customerId: 1 });
reviewSchema.index({ project: 1 });
reviewSchema.index({ travelDate: 1 });
reviewSchema.index({ reviewDate: 1 });
reviewSchema.index({ pfOrderId: 1 });
reviewSchema.index({ mtOrderId: 1 });
reviewSchema.index({ hlyOrderId: 1 });

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review; 