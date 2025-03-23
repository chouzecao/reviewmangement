# PDF导出功能实现方案

## 技术选型

1. **PDF生成库**:
   - 使用 `jsPDF` 作为主要PDF生成库
   - 使用 `html2canvas` 配合jsPDF处理HTML内容和图片渲染
   - 使用 `jspdf-autotable` 插件来处理表格布局

2. **依赖项**:
   ```
   jspdf: ^2.5.1
   html2canvas: ^1.4.1
   jspdf-autotable: ^3.5.31
   ```

## 功能实现步骤

### 1. 前端界面修改

在 `ReportGenerate.vue` 文件中添加"导出PDF"按钮，放置在现有"导出报表"按钮旁边：

```vue
<el-button type="primary" @click="handleExportPDF" :loading="exportingPDF">
  导出PDF
</el-button>
```

### 2. 数据处理

创建一个专门用于PDF导出的函数，获取选定日期范围内的所有评价记录：

```javascript
// 获取PDF报表数据
const fetchPDFReportData = async () => {
  const response = await getFullReportData({
    project: form.project,
    startDate: form.dateRange[0],
    endDate: form.dateRange[1]
  })
  
  if (!response || !response.success) {
    throw new Error(response?.message || '获取报表数据失败')
  }
  
  return response.data
}
```

在服务器端创建一个新的API端点来获取完整的报表数据（包括评价详情和截图）:

```javascript
// 在 server/src/controllers/report.controller.js 中添加
exports.getFullReportData = async (req, res) => {
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
    
    // 获取评价记录，包含所有字段和截图信息
    const reviews = await Review.find(query).sort({ orderDate: 1 })
    
    // 计算统计数据
    const totalAmount = reviews.reduce((sum, r) => sum + r.amount, 0)
    const averageAmount = reviews.length ? totalAmount / reviews.length : 0
    
    // 计算评价类型分布
    const reviewTypeStats = reviews.reduce((stats, r) => {
      stats[r.reviewType] = (stats[r.reviewType] || 0) + 1
      return stats
    }, {})
    
    // 计算评价类型百分比
    const reviewTypePercentage = {}
    Object.keys(reviewTypeStats).forEach(type => {
      reviewTypePercentage[type] = ((reviewTypeStats[type] / reviews.length) * 100).toFixed(1)
    })
    
    res.json({
      success: true,
      data: {
        reviews,
        summary: {
          totalOrders: reviews.length,
          totalAmount,
          averageAmount,
          reviewTypeStats,
          reviewTypePercentage
        }
      }
    })
  } catch (error) {
    console.error('获取PDF报表数据失败:', error)
    res.status(500).json({
      success: false,
      message: '获取PDF报表数据失败'
    })
  }
}
```

### 3. PDF生成实现

在前端实现PDF生成的主要函数：

```javascript
// 导出PDF报表
const handleExportPDF = async () => {
  if (!checkAuth()) return
  if (!reportData.value) {
    ElMessage.warning('请先生成报表')
    return
  }
  
  try {
    exportingPDF.value = true
    ElMessage.info('正在准备PDF数据，请稍候...')
    
    // 获取完整的报表数据
    const fullData = await fetchPDFReportData()
    
    // 创建PDF实例
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })
    
    // 设置字体以支持中文
    pdf.addFont('NotoSansSC-Regular.ttf', 'NotoSansSC', 'normal')
    pdf.setFont('NotoSansSC')
    
    // 添加报表标题
    addReportTitle(pdf, fullData)
    
    // 添加报表摘要
    addReportSummary(pdf, fullData.summary)
    
    // 处理所有评价记录
    let currentPage = 1
    const totalPages = Math.ceil(fullData.reviews.length / 2) // 每页最多2条记录
    
    for (let i = 0; i < fullData.reviews.length; i++) {
      // 每2条记录添加新页
      if (i > 0 && i % 2 === 0) {
        pdf.addPage()
        currentPage++
      }
      
      // 计算当前记录在页面中的位置
      const isFirstInPage = i % 2 === 0
      const yPosition = isFirstInPage ? 60 : 160
      
      // 添加评价记录
      await addReviewRecord(pdf, fullData.reviews[i], yPosition)
      
      // 添加页脚
      addPageFooter(pdf, currentPage, totalPages)
    }
    
    // 保存PDF
    pdf.save(`${form.project}评价报表_${form.dateRange[0]}_${form.dateRange[1]}.pdf`)
    
    ElMessage.success('PDF导出成功')
  } catch (error) {
    console.error('PDF导出失败:', error)
    ElMessage.error(error.message || 'PDF导出失败')
  } finally {
    exportingPDF.value = false
  }
}
```

