const { generateUsers } = require('../utils/generator')
const Review = require('../models/review.model')
const { processUploadedImage, deleteImages } = require('../utils/imageUtils')
const fs = require('fs-extra')
const path = require('path')

// 生成评价记录
exports.generateReviews = async (req, res) => {
  try {
    const { project, province, count } = req.body

    // 验证参数
    if (!project || !count || count < 1 || count > 100) {
      return res.status(400).json({
        success: false,
        message: '参数错误'
      })
    }

    // 生成用户数据
    const provinceCode = province === 'random' ? null : province
    const users = generateUsers(count, provinceCode)

    // 构建评价记录
    const reviewDocs = users.map(user => ({
      orderDate: new Date(),
      customerName: user.name,
      customerId: user.idCard,
      project: project,
      product: `${project}-成人票-19:30-30C区`,
      amount: 99.00,
      travelDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      reviewDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
      reviewType: '5分',
      reviewContent: '带孩子来西安旅游，看了这个演出，太震撼了，孩子很喜欢，值得推荐！',
      phone: user.phone,
      pfOrderId: Math.floor(Math.random() * 90000000) + 10000000,
      mtOrderId: '',
      hlyOrderId: '',
      pfCancelled: false,
      hlyCancelled: false,
      screenshot: null
    }))

    // 批量创建评价记录
    const savedReviews = await Review.insertMany(reviewDocs)

    return res.json({
      success: true,
      message: '生成成功',
      data: savedReviews
    })
  } catch (error) {
    console.error('生成评价记录失败:', error)
    return res.status(500).json({
      success: false,
      message: '生成评价记录失败'
    })
  }
}

// 批量导入评价记录
exports.importReviews = async (req, res) => {
  try {
    const { reviews } = req.body

    // 验证参数
    if (!Array.isArray(reviews) || reviews.length === 0) {
      return res.status(400).json({
        success: false,
        message: '参数错误'
      })
    }

    // 构建评价记录
    const reviewDocs = reviews.map(review => ({
      orderDate: review.orderDate || new Date(),
      customerName: review.customerName,
      customerId: review.customerId,
      project: review.project,
      amount: review.amount || 0,
      travelDate: review.travelDate || null,
      reviewDate: review.reviewDate || null,
      reviewType: review.reviewType || '5分',
      reviewContent: review.reviewContent || null,
      phone: review.phone || null,
      pfOrderId: review.pfOrderId || null,
      mtOrderId: review.mtOrderId || null,
      hlyOrderId: review.hlyOrderId || null,
      pfCancelled: review.pfCancelled || false,
      hlyCancelled: review.hlyCancelled || false,
      screenshot: review.screenshot || null
    }))

    // 批量创建评价记录
    await Review.insertMany(reviewDocs)

    return res.json({
      success: true,
      message: '导入成功'
    })
  } catch (error) {
    console.error('导入评价记录失败:', error)
    return res.status(500).json({
      success: false,
      message: '导入评价记录失败'
    })
  }
}

// 获取评价记录列表
exports.getReviews = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit

    // 构建查询条件
    const query = {}
    
    if (req.query.project) {
      query.project = req.query.project
    }
    
    if (req.query.customerName) {
      query.customerName = new RegExp(req.query.customerName, 'i')
    }
    
    if (req.query.customerId) {
      query.customerId = new RegExp(req.query.customerId, 'i')
    }

    if (req.query.orderDate) {
      query.orderDate = {
        $gte: new Date(req.query.orderDate + 'T00:00:00.000Z'),
        $lt: new Date(req.query.orderDate + 'T23:59:59.999Z')
      }
    }

    if (req.query.travelDate) {
      query.travelDate = {
        $gte: new Date(req.query.travelDate + 'T00:00:00.000Z'),
        $lt: new Date(req.query.travelDate + 'T23:59:59.999Z')
      }
    }

    if (req.query.reviewDate) {
      query.reviewDate = {
        $gte: new Date(req.query.reviewDate + 'T00:00:00.000Z'),
        $lt: new Date(req.query.reviewDate + 'T23:59:59.999Z')
      }
    }

    if (req.query.reviewType) {
      query.reviewType = req.query.reviewType
    }

    if (req.query.phone) {
      query.phone = new RegExp(req.query.phone, 'i')
    }

    if (req.query.pfOrderId) {
      query.pfOrderId = new RegExp(req.query.pfOrderId, 'i')
    }

    if (req.query.mtOrderId) {
      query.mtOrderId = new RegExp(req.query.mtOrderId, 'i')
    }

    if (req.query.hlyOrderId) {
      query.hlyOrderId = new RegExp(req.query.hlyOrderId, 'i')
    }

    if (req.query.pfCancelled !== undefined && req.query.pfCancelled !== '') {
      query.pfCancelled = req.query.pfCancelled === 'true'
    }

    if (req.query.hlyCancelled !== undefined && req.query.hlyCancelled !== '') {
      query.hlyCancelled = req.query.hlyCancelled === 'true'
    }

    // 获取总数
    const total = await Review.countDocuments(query)
    
    // 获取分页数据
    const reviews = await Review.find(query)
      .sort({ orderDate: -1 })
      .skip(skip)
      .limit(limit)

    res.json({
      success: true,
      reviews,
      pagination: {
        total,
        page,
        limit
      }
    })
  } catch (error) {
    console.error('获取评价列表失败:', error)
    res.status(500).json({
      success: false,
      message: '获取评价列表失败'
    })
  }
}

