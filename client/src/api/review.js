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
      // 添加调试日志
      console.log(`API请求: ${config.method?.toUpperCase()} ${config.url} - 携带Token: ${token.substring(0, 15)}...`)
    } else {
      console.warn(`API请求: ${config.method?.toUpperCase()} ${config.url} - 未找到Token`)
    }
    return config
  },
  error => {
    console.error('请求拦截器错误:', error)
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
    console.error('API请求错误:', error.message, error.config?.url);
    
    // 详细记录错误信息
    if (error.response) {
      console.error('错误状态:', error.response.status);
      console.error('错误头信息:', error.response.headers);
      
      // 处理401未授权错误
      if (error.response.status === 401) {
        console.warn('用户认证失败: 请求路径:', error.config.url)
        // 显示提示信息（如果有弹窗组件）
        try {
          if (window.ElMessage) {
            window.ElMessage.error('登录已过期，请重新登录')
          }
        } catch (e) {
          console.error('显示消息失败:', e)
        }

        // 清除认证信息
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        
        // 记录当前页面，以便重新登录后可以返回
        try {
          sessionStorage.setItem('redirect_after_login', window.location.pathname)
        } catch (e) {
          console.error('保存重定向信息失败:', e)
        }
        
        // 延迟重定向，给用户时间看到提示
        setTimeout(() => {
          window.location.href = '/login'
        }, 1500)
        
        return Promise.reject(new Error('会话已过期，请重新登录'))
      }
      
      // 处理500服务器错误
      if (error.response.status === 500) {
        console.error('服务器内部错误', error.response.data);
        return Promise.reject(new Error('服务器内部错误，请稍后重试'));
      }
    }
    
    // 处理非JSON响应
    if (error.response && error.response.data instanceof Blob) {
      // 如果响应是Blob但不是期望的类型，可能是HTML错误页面
      return error.response.data.text().then(text => {
        console.error('收到非JSON响应:', text.substring(0, 500));
        
        if (text.includes('<!DOCTYPE html>')) {
          console.warn('服务器返回了HTML页面而非API数据，可能是认证问题');
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          window.location.href = '/login'
          return Promise.reject(new Error('会话已过期，请重新登录'))
        }
        return Promise.reject(new Error(text || '请求失败'))
      })
    }
    
    // 处理网络错误
    if (error.message && error.message.includes('Network Error')) {
      console.error('网络连接错误，无法连接到服务器');
      return Promise.reject(new Error('网络连接失败，请检查网络后重试'));
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

// 上传评价截图
export const uploadScreenshot = (id, formData) => {
  return instance.post(`/reviews/${id}/screenshots`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
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