### 4. PDF内容生成辅助函数

```javascript
// 添加报表标题
const addReportTitle = (pdf, data) => {
  pdf.setFontSize(18)
  pdf.setFont('NotoSansSC', 'bold')
  pdf.text(`${form.project} 评价记录报表`, 105, 20, { align: 'center' })
  pdf.setFontSize(14)
  pdf.text(`(${form.dateRange[0]} 至 ${form.dateRange[1]})`, 105, 30, { align: 'center' })
}

// 添加报表摘要
const addReportSummary = (pdf, summary) => {
  pdf.setFontSize(14)
  pdf.setFont('NotoSansSC', 'bold')
  pdf.text('报表摘要', 15, 45)
  
  const tableData = [
    [
      `总订单数: ${summary.totalOrders}`, 
      `总金额: ¥${summary.totalAmount.toFixed(2)}`, 
      `平均金额: ¥${summary.averageAmount.toFixed(2)}`
    ]
  ]
  
  const reviewTypeRow = []
  Object.keys(summary.reviewTypeStats).forEach(type => {
    reviewTypeRow.push(
      `${type}: ${summary.reviewTypeStats[type]} (${summary.reviewTypePercentage[type]}%)`
    )
  })
  
  if (reviewTypeRow.length > 0) {
    tableData.push(reviewTypeRow)
  }
  
  pdf.autoTable({
    startY: 50,
    body: tableData,
    theme: 'grid',
    styles: { font: 'NotoSansSC', fontSize: 10 },
    columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 60 }, 2: { cellWidth: 60 } }
  })
}

// 添加单条评价记录
const addReviewRecord = async (pdf, review, yPosition) => {
  pdf.setFontSize(12)
  pdf.setFont('NotoSansSC', 'bold')
  pdf.text(`评价记录 #${review._id.substring(0, 6)}`, 15, yPosition)
  
  // 基本信息表格
  const reviewInfo = [
    [
      `下单日期: ${formatDate(review.orderDate)}`,
      `出行日期: ${formatDate(review.travelDate)}`,
      `出评日期: ${formatDate(review.reviewDate)}`
    ],
    [
      `预订人: ${review.customerName}`,
      `身份证号: ${maskIdCard(review.customerId)}`,
      `手机号: ${maskPhone(review.phone)}`
    ],
    [
      `项目: ${review.project}`,
      `预订产品: ${review.product}`,
      `金额: ¥${review.amount.toFixed(2)}`
    ],
    [
      `美团订单号: ${maskOrderId(review.mtOrderId)}`,
      `票付通订单号: ${maskOrderId(review.pfOrderId)}`,
      `惠旅云订单号: ${maskOrderId(review.hlyOrderId)}`
    ],
    [
      `评价类型: ${review.reviewType}`,
      `票付通取消: ${review.pfCancelled ? '已取消' : '正常'}`,
      `惠旅云取消: ${review.hlyCancelled ? '已取消' : '正常'}`
    ]
  ]
  
  pdf.autoTable({
    startY: yPosition + 5,
    body: reviewInfo,
    theme: 'grid',
    styles: { font: 'NotoSansSC', fontSize: 9 },
    columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 60 }, 2: { cellWidth: 60 } }
  })
  
  // 评价内容
  const finalY = pdf.previousAutoTable.finalY
  pdf.setFontSize(10)
  pdf.setFont('NotoSansSC', 'bold')
  pdf.text('评价内容:', 15, finalY + 10)
  
  pdf.setFont('NotoSansSC', 'normal')
  const contentLines = pdf.splitTextToSize(review.reviewContent || '无评价内容', 180)
  pdf.text(contentLines, 15, finalY + 20)
  
  // 评价截图
  const contentHeight = contentLines.length * 5
  pdf.text('评价截图:', 15, finalY + 25 + contentHeight)
  
  // 如果有截图，则处理截图
  if (review.screenshots && review.screenshots.length > 0) {
    let imgX = 15
    let imgY = finalY + 35 + contentHeight
    const imgWidth = 50
    const imgHeight = 40
    
    for (let i = 0; i < review.screenshots.length; i++) {
      if (i > 0 && i % 3 === 0) {
        // 换行
        imgX = 15
        imgY += imgHeight + 10
      }
      
      try {
        // 使用html2canvas获取图片
        const imgUrl = review.screenshots[i].originalPath
        const img = await loadImage(imgUrl)
        pdf.addImage(img, 'JPEG', imgX, imgY, imgWidth, imgHeight)
        imgX += imgWidth + 10
      } catch (error) {
        console.error('处理截图失败:', error)
      }
    }
  } else if (review.screenshot) {
    // 兼容旧数据结构
    try {
      const img = await loadImage(review.screenshot)
      pdf.addImage(img, 'JPEG', 15, finalY + 35 + contentHeight, 50, 40)
    } catch (error) {
      console.error('处理截图失败:', error)
    }
  }
}

