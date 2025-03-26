/**
 * URL修复工具
 * 用于检测和修复硬编码URL问题
 */

// 检测URL是否包含硬编码域名
export const containsHardcodedDomain = (url) => {
  if (!url || typeof url !== 'string') return false;
  
  // 检查是否包含协议头(http://或https://)，表示这是一个绝对URL
  return url.startsWith('http://') || url.startsWith('https://');
};

// 修复硬编码URL，转换为相对路径
export const fixHardcodedUrl = (url) => {
  if (!containsHardcodedDomain(url)) return url;
  
  try {
    // 提取路径部分
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    
    // 确保路径以/api开头
    if (!path.startsWith('/api')) {
      console.warn(`修复硬编码URL: ${url} -> /api${path}`);
      return `/api${path}`;
    }
    
    console.warn(`修复硬编码URL: ${url} -> ${path}`);
    return path;
  } catch (error) {
    console.error('修复URL失败:', error);
    return url;
  }
};

// 修复配置对象中的URL
export const fixUrlInConfig = (config) => {
  if (!config) return config;
  
  // 检查URL是否包含硬编码域名
  if (config.url && containsHardcodedDomain(config.url)) {
    // 记录原始URL便于调试
    const originalUrl = config.url;
    
    // 修复URL
    config.url = fixHardcodedUrl(config.url);
    
    console.warn(`已修复请求URL: ${originalUrl} -> ${config.url}`);
  }
  
  return config;
};

export default {
  containsHardcodedDomain,
  fixHardcodedUrl,
  fixUrlInConfig
}; 