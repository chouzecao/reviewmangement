/**
 * 集中管理API基础URL
 * 确保所有API请求使用正确的URL，避免硬编码
 */

// 使用环境变量或默认值
export const getBaseURL = () => {
  // 优先使用环境变量
  const configuredURL = import.meta.env.VITE_API_URL || '/api'
  
  // 如果配置的URL是绝对路径（包含协议和域名），则替换为相对路径
  if (configuredURL.startsWith('http://') || configuredURL.startsWith('https://')) {
    console.warn('检测到配置的API URL是绝对路径，已替换为相对路径')
    return '/api'
  }
  
  return configuredURL
}

// 导出默认的API基础URL
export default getBaseURL() 