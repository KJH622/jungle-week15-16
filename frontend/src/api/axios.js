import axios from 'axios'

// 기본 설정이 적용된 axios 인스턴스
const api = axios.create({
  baseURL: '/api', // vite proxy가 http://localhost:8080/api 로 전달
})

// 요청 인터셉터 — 모든 요청 전에 자동 실행
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') // 로그인 시 저장해둔 JWT
  if (token) {
    config.headers.Authorization = `Bearer ${token}` // 헤더에 자동 주입
  }
  return config
})

// 응답 인터셉터 — 401(인증 만료) 시 로그인 페이지로 이동
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
