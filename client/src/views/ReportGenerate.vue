<template>
  <div class="report-container">
    <h2>报表生成</h2>

    <!-- 查询表单 -->
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="120px"
      class="report-form"
    >
      <el-form-item label="项目" prop="project">
        <el-select
          v-model="form.project"
          placeholder="请选择项目"
          filterable
          class="w-full"
        >
          <el-option
            v-for="item in projectOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="日期范围" prop="dateRange">
        <el-date-picker
          v-model="form.dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          class="w-full"
        />
      </el-form-item>

      <el-form-item label="美团当日总评分" prop="mtScore">
        <el-input-number
          v-model="form.mtScore"
          :min="0"
          :max="5"
          :precision="1"
          :step="0.1"
          class="w-full"
        />
      </el-form-item>

      <el-form-item>
        <el-button type="primary" @click="handleGenerate" :loading="loading">
          生成报表
        </el-button>
      </el-form-item>
    </el-form>

    <!-- 报表预览 -->
    <div v-if="reportData" class="report-section">
      <div class="report-header">
        <h3>报表预览</h3>
        <div class="report-actions">
          <el-button type="primary" @click="handleExport" :loading="exporting">
            导出Excel
          </el-button>
          <el-button type="success" @click="handleExportHTML" :loading="exportingPDF">
            导出报告
          </el-button>
          <el-button type="info" @click="handleExportMarkdown" :loading="exportingMarkdown">
            导出Markdown
          </el-button>
        </div>
      </div>

      <div class="report-summary">
        <el-descriptions :column="3" border>
          <el-descriptions-item label="总订单数">
            {{ reportData.totalOrders }}
          </el-descriptions-item>
          <el-descriptions-item label="总金额">
            {{ reportData.totalAmount?.toFixed(2) }}
          </el-descriptions-item>
          <el-descriptions-item label="平均金额">
            {{ reportData.averageAmount?.toFixed(2) }}
          </el-descriptions-item>
          <el-descriptions-item label="美团评分">
            {{ reportData.mtScore }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <div class="report-charts">
        <div class="chart-item">
          <h4>每日订单趋势</h4>
          <div ref="orderTrendChartRef" class="chart"></div>
        </div>
      </div>

      <el-table
        :data="reportData.details"
        border
        style="width: 100%"
        height="400"
      >
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="date" label="日期" width="120" />
        <el-table-column prop="orderCount" label="订单数" width="100" align="center" />
        <el-table-column prop="amount" label="金额" width="120" align="right">
          <template #default="{ row }">
            {{ row.amount?.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="reviewCount" label="评价数" width="100" align="center" />
        <el-table-column label="评价类型分布" min-width="300">
          <template #default="{ row }">
            <el-tag
              v-for="(count, type) in row.reviewTypes"
              :key="type"
              :type="getReviewTypeTag(type)"
              class="mx-1"
            >
              {{ type }}: {{ count }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="customerName" label="预订人姓名" width="100" />
        <el-table-column prop="customerId" label="预订人身份证号" width="180" />
        <el-table-column prop="project" label="项目" width="120" />
        <el-table-column prop="product" label="预订产品" width="200" />
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { getReportData, exportReport, getFullReportData } from '@/api/review'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import dayjs from 'dayjs'

const router = useRouter()
const formRef = ref(null)
const loading = ref(false)
const exporting = ref(false)
const exportingPDF = ref(false)
const exportingMarkdown = ref(false)
const reportData = ref(null)

// 图表引用
const orderTrendChartRef = ref(null)
let orderTrendChart = null

// 项目选项
const projectOptions = [
  {
    label: '无界·长安',
    value: '无界·长安'
  },
  {
    label: '兵马俑日游',
    value: '兵马俑日游'
  },
  {
    label: '兵马俑讲解',
    value: '兵马俑讲解'
  }
]

// 表单数据
const form = reactive({
  project: '无界·长安',
  dateRange: [],
  mtScore: 4.8
})

// 表单验证规则
const rules = {
  project: [
    { required: true, message: '请选择项目', trigger: 'change' }
  ],
  dateRange: [
    { required: true, message: '请选择日期范围', trigger: 'change' }
  ],
  mtScore: [
    { required: true, message: '请输入美团评分', trigger: 'blur' },
    { type: 'number', min: 0, max: 5, message: '评分必须在0-5之间', trigger: 'blur' }
  ]
}

// 获取评价类型对应的标签类型
const getReviewTypeTag = (type) => {
  const map = {
    '5分': 'success',
    '分+字': 'warning',
    '分+字图': 'danger'
  }
  return map[type] || 'info'
}

// 检查登录状态
const checkAuth = () => {
  const user = localStorage.getItem('user')
  if (!user) {
    ElMessage.error('请先登录')
    router.push('/login')
    return false
  }
  return true
}

// 初始化订单趋势图表
const initOrderTrendChart = (data) => {
  if (!orderTrendChartRef.value) return

  orderTrendChart = echarts.init(orderTrendChartRef.value)
  const option = {
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: data.details.map(item => item.date)
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '订单数',
        type: 'line',
        data: data.details.map(item => item.orderCount)
      }
    ]
  }
  orderTrendChart.setOption(option)
}

// 生成报表
const handleGenerate = async () => {
  if (!checkAuth()) return
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    
    loading.value = true
    const params = {
      project: form.project,
      startDate: form.dateRange[0],
      endDate: form.dateRange[1],
      mtScore: form.mtScore
    }
    
    try {
      const response = await getReportData(params)
      
      // 检查返回数据结构并正确提取数据
      console.log('报表返回数据:', response) // 添加调试日志
      
      if (response && response.success && response.data) {
        ElMessage.success('生成成功')
        reportData.value = response.data
        
        // 初始化图表
        setTimeout(() => {
          if (reportData.value && reportData.value.details) {
            initOrderTrendChart(reportData.value)
          } else {
            console.error('报表数据结构不正确:', reportData.value)
            ElMessage.warning('报表数据结构不正确，无法生成图表')
          }
        }, 0)
      } else {
        ElMessage.error(response?.message || '获取报表数据失败')
      }
    } catch (error) {
      // 处理特定的错误
      console.error('生成失败:', error)
      if (error.response && error.response.status === 401) {
        ElMessage.error('会话已过期，请重新登录')
        router.push('/login')
      } else if (error.message && error.message.includes('JSON')) {
        ElMessage.error('获取数据失败，请重新登录后再试')
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        router.push('/login')
      } else {
        ElMessage.error(error.message || '生成失败')
      }
    }
  } catch (error) {
    console.error('表单验证失败:', error)
    ElMessage.error('请正确填写表单')
  } finally {
    loading.value = false
  }
}

// 导出Excel报表
const handleExport = async () => {
  if (!checkAuth()) return
  if (!reportData.value) {
    ElMessage.warning('没有可导出的数据')
    return
  }

  try {
    exporting.value = true
    const exportData = {
      project: form.project,
      startDate: form.dateRange[0],
      endDate: form.dateRange[1]
    }
    
    console.log('导出报表参数:', exportData) // 添加调试日志
    
    try {
      const response = await exportReport(exportData)
      
      console.log('导出响应类型:', typeof response, response instanceof Blob) // 添加调试日志
      
      // 确认响应是否为Blob类型
      if (response instanceof Blob) {
        // 下载文件
        const blob = new Blob([response], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${form.project}评价报表_${form.dateRange[0]}_${form.dateRange[1]}.xlsx`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)

        ElMessage.success('导出成功')
      } else {
        console.error('导出返回的数据格式不正确:', response)
        ElMessage.error('导出失败，返回格式不正确')
      }
    } catch (error) {
      // 处理特定的错误
      console.error('导出失败:', error)
      if (error.response && error.response.status === 401) {
        ElMessage.error('会话已过期，请重新登录')
        router.push('/login')
      } else if (error.message && error.message.includes('JSON')) {
        ElMessage.error('获取数据失败，请重新登录后再试')
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        router.push('/login')
      } else {
        ElMessage.error(error.message || '导出失败')
      }
    }
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error(error.message || '导出失败')
  } finally {
    exporting.value = false
  }
}

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
    if (!url) {
      console.warn('图片URL为空')
      resolve(null)
      return
    }
    
    try {
      // 处理相对路径，确保完整URL
      let fullUrl = url
      if (!url.startsWith('http') && !url.startsWith('data:')) {
        // 确保URL以/开头
        if (!url.startsWith('/')) {
          fullUrl = '/' + url
        }
        fullUrl = window.location.origin + fullUrl
      }
      
      console.log('开始加载图片:', fullUrl)
      
      const img = new Image()
      img.crossOrigin = 'Anonymous' // 允许跨域获取图片
      
      img.onload = () => {
        try {
          console.log('图片加载成功, 尺寸:', img.width, 'x', img.height)
          
          // 创建canvas来转换图片格式
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          canvas.width = img.width
          canvas.height = img.height
          ctx.drawImage(img, 0, 0)
          
          // 转为dataURL格式
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
          console.log('图片转换为dataURL格式成功, 长度:', dataUrl.length)
          
          resolve(dataUrl)
        } catch (error) {
          console.error('处理图片失败:', error)
          resolve(null)
        }
      }
      
      img.onerror = (error) => {
        console.error('加载图片失败:', fullUrl, error)
        
        // 尝试不同的URL格式
        if (fullUrl.startsWith(window.location.origin)) {
          const alternativeUrl = fullUrl.replace(window.location.origin, '')
          console.log('尝试替代URL:', alternativeUrl)
          
          const alternativeImg = new Image()
          alternativeImg.crossOrigin = 'Anonymous'
          
          alternativeImg.onload = () => {
            try {
              const canvas = document.createElement('canvas')
              const ctx = canvas.getContext('2d')
              canvas.width = alternativeImg.width
              canvas.height = alternativeImg.height
              ctx.drawImage(alternativeImg, 0, 0)
              const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
              console.log('替代图片加载成功')
              resolve(dataUrl)
            } catch (e) {
              console.error('处理替代图片失败:', e)
              resolve(null)
            }
          }
          
          alternativeImg.onerror = () => {
            console.error('替代图片加载失败')
            resolve(null)
          }
          
          alternativeImg.src = alternativeUrl
        } else {
          resolve(null)
        }
      }
      
      // 设置图片源
      img.src = fullUrl
    } catch (error) {
      console.error('加载图片过程出错:', error)
      resolve(null)
    }
  })
}

// 加载中文字体
const loadFontFace = async () => {
  // 使用内联的base64编码字体文件
  const fontBase64 = 'YOUR_BASE64_FONT_STRING_HERE' // 这里实际项目中需要放入一个字体的base64编码
  
  // 创建一个简单的中文字体
  const customFont = {
    normal: {
      chinese: {
        normal: '微软雅黑, SimSun, sans-serif'
      }
    }
  }
  
  return customFont
}

// 定义中文字体（暂时不使用中文显示，因为PDFjs不支持）
const addFontToJsPDF = () => {
  // 这里我们只定义但不使用中文字体，因为jsPDF对中文支持有限
  console.log('PDF使用标准字体...')
}

// 导出HTML报告
const handleExportHTML = async () => {
  if (!checkAuth()) return
  if (!reportData.value) {
    ElMessage.warning('请先生成报表')
    return
  }

  try {
    exportingPDF.value = true
    ElMessage.info('正在准备报告数据，请稍候...')
    
    // 获取完整的报表数据
    const fullData = await fetchPDFReportData()
    
    // 创建一个新窗口来显示HTML报告
    const reportWindow = window.open('', '_blank')
    
    if (!reportWindow) {
      ElMessage.error('无法打开新窗口，请检查浏览器是否阻止了弹出窗口')
      exportingPDF.value = false
      return
    }

    // 创建报告内容
    generateReportHTML(reportWindow, fullData)
    
    ElMessage.success('报告生成成功，请在新窗口中查看并打印')
  } catch (error) {
    console.error('报告生成失败:', error)
    ElMessage.error(error.message || '报告生成失败')
  } finally {
    exportingPDF.value = false
  }
}

// 生成HTML报告内容
const generateReportHTML = (targetWindow, data) => {
  const doc = targetWindow.document
  
  // 添加HTML基础结构
  doc.open()
  doc.write('<!DOCTYPE html>')
  doc.write('<html lang="zh-CN">')
  
  // 添加头部
  doc.write('<head>')
  doc.write('<meta charset="UTF-8">')
  doc.write('<meta http-equiv="Content-Type" content="text/html; charset=utf-8">')
  doc.write('<meta name="viewport" content="width=device-width, initial-scale=1.0">')
  doc.write(`<title>${form.project} 评价报告</title>`)
  
  // 添加样式 - 使用内联样式避免打印问题
  doc.write('<style media="screen, print">')
  doc.write('@page { size: auto; margin: 10mm; }') // 设置页面边距
  doc.write('@font-face {')
  doc.write('  font-family: "LocalSimSun";')
  doc.write('  src: local("SimSun");')
  doc.write('}')
  doc.write('@font-face {')
  doc.write('  font-family: "LocalMSYH";')
  doc.write('  src: local("Microsoft YaHei");')
  doc.write('}')
  doc.write('* { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }')
  doc.write('body, div, p, h1, h2, h3, h4, table, td, th { font-family: "LocalMSYH", "LocalSimSun", Arial, sans-serif !important; }')
  doc.write('body { margin: 0; padding: 20px; background-color: #fff; color: #000; }')
  doc.write('.container { max-width: 1000px; margin: 0 auto; padding: 20px; }')
  doc.write('.header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #000; }')
  doc.write('.title { margin: 0; font-size: 24px; }')
  doc.write('.subtitle { margin: 10px 0 0 0; font-size: 16px; }')
  doc.write('.summary { margin-bottom: 30px; padding: 15px; border: 1px solid #000; }')
  doc.write('.summary-title { margin-top: 0; font-size: 18px; }')
  doc.write('.summary-table { width: 100%; border-collapse: collapse; }')
  doc.write('.summary-table td, .summary-table th { padding: 10px; border: 1px solid #000; }')
  doc.write('.record { margin-bottom: 30px; padding: 15px; border: 1px solid #000; page-break-inside: avoid; }')
  doc.write('.record-title { margin-top: 0; font-size: 18px; padding-bottom: 10px; border-bottom: 1px solid #000; }')
  doc.write('.record-info { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 15px 0; }')
  doc.write('.record-info-item { padding: 5px; border: 1px solid #ddd; }')
  doc.write('.record-content { margin: 15px 0; }')
  doc.write('.screenshots { display: flex; flex-wrap: wrap; gap: 10px; margin: 15px 0; }')
  doc.write('.screenshot { max-width: 200px; max-height: 180px; border: 1px solid #000; }')
  doc.write('.print-button { position: fixed; top: 20px; right: 20px; padding: 10px 20px; background-color: #0066cc; color: white; border: none; cursor: pointer; font-size: 14px; z-index: 100; }')
  doc.write('@media print { body { -webkit-print-color-adjust: exact; } .print-button { display: none; } .record { page-break-after: always; } .record:last-child { page-break-after: avoid; } }')
  doc.write('</style>')
  
  doc.write('</head>')
  doc.write('<body>')
  
  // 添加打印按钮
  doc.write('<button class="print-button" onclick="customPrint()">打印报告</button>')
  
  // 添加内容容器
  doc.write('<div class="container">')
  
  // 添加浏览器兼容性提示
  doc.write('<div style="background-color: #f8f8f8; padding: 10px; margin-bottom: 15px; border-radius: 4px; border: 1px solid #e8e8e8;">')
  doc.write('<p style="margin: 0; color: #666;"><strong>提示：</strong>如果打印预览中文字显示不正常，请尝试使用Safari浏览器打开本页面。</p>')
  doc.write('</div>')
  
  // 添加标题
  doc.write('<div class="header">')
  doc.write(`<h1 class="title">${form.project} 评价记录报表</h1>`)
  doc.write(`<h2 class="subtitle">${form.dateRange[0]} 至 ${form.dateRange[1]}</h2>`)
  doc.write('</div>')
  
  // 添加摘要
  doc.write('<div class="summary">')
  doc.write('<h3 class="summary-title">报表摘要</h3>')
  doc.write('<table class="summary-table">')
  doc.write('<tr>')
  doc.write(`<td>总订单数: ${data.summary.totalOrders}</td>`)
  doc.write(`<td>总金额: ¥${data.summary.totalAmount.toFixed(2)}</td>`)
  doc.write(`<td>平均金额: ¥${data.summary.averageAmount.toFixed(2)}</td>`)
  doc.write('</tr>')
  doc.write('<tr>')
  doc.write('<td colspan="3">')
  doc.write('评价类型统计: ' + Object.keys(data.summary.reviewTypeStats).map(type => 
    `${type}: ${data.summary.reviewTypeStats[type]} (${data.summary.reviewTypePercentage[type]}%)`
  ).join(' | '))
  doc.write('</td>')
  doc.write('</tr>')
  doc.write('</table>')
  doc.write('</div>')
  
  // 添加评价记录
  data.reviews.forEach((review, index) => {
    doc.write('<div class="record">')
    doc.write(`<h3 class="record-title">${form.project} 评价记录 ${index + 1}</h3>`)
    
    doc.write('<div class="record-info">')
    doc.write(`<div class="record-info-item">评价ID: ${review._id ? review._id.substring(0, 8) : '无'}</div>`)
    doc.write(`<div class="record-info-item">订单日期: ${formatDate(review.orderDate)}</div>`)
    doc.write(`<div class="record-info-item">出行日期: ${formatDate(review.travelDate)}</div>`)
    
    doc.write(`<div class="record-info-item">客户: ${review.customerName || '无'}</div>`)
    doc.write(`<div class="record-info-item">身份证: ${maskIdCard(review.customerId)}</div>`)
    doc.write(`<div class="record-info-item">电话: ${maskPhone(review.phone)}</div>`)
    
    doc.write(`<div class="record-info-item">项目: ${review.project || '无'}</div>`)
    doc.write(`<div class="record-info-item">产品: ${review.product || '无'}</div>`)
    doc.write(`<div class="record-info-item">金额: ¥${(review.amount || 0).toFixed(2)}</div>`)
    
    doc.write(`<div class="record-info-item">美团订单: ${maskOrderId(review.mtOrderId)}</div>`)
    doc.write(`<div class="record-info-item">PFT订单: ${maskOrderId(review.pfOrderId)}</div>`)
    doc.write(`<div class="record-info-item">HLY订单: ${maskOrderId(review.hlyOrderId)}</div>`)
    
    doc.write(`<div class="record-info-item">评价类型: ${review.reviewType || '无'}</div>`)
    doc.write(`<div class="record-info-item">PFT取消: ${review.pfCancelled ? '已取消' : '正常'}</div>`)
    doc.write(`<div class="record-info-item">HLY取消: ${review.hlyCancelled ? '已取消' : '正常'}</div>`)
    doc.write('</div>')
    
    doc.write('<div class="record-content">')
    doc.write('<h4>评价内容:</h4>')
    doc.write(`<p>${review.reviewContent || '无评价内容'}</p>`)
    doc.write('</div>')
    
    doc.write('<div class="screenshots">')
    doc.write('<h4>评价截图:</h4>')
    
    // 处理截图
    if (review.screenshots && review.screenshots.length > 0) {
      review.screenshots.forEach((screenshot, i) => {
        let imgUrl = screenshot.originalPath
        if (!imgUrl.startsWith('http') && !imgUrl.startsWith('/')) {
          imgUrl = '/' + imgUrl
        }
        
        doc.write(`<img class="screenshot" src="${imgUrl}" alt="截图 ${i + 1}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMTgwIiB2aWV3Qm94PSIwIDAgMjAwIDE4MCIgZmlsbD0ibm9uZSI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxODAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0Ij7lm77niYfliqDovb3lpLHotKU8L3RleHQ+PC9zdmc+';this.alt='加载失败';" />`)
      })
    } else if (review.screenshot) {
      // 处理旧格式截图
      let imgUrl = review.screenshot
      if (!imgUrl.startsWith('http') && !imgUrl.startsWith('/')) {
        imgUrl = '/' + imgUrl
      }
      
      doc.write(`<img class="screenshot" src="${imgUrl}" alt="截图" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMTgwIiB2aWV3Qm94PSIwIDAgMjAwIDE4MCIgZmlsbD0ibm9uZSI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxODAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0Ij7lm77niYfliqDovb3lpLHotKU8L3RleHQ+PC9zdmc+';this.alt='加载失败';" />`)
    } else {
      doc.write('<p>无截图</p>')
    }
    
    doc.write('</div>')
    doc.write('</div>')
  })
  
  // 结束容器
  doc.write('</div>')
  
  // 添加自定义打印函数
  doc.write('<script>')
  doc.write('function customPrint() {')
  doc.write('  try {')
  doc.write('    console.log("调用打印功能");')
  doc.write('    window.print();')
  doc.write('  } catch(err) {')
  doc.write('    console.error("打印出错:", err);')
  doc.write('    alert("打印出错: " + err.message);')
  doc.write('  }')
  doc.write('}')
  
  // 添加图片错误处理
  doc.write('document.addEventListener("DOMContentLoaded", function() {')
  doc.write('  document.querySelectorAll(".screenshot").forEach(function(img) {')
  doc.write('    img.addEventListener("error", function() {')
  doc.write('      this.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMTgwIiB2aWV3Qm94PSIwIDAgMjAwIDE4MCIgZmlsbD0ibm9uZSI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxODAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0Ij7lm77niYfliqDovb3lpLHotKU8L3RleHQ+PC9zdmc+";')
  doc.write('      this.alt = "加载失败";')
  doc.write('    });')
  doc.write('  });')
  doc.write('});')
  doc.write('</' + 'script>')
  
  doc.write('</body>')
  doc.write('</html>')
  doc.close()
}

// 监听窗口大小变化，重绘图表
const handleResize = () => {
  orderTrendChart?.resize()
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  orderTrendChart?.dispose()
})

// 导出Markdown报告
const handleExportMarkdown = async () => {
  if (!checkAuth()) return
  if (!reportData.value) {
    ElMessage.warning('请先生成报表')
    return
  }

  try {
    exportingMarkdown.value = true
    ElMessage.info('正在准备Markdown报告数据，请稍候...')
    
    // 获取完整的报表数据
    const fullData = await fetchPDFReportData()
    
    // 生成Markdown内容
    const markdownContent = generateMarkdownReport(fullData)
    
    // 下载文件
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${form.project}评价报告_${form.dateRange[0]}_${form.dateRange[1]}.md`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    ElMessage.success('Markdown报告生成成功')
  } catch (error) {
    console.error('Markdown报告生成失败:', error)
    ElMessage.error(error.message || 'Markdown报告生成失败')
  } finally {
    exportingMarkdown.value = false
  }
}

// 生成Markdown报告内容
const generateMarkdownReport = (data) => {
  let md = ''
  
  // 获取基础URL
  const baseUrl = window.location.origin
  
  // 添加标题
  md += `# ${form.project} 评价记录报表\n\n`
  md += `## 报表期间: ${form.dateRange[0]} 至 ${form.dateRange[1]}\n\n`
  
  // 添加摘要 - 使用表格格式
  md += `## 报表摘要\n\n`
  md += `| 总订单数 | 总金额 | 平均金额 |\n`
  md += `| :------- | :----- | :------- |\n`
  md += `| ${data.summary.totalOrders} | ¥${data.summary.totalAmount.toFixed(2)} | ¥${data.summary.averageAmount.toFixed(2)} |\n\n`
  
  // 评价类型统计 - 使用表格格式
  md += `**评价类型统计:**\n\n`
  md += `| 类型 | 数量 | 百分比 |\n`
  md += `| :--- | :--: | :----- |\n`
  
  Object.keys(data.summary.reviewTypeStats).forEach(type => {
    md += `| ${type} | ${data.summary.reviewTypeStats[type]} | ${data.summary.reviewTypePercentage[type]}% |\n`
  })
  md += '\n'
  
  // 添加评价记录
  md += `## 评价记录\n\n`
  
  data.reviews.forEach((review, index) => {
    md += `### ${form.project} 评价记录 ${index + 1}\n\n`
    
    // 第一行：评价ID、订单日期、出行日期、客户、身份证、电话
    md += `| 评价ID | 订单日期 | 出行日期 | 客户 | 身份证 | 电话 |\n`
    md += `| :----- | :------- | :------- | :--- | :----- | :--- |\n`
    md += `| ${review._id ? review._id.substring(0, 8) : '无'} | ${formatDate(review.orderDate)} | ${formatDate(review.travelDate)} | ${review.customerName || '无'} | ${maskIdCard(review.customerId)} | ${maskPhone(review.phone)} |\n\n`
    
    // 第二行：项目、产品、金额、美团订单、PFT订单、HLY订单
    md += `| 项目 | 产品 | 金额 | 美团订单 | PFT订单 | HLY订单 |\n`
    md += `| :--- | :--- | :--- | :------- | :------ | :------ |\n`
    md += `| ${review.project || '无'} | ${review.product || '无'} | ¥${(review.amount || 0).toFixed(2)} | ${maskOrderId(review.mtOrderId)} | ${maskOrderId(review.pfOrderId)} | ${maskOrderId(review.hlyOrderId)} |\n\n`
    
    // 第三行：评价类型、PFT取消、HLY取消
    md += `| 评价类型 | PFT取消 | HLY取消 |\n`
    md += `| :------- | :------ | :------ |\n`
    md += `| ${review.reviewType || '无'} | ${review.pfCancelled ? '已取消' : '正常'} | ${review.hlyCancelled ? '已取消' : '正常'} |\n\n`
    
    // 评价内容
    md += `#### 评价内容\n\n`
    md += `${review.reviewContent || '无评价内容'}\n\n`
    
    // 评价截图
    md += `#### 评价截图\n\n`
    if (review.screenshots && review.screenshots.length > 0) {
      review.screenshots.forEach((screenshot, i) => {
        let imgUrl = screenshot.originalPath
        // 确保使用完整的HTTP地址
        if (!imgUrl.startsWith('http')) {
          if (imgUrl.startsWith('/')) {
            imgUrl = baseUrl + imgUrl
          } else {
            imgUrl = baseUrl + '/' + imgUrl
          }
        }
        md += `![截图 ${i + 1}](${imgUrl})\n\n`
      })
    } else if (review.screenshot) {
      let imgUrl = review.screenshot
      // 确保使用完整的HTTP地址
      if (!imgUrl.startsWith('http')) {
        if (imgUrl.startsWith('/')) {
          imgUrl = baseUrl + imgUrl
        } else {
          imgUrl = baseUrl + '/' + imgUrl
        }
      }
      md += `![截图](${imgUrl})\n\n`
    } else {
      md += `无截图\n\n`
    }
    
    md += `---\n\n` // 分隔线
  })
  
  // 添加页脚
  md += `\n\n*报告生成时间: ${new Date().toLocaleString()}*\n`
  
  return md
}
</script>

<style scoped>
.report-container {
  padding: 20px;
}

h2 {
  margin-bottom: 20px;
  color: #303133;
}

.report-form {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  background-color: #fff;
  border-radius: 4px;
}

.report-section {
  margin-top: 30px;
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.report-actions {
  display: flex;
  gap: 10px;
}

h3 {
  margin: 0;
  color: #303133;
}

.report-summary {
  margin-bottom: 20px;
}

.report-charts {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 20px;
}

.chart-item {
  background-color: #fff;
  padding: 20px;
  border-radius: 4px;
}

h4 {
  margin: 0 0 16px;
  color: #303133;
}

.chart {
  height: 300px;
}

:deep(.w-full) {
  width: 100%;
}

.mx-1 {
  margin: 0 4px;
}
</style> 