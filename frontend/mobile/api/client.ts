import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 开发环境：指向本机后端（USB调试或模拟器）
// Android模拟器用 10.0.2.2，iOS模拟器用 localhost
const BASE_URL = __DEV__
  ? 'http://192.168.31.16:8000/api/v1'
  : 'https://your-production-server.com/api/v1';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// 请求拦截：自动注入 Token
client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('cdss_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截：统一错误处理
client.interceptors.response.use(
  (res) => res.data,
  (error) => {
    const msg = error.response?.data?.detail || error.message || '网络请求失败';
    return Promise.reject(new Error(msg));
  }
);

export default client;
