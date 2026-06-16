import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

export default function PostListPage() {
  // 게시글 목록 상태
  const [posts, setPosts] = useState([])

  // 로딩 상태 (데이터 받아오는 동안 "로딩 중" 표시용)
  const [loading, setLoading] = useState(true)

  const navigate = useNavigate()

  // 컴포넌트 마운트 시 게시글 목록 가져오기
  useEffect(() => {
    api.get('/posts')
      .then((res) => {
        setPosts(res.data.content || res.data) // 페이징 응답이면 .content, 아니면 그대로
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, []) // 빈 배열 = 최초 1회만 실행

  // 로그아웃
  const handleLogout = () => {
    localStorage.removeItem('token') // JWT 삭제
    navigate('/login')
  }

  if (loading) return <div style={styles.center}>로딩 중...</div>

  return (
    <div style={styles.container}>
      {/* 상단 헤더 */}
      <div style={styles.header}>
        <h1 style={styles.title}>사이드 프로젝트 게시판</h1>
        <div style={styles.headerRight}>
          <button style={styles.writeBtn} onClick={() => navigate('/posts/new')}>
            글 작성
          </button>
          <button style={styles.logoutBtn} onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      </div>

      {/* 게시글 목록 */}
      {posts.length === 0 ? (
        <p style={styles.empty}>아직 게시글이 없습니다.</p>
      ) : (
        <div style={styles.list}>
          {posts.map((post) => (
            // 각 게시글 카드 — key는 React가 항목 구분하는 데 필요
            <div
              key={post.id}
              style={styles.card}
              onClick={() => navigate(`/posts/${post.id}`)}
            >
              <h2 style={styles.postTitle}>{post.title}</h2>
              <p style={styles.postMeta}>
                {post.authorNickname} · {new Date(post.createdAt).toLocaleDateString('ko-KR')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' },
  center: { textAlign: 'center', marginTop: '4rem', color: '#868e96' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  title: { fontSize: '1.25rem', fontWeight: '700' },
  headerRight: { display: 'flex', gap: '0.5rem' },
  writeBtn: { padding: '0.5rem 1rem', background: '#339af0', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600' },
  logoutBtn: { padding: '0.5rem 1rem', background: 'none', border: '1px solid #dee2e6', borderRadius: '6px', color: '#868e96' },
  list: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  card: { background: '#fff', borderRadius: '8px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', cursor: 'pointer' },
  postTitle: { fontSize: '1rem', fontWeight: '600', marginBottom: '0.4rem' },
  postMeta: { fontSize: '0.85rem', color: '#868e96' },
  empty: { textAlign: 'center', color: '#868e96', marginTop: '3rem' },
}