// 删除评价记录
exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params

    const result = await Review.findByIdAndDelete(id)
    if (!result) {
      return res.status(404).json({
        success: false,
        message: '评价记录不存在'
      })
    }

    return res.json({
      success: true,
      message: '删除成功'
    })
  } catch (error) {
    console.error('删除评价记录失败:', error)
    return res.status(500).json({
      success: false,
      message: '删除评价记录失败'
    })
  }
}

// 批量删除评价记录
exports.batchDeleteReviews = async (req, res) => {
  try {
    const { ids } = req.body

    // 验证参数
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '参数错误'
      })
    }

    // 批量删除记录
    const result = await Review.deleteMany({ _id: { $in: ids } })

    return res.json({
      success: true,
      message: '批量删除成功',
      deletedCount: result.deletedCount
    })
  } catch (error) {
    console.error('批量删除评价记录失败:', error)
    return res.status(500).json({
      success: false,
      message: '批量删除评价记录失败'
    })
  }
}

// 更新评价记录
exports.updateReview = async (req, res) => {
  try {
    const { id } = req.params
    const updateData = req.body

    // 如果有文件上传
    if (req.file) {
      updateData.screenshot = req.file.path
    }

    const review = await Review.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    )

    if (!review) {
      return res.status(404).json({
        success: false,
        message: '评价记录不存在'
      })
    }

    return res.json({
      success: true,
      message: '更新成功',
      review
    })
  } catch (error) {
    console.error('更新评价记录失败:', error)
    return res.status(500).json({
      success: false,
      message: '更新评价记录失败'
    })
  }
}

// 创建评价记录
exports.createReview = async (req, res) => {
  try {
    const reviewData = req.body

    // 如果有文件上传
    if (req.file) {
      reviewData.screenshot = req.file.path
    }

    const review = await Review.create(reviewData)

    return res.status(201).json({
      success: true,
      message: '创建成功',
      review
    })
  } catch (error) {
    console.error('创建评价记录失败:', error)
    return res.status(500).json({
      success: false,
      message: '创建评价记录失败'
    })
  }
}

// 更新所有记录的项目字段
exports.updateAllProjects = async (req, res) => {
  try {
    const result = await Review.updateMany(
      {},  // 匹配所有记录
      { $set: { project: '无界·长安' } }  // 设置正确的项目名称
    )

    res.json({
      success: true,
      message: `已更新 ${result.modifiedCount} 条记录`,
      result
    })
  } catch (error) {
    console.error('更新项目字段失败:', error)
    res.status(500).json({
      success: false,
      message: '更新项目字段失败'
    })
  }
}

// 上传评价截图
exports.uploadScreenshot = async (req, res) => {
  try {
    const { id } = req.params
    
    console.log('上传请求信息:', {
      id,
      hasFile: !!req.file,
      files: req.files,
      body: req.body
    })
    
    // 检查评价是否存在
    const review = await Review.findById(id)
    if (!review) {
      return res.status(404).json({
        success: false,
        message: '评价记录不存在'
      })
    }
    
    // 检查是否有文件上传
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的文件'
      })
    }
    
    console.log('上传文件信息:', {
      filename: req.file.filename,
      path: req.file.path,
      mimetype: req.file.mimetype,
      size: req.file.size
    })
    
    // 处理上传的图片（生成缩略图）
    const screenshotInfo = await processUploadedImage(req.file)
    
    // 将截图信息添加到评价记录中
    if (!review.screenshots) {
      review.screenshots = []
    }
    
    review.screenshots.push(screenshotInfo)
    await review.save()
    
    // 返回成功信息
    return res.json({
      success: true,
      message: '上传截图成功',
      data: screenshotInfo
    })
  } catch (error) {
    console.error('上传截图失败:', error)
    // 打印详细错误栈
    console.error(error.stack)
    return res.status(500).json({
      success: false,
      message: '上传截图失败: ' + error.message,
      error: error.message
    })
  }
}

// 删除评价截图
exports.deleteScreenshot = async (req, res) => {
  try {
    const { id, screenshotId } = req.params
    
    // 检查评价是否存在
    const review = await Review.findById(id)
    if (!review) {
      return res.status(404).json({
        success: false,
        message: '评价记录不存在'
      })
    }
    
    // 查找指定的截图
    const screenshot = review.screenshots.id(screenshotId)
    if (!screenshot) {
      return res.status(404).json({
        success: false,
        message: '截图不存在'
      })
    }
    
    // 删除实际文件
    await deleteImages(screenshot)
    
    // 从数组中移除截图记录
    review.screenshots.pull(screenshotId)
    await review.save()
    
    return res.json({
      success: true,
      message: '删除截图成功'
    })
  } catch (error) {
    console.error('删除截图失败:', error)
    return res.status(500).json({
      success: false,
      message: '删除截图失败',
      error: error.message
    })
  }
}

// 获取评价的所有截图
exports.getScreenshots = async (req, res) => {
  try {
    const { id } = req.params
    
    // 检查评价是否存在
    const review = await Review.findById(id)
    if (!review) {
      return res.status(404).json({
        success: false,
        message: '评价记录不存在'
      })
    }
    
    return res.json({
      success: true,
      data: review.screenshots || []
    })
  } catch (error) {
    console.error('获取截图失败:', error)
    return res.status(500).json({
      success: false,
      message: '获取截图失败',
      error: error.message
    })
  }
}

// 获取单个评价记录
exports.getReview = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: '缺少评价ID'
      });
    }
    
    const review = await Review.findById(id);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: '评价记录不存在'
      });
    }
    
    return res.json({
      success: true,
      data: review
    });
  } catch (error) {
    console.error('获取评价记录失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取评价记录失败',
      error: error.message
    });
  }
}; 