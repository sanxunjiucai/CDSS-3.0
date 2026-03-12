import axios from 'axios'

export const api = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cdss_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('cdss_token')
    }
    return Promise.reject(err)
  }
)

// 便捷方法（返回 data.data）
export const get    = (url, config) => api.get(url, config).then(r => r.data.data)
export const post   = (url, data, config) => api.post(url, data, config).then(r => r.data.data)
export const put    = (url, data, config) => api.put(url, data, config).then(r => r.data.data)
export const del    = (url, config) => api.delete(url, config).then(r => r.data.data)
