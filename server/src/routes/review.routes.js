const express = require('express');
const router = express.Router();
const Excel = require('exceljs');
const auth = require('../middleware/auth.middleware');
const Review = require('../models/review.model');
const reviewController = require('../controllers/review.controller');
const upload = require('../middleware/upload');

// 更新所有记录的项目字段（不需要身份验证）
router.post('/update-projects', reviewController.updateAllProjects);

// 所有其他路由都需要验证登录
router.use(auth);

// 生成评价记录
router.post('/generate', reviewController.generateReviews);

// 批量导入评价记录
router.post('/import', reviewController.importReviews);

// 批量删除评价记录
router.delete('/batch', reviewController.batchDeleteReviews);

// 获取评价记录列表
router.get('/', reviewController.getReviews);

// 获取单个评价记录
router.get('/:id', reviewController.getReview);

// 创建评价记录
router.post('/', upload.single('screenshot'), reviewController.createReview);

// 更新评价记录
router.put('/:id', upload.single('screenshot'), reviewController.updateReview);

// 删除评价记录
router.delete('/:id', reviewController.deleteReview);

// 上传评价截图
router.post('/:id/screenshots', upload.single('screenshot'), reviewController.uploadScreenshot);

// 获取评价的所有截图
router.get('/:id/screenshots', reviewController.getScreenshots);

// 删除评价截图
router.delete('/:id/screenshots/:screenshotId', reviewController.deleteScreenshot);

// 批量导出评价记录
router.post('/export', async (req, res) => {
    try {
        const { ids } = req.body;
        const reviews = await Review.find({ _id: { $in: ids } });
        
        // 创建工作簿和工作表
        const workbook = new Excel.Workbook();
        const worksheet = workbook.addWorksheet('评价记录');
        
        // 设置列
        worksheet.columns = [
            { header: '序号', key: 'index', width: 10 },
            { header: '下单日期', key: 'orderDate', width: 15 },
            { header: '预订人姓名', key: 'customerName', width: 15 },
            { header: '预订人身份证号', key: 'customerId', width: 25 },
            { header: '项目', key: 'project', width: 20 },
            { header: '预订产品', key: 'product', width: 30 },
            { header: '金额', key: 'amount', width: 10 },
            { header: '出行日期', key: 'travelDate', width: 15 },
            { header: '出评日期', key: 'reviewDate', width: 15 },
            { header: '出评类型', key: 'reviewType', width: 15 },
            { header: '好评内容', key: 'reviewContent', width: 50 },
            { header: '手机号', key: 'phone', width: 15 },
            { header: '票付通订单号', key: 'pfOrderId', width: 20 },
            { header: '美团订单号', key: 'mtOrderId', width: 20 },
            { header: '惠旅云订单号', key: 'hlyOrderId', width: 20 },
            { header: '票付通取消', key: 'pfCancelled', width: 15 },
            { header: '惠旅云取消', key: 'hlyCancelled', width: 15 }
        ];
        
        // 设置表头样式
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
        
        // 添加数据
        reviews.forEach((review, index) => {
            worksheet.addRow({
                index: index + 1,
                orderDate: review.orderDate ? review.orderDate.toLocaleDateString() : '',
                customerName: review.customerName,
                customerId: review.customerId,
                project: review.project,
                product: review.product,
                amount: review.amount,
                travelDate: review.travelDate ? review.travelDate.toLocaleDateString() : '',
                reviewDate: review.reviewDate ? review.reviewDate.toLocaleDateString() : '',
                reviewType: review.reviewType,
                reviewContent: review.reviewContent,
                phone: review.phone,
                pfOrderId: review.pfOrderId || '',
                mtOrderId: review.mtOrderId || '',
                hlyOrderId: review.hlyOrderId || '',
                pfCancelled: review.pfCancelled ? '已取消' : '待取消',
                hlyCancelled: review.hlyCancelled ? '已取消' : '待取消'
            });
        });
        
        // 设置每个单元格的边框和样式
        worksheet.eachRow((row, rowNumber) => {
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                if (rowNumber > 1) {
                    cell.alignment = { vertical: 'middle', wrapText: true };
                    // 金额列右对齐
                    if (cell.col === 7) {
                        cell.alignment.horizontal = 'right';
                        cell.numFmt = '0.00';
                    }
                }
            });
        });
        
        // 生成文件名
        const fileName = `评价记录_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        // 设置响应头
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(fileName)}`);
        
        // 写入响应流
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('导出Excel错误:', error);
        res.status(500).json({ 
            success: false,
            message: '导出失败',
            error: error.message 
        });
    }
});

module.exports = router; 