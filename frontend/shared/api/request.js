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
    // 401 处理：只清 token，不在这里做跳转（由各页面或 store 负责）
    // 注意：登录请求本身的 401（密码错误）也会到这里，不能在这里清 token
    // 只有已登录状态下的 401 才清 token
    if (err.response?.status === 401) {
      const url = err.config?.url || ''
      const isLoginRequest = url.includes('/auth/login')
      if (!isLoginRequest) {
        localStorage.removeItem('cdss_token')
      }
    }
    return Promise.reject(err)
  }
)

// 便捷方法（返回 data.data）
export const get    = (url, config) => api.get(url, config).then(r => r.data.data)
export const post   = (url, data, config) => api.post(url, data, config).then(r => r.data.data)
export const put    = (url, data, config) => api.put(url, data, config).then(r => r.data.data)
export const del    = (url, config) => api.delete(url, config).then(r => r.data.data)
