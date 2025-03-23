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
        <el-button type="primary" @click="handleExport" :loading="exporting">
          导出报表
        </el-button>
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

const router = useRouter()
const formRef = ref(null)
const loading = ref(false)
const exporting = ref(false)
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
    const response = await fetch('/api/reports/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        project: form.project,
        startDate: form.dateRange[0],
        endDate: form.dateRange[1],
        mtScore: form.mtScore
      })
    })

    if (response.status === 401) {
      ElMessage.error('登录已过期，请重新登录')
      localStorage.removeItem('user')
      router.push('/login')
      return
    }

    if (!response.ok) {
      throw new Error('生成失败')
    }

    const data = await response.json()
    if (data.success) {
      ElMessage.success('生成成功')
      reportData.value = data.data
      
      // 初始化图表
      setTimeout(() => {
        initOrderTrendChart(data.data)
      }, 0)
    } else {
      throw new Error(data.message || '生成失败')
    }
  } catch (error) {
    console.error('生成失败:', error)
    ElMessage.error(error.message || '生成失败')
  } finally {
    loading.value = false
  }
}

// 导出报表
const handleExport = async () => {
  if (!checkAuth()) return
  if (!reportData.value) {
    ElMessage.warning('没有可导出的数据')
    return
  }

  try {
    exporting.value = true
    const response = await fetch('/api/reports/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        project: form.project,
        startDate: form.dateRange[0],
        endDate: form.dateRange[1],
        mtScore: form.mtScore,
        reportData: reportData.value
      })
    })

    if (response.status === 401) {
      ElMessage.error('登录已过期，请重新登录')
      localStorage.removeItem('user')
      router.push('/login')
      return
    }

    if (!response.ok) {
      throw new Error('导出失败')
    }

    // 下载文件
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${form.project}评价报表_${form.dateRange[0]}_${form.dateRange[1]}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error(error.message || '导出失败')
  } finally {
    exporting.value = false
  }
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