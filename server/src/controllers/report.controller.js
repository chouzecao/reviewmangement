const Review = require('../models/review.model')
const ExcelJS = require('exceljs')

/**
 * 生成月度报表
 */
exports.generateReport = async (req, res) => {
  try {
    // 先检查数据库中是否有任何记录
    const totalRecordsCount = await Review.countDocuments({});
    console.log(`数据库中总共有 ${totalRecordsCount} 条记录`);
    
    // 列出所有可用的项目
    const availableProjects = await Review.distinct('project');
    console.log('数据库中所有可用的项目:', availableProjects);
    
    // 记录数据库中的日期范围
    const dateRange = await Review.aggregate([
      {
        $group: {
          _id: null,
          minDate: { $min: "$orderDate" },
          maxDate: { $max: "$orderDate" }
        }
      }
    ]);
    
    if (dateRange.length > 0) {
      console.log('数据库中的日期范围:', {
        最早日期: dateRange[0].minDate,
        最晚日期: dateRange[0].maxDate
      });
    }
    
    const { project, startDate, endDate } = req.body
    
    // 记录认证信息
    console.log('Auth header:', req.headers.authorization)
    console.log('Cookie:', req.headers.cookie)
    console.log('User info:', req.user || 'No user info')
    
    // 详细记录请求参数
    console.log('请求参数:', {
      body: req.body,
      query: req.query,
      projectType: typeof project,
      startDateType: typeof startDate,
      endDateType: typeof endDate,
      headers: {
        'content-type': req.headers['content-type'],
        host: req.headers.host,
        origin: req.headers.origin,
        referer: req.headers.referer
      }
    })

    // 验证必要参数
    if (!project || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数'
      })
    }

    console.log('生成报表参数:', { project, startDate, endDate })

    // 构建查询条件
    const query = {
      project: { $regex: new RegExp(project.replace(/[·•]/g, '.?'), 'i') },
      orderDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }

    console.log('执行查询:', JSON.stringify(query))

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
    console.log('开始导出报表:', req.body);
    const { project, startDate, endDate } = req.body

    // 验证必要参数
    if (!project || !startDate || !endDate) {
      console.warn('导出参数不完整:', req.body);
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

    console.log('执行导出查询:', query);
    
    // 统计总记录数，避免过大的查询
    const totalCount = await Review.countDocuments(query);
    console.log(`找到 ${totalCount} 条记录将被导出`);
    
    // 避免内存溢出，使用流式处理
    const MAX_RECORDS = 5000;
    if (totalCount > MAX_RECORDS) {
      console.warn(`警告: 导出记录数 (${totalCount}) 超过推荐限制 (${MAX_RECORDS})`);
    }

    // 获取评价记录
    const reviews = await Review.find(query).sort({ orderDate: 1 }).limit(MAX_RECORDS);
    console.log(`实际导出 ${reviews.length} 条记录`);

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

    console.log('开始写入Excel文件到响应流');
    await workbook.xlsx.write(res)
    res.end()
    console.log('Excel文件导出完成');
  } catch (error) {
    console.error('导出报表失败:', error.stack || error);
    res.status(500).json({
      success: false,
      message: '导出报表失败',
      error: error.message
    })
  }
}

/**
 * 获取完整的PDF报表数据
 */
exports.getFullReportData = async (req, res) => {
  try {
    console.log('开始请求完整报表数据:', req.body);
    const { project, startDate, endDate, limit = 1000 } = req.body
    
    // 验证必要参数
    if (!project || !startDate || !endDate) {
      console.warn('请求参数不完整:', req.body);
      return res.status(400).json({
        success: false,
        message: '缺少必要参数'
      })
    }
    
    // 构建查询条件
    const query = {
      project: { $regex: new RegExp(project.replace(/[·•]/g, '.?'), 'i') },
      orderDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }
    
    console.log('执行报表查询:', query);
    
    // 统计总记录数，用于分页
    const totalCount = await Review.countDocuments(query);
    console.log(`找到 ${totalCount} 条记录，开始处理...`);
    
    // 如果数据量很大，限制返回记录数量以避免内存问题
    const reviews = await Review.find(query)
      .sort({ orderDate: 1 })
      .limit(parseInt(limit, 10));
    
    // 计算统计数据
    const totalAmount = reviews.reduce((sum, r) => sum + (r.amount || 0), 0)
    const averageAmount = reviews.length ? totalAmount / reviews.length : 0
    
    // 计算评价类型分布
    const reviewTypeStats = reviews.reduce((stats, r) => {
      if (r.reviewType) {
        stats[r.reviewType] = (stats[r.reviewType] || 0) + 1
      }
      return stats
    }, {})
    
    // 计算评价类型百分比
    const reviewTypePercentage = {}
    Object.keys(reviewTypeStats).forEach(type => {
      reviewTypePercentage[type] = ((reviewTypeStats[type] / reviews.length) * 100).toFixed(1)
    })
    
    // 如果总记录数超过了限制值，添加警告信息
    const hasMoreData = totalCount > limit;
    
    console.log(`报表数据处理完成, 返回 ${reviews.length} 条记录`);
    
    res.json({
      success: true,
      data: {
        reviews,
        summary: {
          totalOrders: reviews.length,
          totalAmount,
          averageAmount,
          reviewTypeStats,
          reviewTypePercentage,
          totalAvailableRecords: totalCount,
          hasMoreData
        }
      }
    })
  } catch (error) {
    console.error('获取PDF报表数据失败:', error.stack || error);
    res.status(500).json({
      success: false,
      message: '获取PDF报表数据失败',
      error: error.message
    })
  }
} 