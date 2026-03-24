import axios from 'axios'

const baseURL = import.meta.env.DEV
  ? '/bizApi'
  : import.meta.env.VITE_BIZ_API_BASE_URL ||
    '/bizApi'

export const api = axios.create({
  baseURL,
  timeout: 45000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('xhs_writer_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
