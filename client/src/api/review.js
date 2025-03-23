import axios from 'axios'

const baseURL = 'http://commentge.ns-dc2goees.svc.cluster.local:8080/api'

const instance = axios.create({
  baseURL,
  timeout: 10000
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
  response => response.data,
  error => {
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