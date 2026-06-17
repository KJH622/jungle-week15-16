import axios from 'axios'

// FastAPI(8000)를 향하는 axios 인스턴스
// vite.config.js의 /ai 프록시를 통해 실제 요청은 http://localhost:8000으로 전달
const aiApi = axios.create({
  baseURL: '/ai',
})

// 요청 인터셉터 — JWT 토큰 자동 주입 (인증이 필요한 AI 엔드포인트 대비)
aiApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default aiApi
