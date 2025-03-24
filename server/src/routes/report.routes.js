const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticate } = require('../middlewares/auth');
const Review = require('../models/review.model');
const MonthlyScore = require('../models/monthlyScore.model');

// 应用认证中间件
router.use(authenticate);

// 生成月度报表
router.post('/generate', reportController.generateReport);

// 导出报表数据
router.post('/export', reportController.exportReport);

// 获取完整的PDF报表数据
router.post('/full-data', reportController.getFullReportData);

// 获取月度报表列表
router.get('/monthly', async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        
        const reports = await MonthlyScore.find()
            .sort({ month: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));
            
        const total = await MonthlyScore.countDocuments();
        
        res.json({
            reports,
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ message: '服务器错误' });
    }
});

module.exports = router; 