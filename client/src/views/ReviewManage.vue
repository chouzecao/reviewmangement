<template>
  <div class="page-container">
    <div class="page-header">
      <h2>评价管理</h2>
    </div>

    <!-- 搜索表单 -->
    <el-form :model="searchForm" ref="searchForm" class="search-form" label-width="100px">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-form-item label="下单日期">
            <el-date-picker
              v-model="searchForm.orderDate"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="出行日期">
            <el-date-picker
              v-model="searchForm.travelDate"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="预订人姓名">
            <el-input v-model="searchForm.customerName" placeholder="请输入预订人姓名" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="8">
          <el-form-item label="身份证号">
            <el-input v-model="searchForm.customerId" placeholder="请输入身份证号" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="订单号">
            <el-input v-model="searchForm.orderId" placeholder="票付通/美团/惠旅云订单号" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="取消状态">
            <el-select v-model="searchForm.cancelStatus" placeholder="请选择取消状态">
              <el-option label="全部" value="" />
              <el-option label="票付通待取消" value="pft_pending" />
              <el-option label="票付通已取消" value="pft_cancelled" />
              <el-option label="惠旅云待取消" value="hly_pending" />
              <el-option label="惠旅云已取消" value="hly_cancelled" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item>
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button @click="resetSearch">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- 操作按钮 -->
    <div class="table-operations">
      <el-button
        type="primary"
        :disabled="!selectedRows.length"
        @click="handleExport"
        :loading="exporting"
      >
        导出选中记录
      </el-button>
      <el-button
        type="danger"
        :disabled="!selectedRows.length"
        @click="handleBatchDelete"
      >
        批量删除
      </el-button>
    </div>

    <!-- 数据表格 -->
    <el-table
      :data="tableData"
      border
      style="width: 100%"
      v-loading="loading"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="55" />
      <el-table-column label="序号" type="index" width="80" />
      <el-table-column prop="orderDate" label="下单日期" width="100">
        <template #default="{ row }">
          {{ formatDate(row.orderDate) }}
        </template>
      </el-table-column>
      <el-table-column prop="customerName" label="预订人姓名" width="120" />
      <el-table-column prop="customerId" label="身份证号" width="180" />
      <el-table-column prop="project" label="预订产品" width="120" />
      <el-table-column prop="amount" label="金额" width="100">
        <template #default="{ row }">
          ¥{{ row.amount.toFixed(2) }}
        </template>
      </el-table-column>
      <el-table-column prop="travelDate" label="出行日期" width="100">
        <template #default="{ row }">
          {{ formatDate(row.travelDate) }}
        </template>
      </el-table-column>
      <el-table-column prop="reviewDate" label="出评日期" width="100">
        <template #default="{ row }">
          {{ formatDate(row.reviewDate) }}
        </template>
      </el-table-column>
      <el-table-column prop="reviewType" label="出评类型" width="100" />
      <el-table-column prop="phone" label="手机号" width="120" />
      <el-table-column prop="pfOrderId" label="票付通订单号" width="150" />
      <el-table-column prop="mtOrderId" label="美团订单号" width="150" />
      <el-table-column prop="hlyOrderId" label="惠旅云订单号" width="150" />
      <el-table-column label="票付通取消" width="100">
        <template #default="{ row }">
          <el-tag :type="row.pfCancelled ? 'danger' : 'info'">
            {{ row.pfCancelled ? '已取消' : '待取消' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="惠旅云取消" width="100">
        <template #default="{ row }">
          <el-tag :type="row.hlyCancelled ? 'danger' : 'info'">
            {{ row.hlyCancelled ? '已取消' : '待取消' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" fixed="right" width="200">
        <template #default="{ row }">
          <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
          <el-button link type="primary" @click="handleView(row)">查看</el-button>
          <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-container">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 编辑/查看对话框 -->
    <el-dialog
      :title="dialogType === 'edit' ? '编辑评价记录' : '查看评价记录'"
      v-model="dialogVisible"
      width="800px"
    >
      <el-form
        :model="formData"
        :rules="formRules"
        ref="formRef"
        label-width="120px"
        :disabled="dialogType === 'view'"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="下单日期" prop="orderDate">
              <el-date-picker
                v-model="formData.orderDate"
                type="date"
                placeholder="选择下单日期"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="预订人姓名" prop="customerName">
              <el-input v-model="formData.customerName" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="身份证号" prop="customerId">
              <el-input v-model="formData.customerId" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="预订产品" prop="project">
              <el-select v-model="formData.project">
                <el-option label="无界·长安" value="无界·长安" />
                <el-option label="兵马俑日游" value="兵马俑日游" />
                <el-option label="兵马俑讲解" value="兵马俑讲解" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="金额" prop="amount">
              <el-input-number v-model="formData.amount" :precision="2" :step="0.01" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="手机号" prop="phone">
              <el-input v-model="formData.phone" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="出行日期" prop="travelDate">
              <el-date-picker
                v-model="formData.travelDate"
                type="date"
                placeholder="选择出行日期"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="出评日期" prop="reviewDate">
              <el-date-picker
                v-model="formData.reviewDate"
                type="date"
                placeholder="选择出评日期"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="出评类型" prop="reviewType">
              <el-select v-model="formData.reviewType">
                <el-option label="5分" value="5分" />
                <el-option label="分+字" value="分+字" />
                <el-option label="分+字图" value="分+字图" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="好评内容" prop="reviewContent">
              <el-input
                v-model="formData.reviewContent"
                type="textarea"
                :rows="2"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="票付通订单号" prop="pfOrderId">
              <el-input v-model="formData.pfOrderId" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="美团订单号" prop="mtOrderId">
              <el-input v-model="formData.mtOrderId" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="惠旅云订单号" prop="hlyOrderId">
              <el-input v-model="formData.hlyOrderId" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="票付通取消" prop="pfCancelled">
              <el-switch v-model="formData.pfCancelled" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="惠旅云取消" prop="hlyCancelled">
              <el-switch v-model="formData.hlyCancelled" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="出评截图" prop="screenshot">
          <el-upload
            class="screenshot-uploader"
            action="/api/upload"
            :show-file-list="false"
            :before-upload="beforeScreenshotUpload"
            :on-success="handleScreenshotSuccess"
          >
            <img v-if="formData.screenshot" :src="formData.screenshot" class="screenshot" />
            <el-icon v-else class="screenshot-uploader-icon"><Plus /></el-icon>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button
            v-if="dialogType === 'edit'"
            type="primary"
            @click="handleSave"
            :loading="saving"
          >
            保存
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import dayjs from 'dayjs'

// 状态变量
const loading = ref(false)
const exporting = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const dialogType = ref('edit')
const searchForm = reactive({
  orderDate: [],
  travelDate: [],
  customerName: '',
  customerId: '',
  orderId: '',
  cancelStatus: ''
})

// 表格数据
const tableData = ref([])
const selectedRows = ref([])

// 分页数据
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 表单数据
const formRef = ref(null)
const formData = reactive({
  orderDate: '',
  customerName: '',
  customerId: '',
  project: '',
  amount: 0,
  travelDate: '',
  reviewDate: '',
  reviewType: '',
  reviewContent: '',
  phone: '',
  pfOrderId: '',
  mtOrderId: '',
  hlyOrderId: '',
  pfCancelled: false,
  hlyCancelled: false,
  screenshot: ''
})

// 表单验证规则
const formRules = {
  orderDate: [{ required: true, message: '请选择下单日期', trigger: 'change' }],
  customerName: [{ required: true, message: '请输入预订人姓名', trigger: 'blur' }],
  customerId: [{ required: true, message: '请输入身份证号', trigger: 'blur' }],
  project: [{ required: true, message: '请选择预订产品', trigger: 'change' }],
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }]
}

// 格式化日期
const formatDate = (date) => {
  if (!date) return ''
  return dayjs(date).format('YYYY-MM-DD')
}

// 获取列表数据
const fetchData = async () => {
  loading.value = true
  try {
    // TODO: 调用后端API获取数据
    const response = await fetch('/api/reviews?' + new URLSearchParams({
      page: pagination.page,
      limit: pagination.pageSize,
      ...buildSearchParams()
    }))
    const data = await response.json()
    tableData.value = data.reviews
    pagination.total = data.pagination.total
  } catch (error) {
    console.error('获取数据失败:', error)
    ElMessage.error('获取数据失败')
  } finally {
    loading.value = false
  }
}

// 构建搜索参数
const buildSearchParams = () => {
  const params = {}
  if (searchForm.orderDate?.length === 2) {
    params.orderDateStart = searchForm.orderDate[0]
    params.orderDateEnd = searchForm.orderDate[1]
  }
  if (searchForm.travelDate?.length === 2) {
    params.travelDateStart = searchForm.travelDate[0]
    params.travelDateEnd = searchForm.travelDate[1]
  }
  if (searchForm.customerName) params.customerName = searchForm.customerName
  if (searchForm.customerId) params.customerId = searchForm.customerId
  if (searchForm.orderId) params.orderId = searchForm.orderId
  if (searchForm.cancelStatus) params.cancelStatus = searchForm.cancelStatus
  return params
}

// 处理搜索
const handleSearch = () => {
  pagination.page = 1
  fetchData()
}

// 重置搜索
const resetSearch = () => {
  Object.keys(searchForm).forEach(key => {
    searchForm[key] = Array.isArray(searchForm[key]) ? [] : ''
  })
  handleSearch()
}

// 处理表格选择
const handleSelectionChange = (rows) => {
  selectedRows.value = rows
}

// 处理分页
const handleSizeChange = (val) => {
  pagination.pageSize = val
  fetchData()
}

const handlePageChange = (val) => {
  pagination.page = val
  fetchData()
}

// 处理编辑
const handleEdit = (row) => {
  dialogType.value = 'edit'
  Object.assign(formData, row)
  dialogVisible.value = true
}

// 处理查看
const handleView = (row) => {
  dialogType.value = 'view'
  Object.assign(formData, row)
  dialogVisible.value = true
}

// 处理删除
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除这条记录吗？', '提示', {
      type: 'warning'
    })
    // TODO: 调用后端API删除记录
    await fetch(`/api/reviews/${row._id}`, { method: 'DELETE' })
    ElMessage.success('删除成功')
    fetchData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 处理批量删除
