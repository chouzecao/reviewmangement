// 导入全局URL修复工具
import axios from 'axios'
import { fixUrlInConfig } from './utils/urlFixer'
import { addTokenToConfig } from './utils/token'
import { ElMessage } from 'element-plus'

// 添加全局Axios拦截器，捕获所有请求
axios.interceptors.request.use(
  config => {
    // 1. 修复URL
    config = fixUrlInConfig(config)
    
    // 2. 添加Token
    config = addTokenToConfig(config)
    
    // 输出请求信息，方便调试
    console.log(`API请求: ${config.method?.toUpperCase()} ${config.url}`, 
                config.headers?.Authorization ? '携带Token' : '未携带Token')
    
    return config
  },
  error => Promise.reject(error)
)

// 添加全局响应拦截器，处理401错误
axios.interceptors.response.use(
  response => response,
  error => {
    // 处理401未授权错误
    if (error.response && error.response.status === 401) {
      console.warn('API请求返回401未授权错误，可能需要重新登录')
      // 只在非登录页面跳转
      if (window.location.pathname !== '/login') {
        ElMessage.error('登录已过期，请重新登录')
        // 保存当前路径
        localStorage.setItem('redirectPath', window.location.pathname)
        // 延迟跳转，给用户一点时间看到消息
        setTimeout(() => {
          window.location.href = '/login'
        }, 1500)
      }
    }
    return Promise.reject(error)
  }
) 