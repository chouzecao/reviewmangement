const Review = require('../models/review.model')
const ExcelJS = require('exceljs')

/**
 * 生成月度报表
 */
exports.generateReport = async (req, res) => {
  try {
    const { project, startDate, endDate } = req.body

    // 验证必要参数
    if (!project || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数'
      })
    }

    // 构建查询条件
    const query = {
      project,
      orderDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }

    // 获取评价记录
    const reviews = await Review.find(query).sort({ orderDate: 1 })

    // 按日期分组统计
    const dailyStats = {}
    reviews.forEach(review => {
      const date = review.orderDate.toISOString().split('T')[0]
      if (!dailyStats[date]) {
        dailyStats[date] = {
          date,
          orderCount: 0,
          amount: 0,
          reviewCount: 0,
          reviewTypes: {}
        }
      }
      dailyStats[date].orderCount++
      dailyStats[date].amount += review.amount
      dailyStats[date].reviewCount++
      dailyStats[date].reviewTypes[review.reviewType] = 
        (dailyStats[date].reviewTypes[review.reviewType] || 0) + 1
    })

    // 计算总体统计
    const totalStats = {
      totalOrders: reviews.length,
      totalAmount: reviews.reduce((sum, r) => sum + r.amount, 0),
      averageAmount: reviews.length ? 
        reviews.reduce((sum, r) => sum + r.amount, 0) / reviews.length : 0,
      reviewTypeStats: reviews.reduce((stats, r) => {
        stats[r.reviewType] = (stats[r.reviewType] || 0) + 1
        return stats
      }, {})
    }

    res.json({
      success: true,
      data: {
        ...totalStats,
        details: Object.values(dailyStats)
      }
    })
  } catch (error) {
    console.error('生成报表失败:', error)
    res.status(500).json({
      success: false,
      message: '生成报表失败'
    })
  }
}

exports.exportReport = async (req, res) => {
  try {
    const { project, startDate, endDate } = req.body

    // 验证必要参数
    if (!project || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数'
      })
    }

    // 构建查询条件
    const query = {
      project,
      orderDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }

    // 获取评价记录
    const reviews = await Review.find(query).sort({ orderDate: 1 })

    // 创建工作簿
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('评价记录')

    // 设置列
    worksheet.columns = [
      { header: '序号', key: 'index', width: 8 },
      { header: '项目', key: 'project', width: 15 },
      { header: '预订产品', key: 'product', width: 30 },
      { header: '下单日期', key: 'orderDate', width: 12 },
      { header: '预订人姓名', key: 'customerName', width: 12 },
      { header: '预订人身份证号', key: 'customerId', width: 20 },
      { header: '金额', key: 'amount', width: 10 },
      { header: '出行日期', key: 'travelDate', width: 12 },
      { header: '出评日期', key: 'reviewDate', width: 12 },
      { header: '出评类型', key: 'reviewType', width: 10 },
      { header: '好评内容', key: 'reviewContent', width: 50 },
      { header: '手机号', key: 'phone', width: 15 },
      { header: '票付通订单号', key: 'pfOrderId', width: 15 },
      { header: '美团订单号', key: 'mtOrderId', width: 15 },
      { header: '惠旅云订单号', key: 'hlyOrderId', width: 15 },
      { header: '票付通取消', key: 'pfCancelled', width: 12 },
      { header: '惠旅云取消', key: 'hlyCancelled', width: 12 }
    ]

    // 添加数据
    reviews.forEach((review, index) => {
      worksheet.addRow({
        index: index + 1,
        project: review.project,
        product: review.product,
        orderDate: review.orderDate.toLocaleDateString(),
        customerName: review.customerName,
        customerId: review.customerId,
        amount: review.amount,
        travelDate: new Date(review.travelDate).toLocaleDateString(),
        reviewDate: new Date(review.reviewDate).toLocaleDateString(),
        reviewType: review.reviewType,
        reviewContent: review.reviewContent,
        phone: review.phone,
        pfOrderId: review.pfOrderId,
        mtOrderId: review.mtOrderId,
        hlyOrderId: review.hlyOrderId,
        pfCancelled: review.pfCancelled ? '已取消' : '未取消',
        hlyCancelled: review.hlyCancelled ? '已取消' : '未取消'
      })
    })

    // 设置样式
    worksheet.getRow(1).font = { bold: true }
    worksheet.getColumn('amount').numFmt = '#,##0.00'
    worksheet.getColumn('amount').alignment = { horizontal: 'right' }

    // 发送文件
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${encodeURIComponent(`${project}评价记录_${startDate}_${endDate}.xlsx`)}`
    )

    await workbook.xlsx.write(res)
    res.end()
  } catch (error) {
    console.error('导出报表失败:', error)
    res.status(500).json({
      success: false,
      message: '导出报表失败'
    })
  }
} 