const handleBatchDelete = async () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择要删除的记录')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRows.value.length} 条记录吗？`,
      '提示',
      { type: 'warning' }
    )
    // TODO: 调用后端API批量删除记录
    await fetch('/api/reviews/batch', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids: selectedRows.value.map(row => row._id)
      })
    })
    ElMessage.success('删除成功')
    fetchData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 处理导出
const handleExport = async () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择要导出的记录')
    return
  }

  exporting.value = true
  try {
    const response = await fetch('/api/reviews/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids: selectedRows.value.map(row => row._id)
      })
    })

    if (!response.ok) throw new Error('导出失败')

    // 获取文件名
    const contentDisposition = response.headers.get('content-disposition')
    const fileName = contentDisposition
      ? decodeURIComponent(contentDisposition.split('filename=')[1])
      : '评价记录.xlsx'

    // 下载文件
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(link)

    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  } finally {
    exporting.value = false
  }
}

// 处理保存
const handleSave = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    saving.value = true

    // TODO: 调用后端API保存记录
    const method = formData._id ? 'PUT' : 'POST'
    const url = formData._id ? `/api/reviews/${formData._id}` : '/api/reviews'
    
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })

    ElMessage.success('保存成功')
    dialogVisible.value = false
    fetchData()
  } catch (error) {
    if (error.name === 'ValidationError') return
    console.error('保存失败:', error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

// 上传截图相关
const beforeScreenshotUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isImage) {
    ElMessage.error('只能上传图片文件')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('图片大小不能超过 2MB')
    return false
  }
  return true
}

const handleScreenshotSuccess = (response) => {
  formData.screenshot = response.url
  ElMessage.success('上传成功')
}

// 初始化
onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.screenshot-uploader {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  width: 178px;
  height: 178px;
}

.screenshot-uploader:hover {
  border-color: #409EFF;
}

.screenshot-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 178px;
  height: 178px;
  line-height: 178px;
  text-align: center;
}

.screenshot {
  width: 178px;
  height: 178px;
  display: block;
  object-fit: cover;
}
</style> 