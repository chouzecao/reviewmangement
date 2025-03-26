/**
 * 集中管理API基础URL
 * 确保所有API请求使用正确的URL，避免硬编码
 */

// 使用环境变量或默认值
export const getBaseURL = () => {
  // 优先使用环境变量
  const configuredURL = import.meta.env.VITE_API_URL || '/api'
  
  // 检查是否有硬编码的域名，如果有则替换为相对路径
  if (configuredURL.includes('finnertrip.com')) {
    console.warn('检测到硬编码的域名URL，已替换为相对路径')
    return '/api'
  }
  
  return configuredURL
}

// 导出默认的API基础URL
export default getBaseURL() 