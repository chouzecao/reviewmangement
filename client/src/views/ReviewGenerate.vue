<template>
  <div class="page-container">
    <div class="page-header">
      <h2>评价生成</h2>
    </div>
    
    <!-- 生成参数表单 -->
    <el-form :model="generateForm" ref="formRef" label-width="120px" class="search-form">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-form-item label="项目选择">
            <el-select v-model="generateForm.project" placeholder="请选择项目">
              <el-option
                v-for="item in projectOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="身份证省份">
            <el-select v-model="generateForm.province" placeholder="请选择省份">
              <el-option label="随机" value="random" />
              <el-option
                v-for="item in provinceOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="生成数量">
            <el-input-number
              v-model="generateForm.count"
              :min="1"
              :max="100"
              controls-position="right"
            />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item>
        <el-button type="primary" @click="handleGenerate" :loading="generating">
          生成记录
        </el-button>
        <el-button @click="resetForm">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- 生成结果表格 -->
    <div v-if="tableData.length > 0" class="table-container">
      <div class="table-operations">
        <el-button
          type="primary"
          :disabled="!selectedRows.length"
          @click="handleImport"
          :loading="importing"
        >
          批量导入评价记录
        </el-button>
      </div>
      
      <el-table
        :data="tableData"
        border
        style="width: 100%"
        @selection-change="handleSelectionChange"
        v-loading="tableLoading"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column label="序号" type="index" width="80" />
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="idCard" label="身份证号码" min-width="200" />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              @click="handleCopy(row)"
            >
              复制
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { generateReviews, importReviews } from '../api/review'
import { provinces } from '../utils/provinces'

const router = useRouter()
const formRef = ref(null)
const generating = ref(false)
const importing = ref(false)
const tableLoading = ref(false)

// 表单数据
const generateForm = reactive({
  project: '无界·长安',
  province: 'random',
  count: 1
})

// 项目选项
const projectOptions = [
  { label: '无界·长安', value: '无界·长安' },
  { label: '兵马俑日游', value: '兵马俑日游' },
  { label: '兵马俑讲解', value: '兵马俑讲解' }
]

// 省份选项
const provinceOptions = provinces

// 表格数据
const tableData = ref([])
const selectedRows = ref([])

// 处理生成记录
const handleGenerate = async () => {
  generating.value = true
  tableLoading.value = true
  try {
    const { data } = await generateReviews({
      project: generateForm.project,
      province: generateForm.province,
      count: generateForm.count
    })
    tableData.value = data
    ElMessage.success(`成功生成${generateForm.count}条记录`)
  } catch (error) {
    console.error('生成失败:', error)
    ElMessage.error(error.response?.data?.message || '生成失败')
  } finally {
    generating.value = false
    tableLoading.value = false
  }
}

// 重置表单
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
  tableData.value = []
  selectedRows.value = []
}

// 处理表格选择
const handleSelectionChange = (rows) => {
  selectedRows.value = rows
}

// 处理批量导入
const handleImport = async () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择要导入的记录')
    return
  }

  importing.value = true
  try {
    await importReviews({
      reviews: selectedRows.value.map(row => ({
        name: row.name,
        idCard: row.idCard,
        project: generateForm.project
      }))
    })
    ElMessage.success('导入成功')
    router.push('/review-manage')
  } catch (error) {
    console.error('导入失败:', error)
    ElMessage.error(error.response?.data?.message || '导入失败')
  } finally {
    importing.value = false
  }
}

// 复制功能
const handleCopy = (row) => {
  const text = `姓名：${row.name}\n身份证号：${row.idCard}`
  navigator.clipboard.writeText(text)
    .then(() => ElMessage.success('复制成功'))
    .catch(() => ElMessage.error('复制失败'))
}
</script>

<style scoped>
.table-container {
  margin-top: 20px;
}

.el-input-number {
  width: 100%;
}
</style> 