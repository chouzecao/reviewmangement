import axios from 'axios'
import baseURL from './baseURL'
import { fixUrlInConfig } from '../utils/urlFixer'

// 使用集中管理的baseURL
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
    
    // 使用URL修复工具处理硬编码URL问题
    return fixUrlInConfig(config)
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
instance.interceptors.response.use(
  response => response.data,
  error => {
    // 处理401未授权错误
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// 登录
export const login = (data) => {
  return instance.post('/auth/login', data)
}

// 登出
export const logout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  return instance.post('/auth/logout')
}

// 获取当前用户信息
export const getCurrentUser = () => {
  return instance.get('/auth/me')
} 