// 添加页脚
const addPageFooter = (pdf, currentPage, totalPages) => {
  pdf.setFontSize(9)
  pdf.setFont('NotoSansSC', 'normal')
  pdf.text(`第 ${currentPage} 页 / 共 ${totalPages} 页`, 195, 285, { align: 'right' })
}

// 辅助函数：格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '无'
  return dayjs(dateStr).format('YYYY-MM-DD')
}

// 辅助函数：掩码处理身份证号
const maskIdCard = (idCard) => {
  if (!idCard) return '无'
  if (idCard.length >= 15) {
    return idCard.substring(0, 6) + '********' + idCard.substring(idCard.length - 2)
  }
  return idCard
}

// 辅助函数：掩码处理手机号
const maskPhone = (phone) => {
  if (!phone) return '无'
  if (phone.length === 11) {
    return phone.substring(0, 3) + '****' + phone.substring(7)
  }
  return phone
}

// 辅助函数：掩码处理订单号
const maskOrderId = (orderId) => {
  if (!orderId) return '无'
  if (orderId.length > 8) {
    return orderId.substring(0, 8) + '****'
  }
  return orderId
}

// 辅助函数：加载图片
const loadImage = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
      const dataUrl = canvas.toDataURL('image/jpeg')
      resolve(dataUrl)
    }
    img.onerror = reject
    img.src = url
  })
}
```

## 需要添加的API路由

在 `server/src/routes/report.routes.js` 中添加新的路由：

```javascript
// 获取完整的PDF报表数据
router.post('/full-data', reportController.getFullReportData)
```

## 需要添加的API方法

在 `client/src/api/review.js` 中添加新的方法：

```javascript
// 获取完整的PDF报表数据
export const getFullReportData = (data) => {
  return instance.post('/reports/full-data', data)
}
```

## 安装所需依赖项

在项目中安装所需的依赖：

```bash
cd /home/devbox/project/client
npm install jspdf html2canvas jspdf-autotable
```

## 字体处理

为了支持中文，需要将中文字体文件添加到项目中，并进行配置：

1. 下载 NotoSansSC 字体文件
2. 将字体文件放置在 `client/public/fonts/` 目录中
3. 在 PDF 生成前加载字体文件

## 注意事项

1. 由于要处理大量图片和数据，PDF生成可能需要一定的时间，建议添加加载提示
2. 图片加载可能会遇到跨域问题，需要确保服务器正确配置了CORS
3. 对于大量记录，需要分页处理，避免生成的PDF文件过大
4. 对于敏感信息（如身份证号、手机号等），需要进行掩码处理 