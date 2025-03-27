/**
 * Token辅助工具
 * 用于统一管理身份验证令牌
 */

// 获取Token
export const getToken = () => {
  return localStorage.getItem('token')
}

// 设置Token
export const setToken = (token) => {
  if (token) {
    localStorage.setItem('token', token)
    return true
  }
  return false
}

// 删除Token
export const removeToken = () => {
  localStorage.removeItem('token')
}

// 检查Token是否存在
export const hasToken = () => {
  return !!getToken()
}

// 获取带Token的请求头
export const getAuthHeaders = () => {
  const token = getToken()
  if (!token) return {}
  
  return {
    'Authorization': `Bearer ${token}`
  }
}

// 添加Token到请求配置
export const addTokenToConfig = (config = {}) => {
  const token = getToken()
  if (!token) return config
  
  if (!config.headers) {
    config.headers = {}
  }
  
  config.headers.Authorization = `Bearer ${token}`
  return config
}

export default {
  getToken,
  setToken,
  removeToken,
  hasToken,
  getAuthHeaders,
  addTokenToConfig
} 