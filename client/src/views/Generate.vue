<template>
  <div class="generate-container">
    <h2>评价生成</h2>

    <!-- 生成表单 -->
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="120px"
      class="generate-form"
    >
      <el-form-item label="项目" prop="project">
        <el-select
          v-model="form.project"
          placeholder="请选择项目"
          filterable
          allow-create
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

      <el-form-item label="省份" prop="province">
        <el-select
          v-model="form.province"
          placeholder="请选择省份"
          class="w-full"
        >
          <el-option label="随机" value="random" />
          <el-option
            v-for="item in provinceOptions"
            :key="item.code"
            :label="item.name"
            :value="item.code"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="生成数量" prop="count">
        <el-input-number
          v-model="form.count"
          :min="1"
          :max="100"
          class="w-full"
        />
      </el-form-item>

      <el-form-item>
        <el-button type="primary" @click="handleGenerate" :loading="loading">
          生成评价
        </el-button>
      </el-form-item>
    </el-form>

    <!-- 预览表格 -->
    <div v-if="tableData.length > 0" class="preview-section">
      <div class="preview-header">
        <h3>预览数据</h3>
        <el-button type="primary" @click="handleImport" :loading="importing">
          导入数据
        </el-button>
      </div>

      <el-table
        :data="tableData"
        border
        style="width: 100%"
        height="400"
      >
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="customerName" label="预订人姓名" width="100" />
        <el-table-column prop="customerId" label="预订人身份证号" width="180" />
        <el-table-column prop="project" label="预订产品" width="120" />
        <el-table-column prop="amount" label="金额" width="100">
          <template #default="{ row }">
            {{ row.amount?.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="reviewType" label="出评类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getReviewTypeTag(row.reviewType)">
              {{ row.reviewType }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="reviewContent" label="好评内容" min-width="200" show-overflow-tooltip />
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()
const formRef = ref(null)
const loading = ref(false)
const importing = ref(false)
const tableData = ref([])

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

// 省份选项
const provinceOptions = [
  { code: '11', name: '北京市' },
  { code: '31', name: '上海市' },
  { code: '32', name: '江苏省' },
  { code: '33', name: '浙江省' },
  { code: '34', name: '安徽省' },
  { code: '35', name: '福建省' },
  { code: '36', name: '江西省' },
  { code: '37', name: '山东省' },
  { code: '41', name: '河南省' },
  { code: '42', name: '湖北省' },
  { code: '43', name: '湖南省' },
  { code: '44', name: '广东省' },
  { code: '45', name: '广西壮族自治区' },
  { code: '46', name: '海南省' },
  { code: '50', name: '重庆市' },
  { code: '51', name: '四川省' },
  { code: '52', name: '贵州省' },
  { code: '53', name: '云南省' },
  { code: '61', name: '陕西省' },
  { code: '62', name: '甘肃省' },
  { code: '63', name: '青海省' },
  { code: '64', name: '宁夏回族自治区' },
  { code: '65', name: '新疆维吾尔自治区' }
]

// 表单数据
const form = reactive({
  project: '无界·长安',
  province: 'random',
  count: 1
})

// 表单验证规则
const rules = {
  project: [
    { required: true, message: '请选择项目', trigger: 'change' }
  ],
  province: [
    { required: true, message: '请选择省份', trigger: 'change' }
  ],
  count: [
    { required: true, message: '请输入生成数量', trigger: 'blur' },
    { type: 'number', min: 1, max: 100, message: '数量必须在1-100之间', trigger: 'blur' }
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

// 生成评价
const handleGenerate = async () => {
  if (!checkAuth()) return
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    
    loading.value = true
    const response = await fetch('/api/reviews/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(form)
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
      tableData.value = data.data
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

// 导入数据
const handleImport = async () => {
  if (!checkAuth()) return
  if (tableData.value.length === 0) {
    ElMessage.warning('没有可导入的数据')
    return
  }

  try {
    importing.value = true
    const response = await fetch('/api/reviews/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        reviews: tableData.value
      })
    })

    if (response.status === 401) {
      ElMessage.error('登录已过期，请重新登录')
      localStorage.removeItem('user')
      router.push('/login')
      return
    }

    if (!response.ok) {
      throw new Error('导入失败')
    }

    const data = await response.json()
    if (data.success) {
      ElMessage.success('导入成功')
      tableData.value = []
      form.count = 10
    } else {
      throw new Error(data.message || '导入失败')
    }
  } catch (error) {
    console.error('导入失败:', error)
    ElMessage.error(error.message || '导入失败')
  } finally {
    importing.value = false
  }
}
</script>

<style scoped>
.generate-container {
  padding: 20px;
}

h2 {
  margin-bottom: 20px;
  color: #303133;
}

.generate-form {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  background-color: #fff;
  border-radius: 4px;
}

.preview-section {
  margin-top: 30px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

h3 {
  margin: 0;
  color: #303133;
}

:deep(.w-full) {
  width: 100%;
}

:deep(.el-input-number.w-full) {
  width: 100%;
}
</style> 