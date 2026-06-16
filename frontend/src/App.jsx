import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'       // 로그인/회원가입 화면
import PostListPage from './pages/PostListPage' // 게시글 목록 화면
import ProtectedRoute from './components/ProtectedRoute'   // 인증 게이트키퍼
import PostDetailPage from './pages/PostDetailPage'        // 게시글 상세 화면
import PostFormPage from './pages/PostFormPage'            // 게시글 작성/수정 화면

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

        {/* /posts → 로그인 필수 → 게시글 목록 */}
        <Route
          path="/posts"
          element={
            <ProtectedRoute>
              <PostListPage />
            </ProtectedRoute>
          }
        />

        {/* /posts/:id → 게시글 상세 (로그인 필수) */}
        <Route
          path="/posts/:id"
          element={
            <ProtectedRoute>
              <PostDetailPage />
            </ProtectedRoute>
          }
        />
        {/* /posts/new → 게시글 작성 (로그인 필수) */}
        <Route
          path="/posts/new"
          element={
            <ProtectedRoute>
              <PostFormPage />
            </ProtectedRoute>
          }
        />

        {/* /posts/:id/edit → 게시글 수정 (로그인 필수) */}
        <Route
          path="/posts/:id/edit"
          element={
            <ProtectedRoute>
              <PostFormPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App