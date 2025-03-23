<template>
  <div class="manage-container">
    <h2>评价管理</h2>
    
    <!-- 搜索表单 -->
    <el-form :model="searchForm" class="search-form">
      <div class="search-form-grid">
        <el-form-item label="项目">
          <el-select v-model="searchForm.project" placeholder="请选择项目" clearable class="w-full">
            <el-option
              v-for="item in projectOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="客户姓名">
          <el-input v-model="searchForm.customerName" placeholder="请输入客户姓名" clearable />
        </el-form-item>

        <el-form-item label="身份证号">
          <el-input v-model="searchForm.customerId" placeholder="请输入身份证号" clearable />
        </el-form-item>

        <el-form-item label="下单日期">
          <el-date-picker
            v-model="searchForm.orderDate"
            type="date"
            placeholder="请选择下单日期"
            value-format="YYYY-MM-DD"
            clearable
            class="w-full"
          />
        </el-form-item>

        <el-form-item label="出行日期">
          <el-date-picker
            v-model="searchForm.travelDate"
            type="date"
            placeholder="请选择出行日期"
            value-format="YYYY-MM-DD"
            clearable
            class="w-full"
          />
        </el-form-item>

        <el-form-item label="出评日期">
          <el-date-picker
            v-model="searchForm.reviewDate"
            type="date"
            placeholder="请选择出评日期"
            value-format="YYYY-MM-DD"
            clearable
            class="w-full"
          />
        </el-form-item>

        <el-form-item label="出评类型">
          <el-select v-model="searchForm.reviewType" placeholder="请选择出评类型" clearable class="w-full">
            <el-option label="5分" value="5分" />
            <el-option label="分+字" value="分+字" />
            <el-option label="分+字图" value="分+字图" />
          </el-select>
        </el-form-item>

        <el-form-item label="手机号">
          <el-input v-model="searchForm.phone" placeholder="请输入手机号" clearable />
        </el-form-item>

        <el-form-item label="票付通订单号">
          <el-input v-model="searchForm.pfOrderId" placeholder="请输入票付通订单号" clearable />
        </el-form-item>

        <el-form-item label="美团订单号">
          <el-input v-model="searchForm.mtOrderId" placeholder="请输入美团订单号" clearable />
        </el-form-item>

        <el-form-item label="惠旅云订单号">
          <el-input v-model="searchForm.hlyOrderId" placeholder="请输入惠旅云订单号" clearable />
        </el-form-item>

        <el-form-item label="票付通取消">
          <el-select v-model="searchForm.pfCancelled" placeholder="请选择状态" clearable class="w-full">
            <el-option :label="'已取消'" :value="true" />
            <el-option :label="'未取消'" :value="false" />
          </el-select>
        </el-form-item>

        <el-form-item label="惠旅云取消">
          <el-select v-model="searchForm.hlyCancelled" placeholder="请选择状态" clearable class="w-full">
            <el-option :label="'已取消'" :value="true" />
            <el-option :label="'未取消'" :value="false" />
          </el-select>
        </el-form-item>
      </div>

      <div class="search-form-buttons">
        <el-button type="primary" @click="handleSearch">查询</el-button>
        <el-button @click="handleReset">重置</el-button>
      </div>
    </el-form>

    <!-- 数据表格 -->
    <el-table
      v-loading="loading"
      :data="tableData"
      border
      style="width: 100%"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="55" />
      <el-table-column type="index" label="序号" width="60" align="center" />
      <el-table-column prop="orderDate" label="下单日期" width="120">
        <template #default="{ row }">
          {{ formatDate(row.orderDate) }}
        </template>
      </el-table-column>
      <el-table-column prop="customerName" label="预订人姓名" width="100" />
      <el-table-column prop="customerId" label="预订人身份证号" width="180" />
      <el-table-column prop="project" label="项目" width="120" />
      <el-table-column prop="product" label="预订产品" width="200" />
      <el-table-column prop="amount" label="金额" width="100">
        <template #default="{ row }">
          {{ row.amount?.toFixed(2) }}
        </template>
      </el-table-column>
      <el-table-column prop="travelDate" label="出行日期" width="120">
        <template #default="{ row }">
          {{ formatDate(row.travelDate) }}
        </template>
      </el-table-column>
      <el-table-column prop="reviewDate" label="出评日期" width="120">
        <template #default="{ row }">
          {{ formatDate(row.reviewDate) }}
        </template>
      </el-table-column>
      <el-table-column prop="reviewType" label="出评类型" width="100">
        <template #default="{ row }">
          <el-tag :type="getReviewTypeTag(row.reviewType)">{{ row.reviewType }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="reviewContent" label="好评内容" min-width="200" show-overflow-tooltip />
      <el-table-column prop="phone" label="手机号" width="120" />
      <el-table-column prop="pfOrderId" label="票付通订单号" width="150" />
      <el-table-column prop="mtOrderId" label="美团订单号" width="150" />
      <el-table-column prop="hlyOrderId" label="惠旅云订单号" width="120" />
      <el-table-column prop="pfCancelled" label="票付通取消" width="90">
        <template #default="{ row }">
          <el-tag :type="row.pfCancelled ? 'danger' : 'success'">
            {{ row.pfCancelled ? '已取消' : '待取消' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="hlyCancelled" label="惠旅云取消" width="90">
        <template #default="{ row }">
          <el-tag :type="row.hlyCancelled ? 'danger' : 'success'">
            {{ row.hlyCancelled ? '已取消' : '待取消' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="screenshot" label="出评截图" width="80">
        <template #default="{ row }">
          <!-- 优先显示新的多图截图 -->
          <div v-if="row.screenshots && row.screenshots.length > 0" class="screenshot-thumbnails">
            <img 
              v-for="(item, index) in row.screenshots" 
              :key="index" 
              :src="item.thumbnail50Path" 
              class="screenshot-thumb"
              @click="previewImage(item.originalPath)"
            />
          </div>
          <!-- 兼容旧的单图模式 -->
          <template v-else-if="row.screenshot">
            <el-image
              :src="row.screenshot"
              :preview-src-list="[row.screenshot]"
              class="screenshot-thumb"
            />
          </template>
          <span v-else class="image-error">无</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 工具栏 -->
    <div class="table-toolbar">
      <el-button
        type="danger"
        :disabled="selectedRows.length === 0"
        @click="handleBatchDelete"
      >
        批量删除
      </el-button>
      <el-button
        type="primary"
        :disabled="selectedRows.length === 0"
        @click="handleExport"
      >
        导出选中
      </el-button>
    </div>

    <!-- 分页 -->
    <div class="pagination-container">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="60%"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120px"
        class="edit-form"
      >
        <el-form-item label="下单日期" prop="orderDate">
          <el-date-picker
            v-model="form.orderDate"
            type="datetime"
            placeholder="选择下单日期"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
        <el-form-item label="预订人姓名" prop="customerName">
          <el-input v-model="form.customerName" />
        </el-form-item>
        <el-form-item label="预订人身份证号" prop="customerId">
          <el-input v-model="form.customerId" />
        </el-form-item>
        <el-form-item label="项目" prop="project">
          <el-select
            v-model="form.project"
            placeholder="请选择项目"
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
        <el-form-item label="预订产品" prop="product">
          <el-input v-model="form.product" placeholder="请输入预订产品名称" />
        </el-form-item>
        <el-form-item label="金额" prop="amount">
          <el-input-number v-model="form.amount" :precision="2" :step="0.01" />
        </el-form-item>
        <el-form-item label="出行日期" prop="travelDate">
          <el-date-picker
            v-model="form.travelDate"
            type="date"
            placeholder="选择出行日期"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="出评日期" prop="reviewDate">
          <el-date-picker
            v-model="form.reviewDate"
            type="date"
            placeholder="选择出评日期"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="出评类型" prop="reviewType">
          <el-select v-model="form.reviewType" placeholder="请选择出评类型">
            <el-option label="5分" value="5分" />
            <el-option label="分+字" value="分+字" />
            <el-option label="分+字图" value="分+字图" />
          </el-select>
        </el-form-item>
        <el-form-item label="好评内容" prop="reviewContent">
          <el-input
            v-model="form.reviewContent"
            type="textarea"
            :rows="3"
            placeholder="请输入好评内容"
          />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" />
        </el-form-item>
        <el-form-item label="票付通订单号" prop="pfOrderId">
          <el-input v-model="form.pfOrderId" />
        </el-form-item>
        <el-form-item label="美团订单号" prop="mtOrderId">
          <el-input v-model="form.mtOrderId" />
        </el-form-item>
        <el-form-item label="惠旅云订单号" prop="hlyOrderId">
          <el-input v-model="form.hlyOrderId" />
        </el-form-item>
        <el-form-item label="票付通取消" prop="pfCancelled">
          <el-switch
            v-model="form.pfCancelled"
            :active-text="'已取消'"
            :inactive-text="'待取消'"
          />
        </el-form-item>
        <el-form-item label="惠旅云取消" prop="hlyCancelled">
          <el-switch
            v-model="form.hlyCancelled"
            :active-text="'已取消'"
            :inactive-text="'待取消'"
          />
        </el-form-item>
        <el-form-item label="出评截图">
          <div v-if="form.screenshot && !form.screenshots?.length" class="screenshot-container mb-3">
            <img :src="form.screenshot" class="screenshot" @click="previewImage(form.screenshot)" />
            <div class="screenshot-path">{{form.screenshot}}</div>
          </div>
          
          <div v-if="form.screenshots && form.screenshots.length > 0" class="screenshots-container mb-3">
            <div v-for="(item, index) in form.screenshots" :key="index" class="screenshot-item">
              <div class="screenshot-preview" @click="previewImage(item.originalPath)">
                <img :src="item.thumbnail80Path" class="thumbnail" />
                <div class="delete-icon" @click.stop="handleDeleteScreenshot(item._id)">
                  <el-icon><Delete /></el-icon>
                </div>
              </div>
              <div class="screenshot-path">{{item.originalPath}}</div>
            </div>
          </div>
          
          <el-upload
            class="screenshot-uploader"
            :headers="uploadHeaders"
            :show-file-list="false"
            :before-upload="beforeUpload"
            :multiple="true"
            :disabled="!form._id"
            name="screenshot"
            :http-request="customUpload"
          >
            <div class="upload-trigger">
              <el-icon class="upload-icon"><Plus /></el-icon>
              <span>上传截图</span>
            </div>
          </el-upload>
          
          <el-alert
            v-if="!form._id"
            type="warning"
            show-icon
            :closable="false"
            title="请先保存评价记录，然后才能上传截图"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSave">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Picture, Plus, Delete } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { 
  getReviews, 
  updateReview, 
  deleteReview, 
  uploadScreenshot, 
  createReview, 
  getReviewDetail,
  batchDeleteReviews,
  exportReviews,
  deleteScreenshot
} from '@/api/review'

const router = useRouter()
const formRef = ref(null)
const dialogVisible = ref(false)
const dialogTitle = ref('')
const projectOptions = [
  { label: '无界·长安', value: '无界·长安' },
  { label: '兵马俑日游', value: '兵马俑日游' },
  { label: '兵马俑讲解', value: '兵马俑讲解' }
]

// 搜索表单
const searchForm = reactive({
  project: '无界·长安',
  customerName: '',
  customerId: '',
  orderDate: null,
  travelDate: null,
  reviewDate: null,
  reviewType: '',
  phone: '',
  pfOrderId: '',
  mtOrderId: '',
  hlyOrderId: '',
  pfCancelled: null,
  hlyCancelled: null
})

// 编辑表单
const form = reactive({
  orderDate: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  customerName: '',
  customerId: '',
  project: '无界·长安',
  product: '',
  amount: 0,
  travelDate: '',
  reviewDate: '',
  reviewType: '5分',
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
const rules = {
  customerName: [{ required: true, message: '请输入预订人姓名', trigger: 'blur' }],
  customerId: [{ required: true, message: '请输入预订人身份证号', trigger: 'blur' }],
  project: [{ required: true, message: '请选择项目', trigger: 'change' }],
  product: [{ required: true, message: '请输入预订产品', trigger: 'blur' }],
  reviewType: [{ required: true, message: '请选择出评类型', trigger: 'change' }]
}

// 表格数据
const loading = ref(false)
const tableData = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const selectedRows = ref([])

// 格式化日期
const formatDate = (date) => {
  if (!date) return ''
  return dayjs(date).format('YYYY-MM-DD')
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

// 查询数据
const fetchData = async () => {
  if (!checkAuth()) return

  try {
    loading.value = true
    // 过滤掉空值参数
    const params = {
      page: currentPage.value,
      limit: pageSize.value
    }
    
    Object.entries(searchForm).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        params[key] = value
      }
    })

    // 使用我们的API方法替代fetch
    const data = await getReviews(params)
    tableData.value = data.reviews || []
    total.value = data.pagination?.total || 0
  } catch (error) {
    console.error('获取数据失败:', error)
    ElMessage.error(error.message || '获取数据失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  currentPage.value = 1
  fetchData()
}

// 重置
const handleReset = () => {
  Object.keys(searchForm).forEach(key => {
    if (['orderDate', 'travelDate', 'reviewDate'].includes(key)) {
      searchForm[key] = null
    } else if (['pfCancelled', 'hlyCancelled'].includes(key)) {
      searchForm[key] = null
    } else {
      searchForm[key] = ''
    }
  })
  currentPage.value = 1
  fetchData()
}

// 分页
const handleSizeChange = (val) => {
  pageSize.value = val
  fetchData()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchData()
}

// 编辑
const handleEdit = async (row) => {
  if (!checkAuth()) return

  dialogTitle.value = '编辑评价记录'

  try {
    loading.value = true
    const response = await getReviewDetail(row._id)
    const reviewData = response.data  // 获取响应中的data字段
    
    console.log('获取到的评价详情:', reviewData)  // 添加调试信息
    
    // 重置表单
    Object.keys(form).forEach(key => {
      if (reviewData[key] !== undefined) {
        form[key] = reviewData[key]
      }
    })
    
    form._id = reviewData._id
    
    // 修复日期格式
    if (reviewData.orderDate) {
      form.orderDate = dayjs(reviewData.orderDate).format('YYYY-MM-DD HH:mm:ss')
    }
    
    if (reviewData.travelDate) {
      form.travelDate = dayjs(reviewData.travelDate).format('YYYY-MM-DD')
    }
    
    if (reviewData.reviewDate) {
      form.reviewDate = dayjs(reviewData.reviewDate).format('YYYY-MM-DD')
    }
    
    // 确保screenshots存在
    form.screenshots = reviewData.screenshots || []
    form.screenshot = reviewData.screenshot || ''
    
    console.log('处理后的表单数据:', JSON.stringify(form, null, 2))  // 添加调试信息
    
    loading.value = false
    dialogVisible.value = true
  } catch (error) {
    console.error('获取数据失败:', error)
    ElMessage.error(error.message || '获取数据失败')
    loading.value = false
  }
}

// 删除
const handleDelete = async (row) => {
  if (!checkAuth()) return

  try {
    await ElMessageBox.confirm('确定要删除这条记录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await deleteReview(row._id)
    ElMessage.success('删除成功')
    fetchData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error(error.message || '删除失败')
    }
  }
}

// 保存
const handleSave = async () => {
  if (!checkAuth()) return
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    
    // 创建要提交的表单数据（排除screenshots，它通过单独的API处理）
    const submitData = { ...form }
    delete submitData.screenshots
    
    if (form._id) {
      // 更新
      await updateReview(form._id, submitData)
    } else {
      // 新建 - 需要在review.js中添加createReview方法
      await createReview(submitData)
    }
    
    ElMessage.success('保存成功')
    dialogVisible.value = false
    fetchData()
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error(error.message || '保存失败')
  }
}

// 上传相关
const uploadHeaders = computed(() => {
  const user = localStorage.getItem('user')
  return user ? { Authorization: `Bearer ${user}` } : {}
})

// 自定义上传方法
const customUpload = async (options) => {
  try {
    if (!form._id) {
      ElMessage.warning('请先保存评价记录，然后才能上传截图')
      return
    }

    const formData = new FormData()
    formData.append('screenshot', options.file)
    
    const response = await uploadScreenshot(form._id, formData)
    handleUploadSuccess(response, options.file)
  } catch (error) {
    handleUploadError(error)
  }
}

const beforeUpload = (file) => {
  // 检查用户是否登录
  if (!checkAuth()) return false

  // 检查表单是否已保存（有ID）
  if (!form._id) {
    ElMessage.warning('请先保存评价记录，然后才能上传截图')
    return false
  }
  
  // 校验文件类型
  const isImage = ['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)
  if (!isImage) {
    ElMessage.error('只能上传JPG/JPEG/PNG格式的图片!')
    return false
  }
  
  // 校验文件大小
  const isLt5M = file.size / 1024 / 1024 < 5
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过5MB!')
    return false
  }
  
  return true
}

const handleUploadSuccess = (response, uploadFile) => {
  if (response && response.success) {
    ElMessage.success('上传截图成功')
    
    if (!form.screenshots) {
      form.screenshots = []
    }
    
    form.screenshots.push(response.data)
    
    // 刷新列表数据
    fetchData()
  } else {
    ElMessage.error((response && response.message) || '上传失败')
  }
}

const handleUploadError = (err) => {
  console.error('上传失败:', err)
  ElMessage.error(err.message || '上传截图失败，请检查网络或联系管理员')
}

// 表格多选
const handleSelectionChange = (rows) => {
  selectedRows.value = rows
}

// 批量删除
const handleBatchDelete = async () => {
  if (!checkAuth()) return
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请至少选择一条记录')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRows.value.length} 条记录吗？此操作不可恢复！`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const ids = selectedRows.value.map(row => row._id)
    await batchDeleteReviews(ids)
    
    ElMessage.success('批量删除成功')
    selectedRows.value = []
    fetchData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
      ElMessage.error(error.message || '批量删除失败')
    }
  }
}

// 导出选中记录
const handleExport = async () => {
  if (!checkAuth()) return
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请至少选择一条记录')
    return
  }

  try {
    const ids = selectedRows.value.map(row => row._id)
    const response = await exportReviews(ids)
    
    // 下载文件
    const blob = new Blob([response], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', '评价记录.xlsx')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error(error.message || '导出失败')
  }
}

// 删除截图
const handleDeleteScreenshot = async (screenshotId) => {
  // 确保截图ID是有效的
  if (!screenshotId) {
    console.error('删除截图失败: 无效的截图ID')
    ElMessage.error('删除截图失败: 无效的截图ID')
    return
  }

  try {
    await ElMessageBox.confirm('确定要删除这张截图吗?', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await deleteScreenshot(form._id, screenshotId)
    
    ElMessage.success('删除截图成功')
    
    const index = form.screenshots.findIndex(item => item._id === screenshotId)
    if (index !== -1) {
      form.screenshots.splice(index, 1)
    }
    
    fetchData()
  } catch (error) {
    if (error.message !== 'cancel') {
      ElMessage.error(error.message || '删除截图失败')
    }
  }
}

// 预览图片
const previewImage = (url) => {
  if (!url) return
  
  window.open(url, '_blank')
}

// 组件挂载时检查登录状态并加载数据
onMounted(() => {
  if (checkAuth()) {
    fetchData()
  }
})
</script>

<style scoped>
.manage-container {
  padding: 20px;
}

h2 {
  margin-bottom: 20px;
  color: #303133;
}

.search-form {
  margin-bottom: 20px;
  padding: 20px;
  background-color: #fff;
  border-radius: 4px;
}

.search-form-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.search-form-buttons {
  margin-top: 20px;
  display: flex;
  justify-content: center;
  gap: 10px;
}

:deep(.el-form-item) {
  margin-bottom: 0;
}

:deep(.el-form-item__content) {
  width: calc(100% - 100px);
}

:deep(.el-select),
:deep(.el-date-picker) {
  width: 100%;
}

:deep(.el-input) {
  width: 100%;
}

:deep(.w-full) {
  width: 100%;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.edit-form {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 20px;
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
  text-align: center;
  line-height: 178px;
}

.screenshot {
  width: 178px;
  height: 178px;
  display: block;
  object-fit: cover;
}

.screenshot-thumb {
  width: 50px;
  height: 50px;
  cursor: pointer;
}

.image-error {
  width: 50px;
  height: 50px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f5f7fa;
  color: #909399;
}

.table-toolbar {
  margin: 16px 0;
  display: flex;
  gap: 10px;
}

.screenshot-container {
  display: flex;
  align-items: center;
}

.screenshot-path {
  margin-left: 10px;
  color: #606266;
}

.screenshots-container {
  display: flex;
  flex-wrap: wrap;
}

.screenshot-item {
  width: calc(33.33% - 10px);
  margin-right: 10px;
  margin-bottom: 10px;
}

.screenshot-preview {
  position: relative;
}

.thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.delete-icon {
  position: absolute;
  top: 5px;
  right: 5px;
  cursor: pointer;
}

.upload-trigger {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.upload-icon {
  font-size: 24px;
  color: #8c939d;
}
</style> 