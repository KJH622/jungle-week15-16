import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage' // 로그인/회원가입 화면

function App() {
  return (
    // BrowserRouter — URL 기반 라우팅 활성화 (history API 사용)
    <BrowserRouter>
      {/* Routes — 현재 URL과 일치하는 Route 하나만 렌더링 */}
      <Routes>
        {/* / 접속 시 /posts 로 자동 리다이렉트 */}
        <Route path="/" element={<Navigate to="/posts" replace />} />

        {/* /login → 로그인/회원가입 화면 */}
        <Route path="/login" element={<LoginPage />} />

        {/* /posts → 게시글 목록 (다음 이슈에서 구현) */}
        <Route path="/posts" element={<div style={{ padding: '2rem' }}>게시글 목록 (준비 중)</div>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App