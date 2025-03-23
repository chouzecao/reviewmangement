import axios from 'axios'

// 使用环境变量或自动检测API地址
const apiUrl = import.meta.env.VITE_API_URL || '/api'
const baseURL = apiUrl

const instance = axios.create({
  baseURL,
  timeout: 10000,
  withCredentials: true
})

// 请求拦截器
instance.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
instance.interceptors.response.use(
  response => {
    // 检查内容类型是否为blob（文件下载）
    const contentType = response.headers['content-type'];
    if (contentType && contentType.includes('blob')) {
      return response.data;
    }
    
    // 处理正常JSON响应
    return response.data;
  },
  error => {
    // 处理401未授权错误
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
      return Promise.reject(new Error('会话已过期，请重新登录'))
    }
    
    // 处理非JSON响应
    if (error.response && error.response.data instanceof Blob) {
      // 如果响应是Blob但不是期望的类型，可能是HTML错误页面
      return error.response.data.text().then(text => {
        if (text.includes('<!DOCTYPE html>')) {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          window.location.href = '/login'
          return Promise.reject(new Error('会话已过期，请重新登录'))
        }
        return Promise.reject(new Error(text || '请求失败'))
      })
    }
    
    return Promise.reject(error)
  }
)

// 生成评价记录
export const generateReviews = (data) => {
  return instance.post('/reviews/generate', data)
}

// 批量导入评价记录
export const importReviews = (data) => {
  return instance.post('/reviews/import', data)
}

// 获取评价列表 
export const getReviews = (params) => {
  return instance.get('/reviews', { params })
}

// 获取评价详情
export const getReviewDetail = (id) => {
  return instance.get(`/reviews/${id}`)
}

// 上传截图
export const uploadScreenshot = (id, formData) => {
  return instance.post(`/reviews/${id}/screenshots`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

// 删除评价
export const deleteReview = (id) => {
  return instance.delete(`/reviews/${id}`)
}

// 更新评价
export const updateReview = (id, data) => {
  return instance.put(`/reviews/${id}`, data)
}

// 获取报表数据
export const getReportData = (data) => {
  return instance.post('/reports/generate', data)
}

// 导出报表数据
export const exportReport = (data) => {
  return instance.post('/reports/export', data, {
    responseType: 'blob', // 指定响应类型为blob，用于处理文件下载
    headers: {
      'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
  })
}

// 获取完整的PDF报表数据
export const getFullReportData = (data) => {
  return instance.post('/reports/full-data', data)
}

// 创建评价记录
export const createReview = (data) => {
  return instance.post('/reviews', data)
}

// 批量删除评价
export const batchDeleteReviews = (ids) => {
  return instance.delete('/reviews/batch', { data: { ids } })
}

// 导出选中评价
export const exportReviews = (ids) => {
  return instance.post('/reviews/export', { ids }, {
    responseType: 'blob'
  })
}

// 删除截图
export const deleteScreenshot = (reviewId, screenshotId) => {
  return instance.delete(`/reviews/${reviewId}/screenshots/${screenshotId}`)
} 