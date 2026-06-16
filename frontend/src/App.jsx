import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// 페이지 컴포넌트 — 이후 하나씩 만들 예정
// import LoginPage from './pages/LoginPage'
// import PostListPage from './pages/PostListPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* / 접속 시 /posts 로 자동 이동 */}
        <Route path="/" element={<Navigate to="/posts" replace />} />

        {/* 아래 라우트들은 페이지 컴포넌트 만들면서 하나씩 주석 해제 */}
        {/* <Route path="/login" element={<LoginPage />} /> */}
        {/* <Route path="/posts" element={<PostListPage />} /> */}

        {/* 임시 페이지 — 라우터 동작 확인용 */}
        <Route path="/posts" element={<div style={{ padding: '2rem' }}>게시글 목록 (준비 중)</div>} />
        <Route path="/login" element={<div style={{ padding: '2rem' }}>로그인 (준비 중)</div>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
