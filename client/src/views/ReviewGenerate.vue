<template>
  <!-- No changes to template section -->
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { generateReviews, importReviews } from '../api/review'
import { provinces } from '../utils/provinces'
import { hasToken, getAuthHeaders } from '../utils/token'
import axios from 'axios'

const router = useRouter()
const formRef = ref(null)
const generating = ref(false)
const importing = ref(false)
const tableLoading = ref(false)

// 检查用户是否已登录
onMounted(() => {
  if (!hasToken()) {
    ElMessage.error('登录已过期，请重新登录')
    router.push('/login')
    return
  }
  
  // 打印Token信息用于调试（生产环境可移除）
  console.log('当前Token存在:', hasToken())
})

// 处理生成记录
const handleGenerate = async () => {
  // 再次检查Token
  if (!hasToken()) {
    ElMessage.error('登录已过期，请重新登录')
    router.push('/login')
    return
  }

  generating.value = true
  tableLoading.value = true
  try {
    // 使用直接的axios调用，确保携带Token
    const { data } = await axios.post('/api/reviews/generate', {
      project: generateForm.project,
      province: generateForm.province,
      count: generateForm.count
    }, {
      headers: getAuthHeaders()
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
</script>

<style>
  /* No changes to style section */
</style> 