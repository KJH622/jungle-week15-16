import { Navigate } from 'react-router-dom'

// 로그인이 필요한 페이지를 감싸는 컴포넌트
export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token') // 로그인 시 저장한 JWT

  // 토큰 없으면 로그인 페이지로 강제 이동
  if (!token) {
    return <Navigate to="/login" replace />
  }

  // 토큰 있으면 원래 보려던 페이지 렌더링
  return children
}