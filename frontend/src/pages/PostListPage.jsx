import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

export default function PostListPage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  // 필터/검색 상태
  const [keyword, setKeyword] = useState('')
  const [domainId, setDomainId] = useState('')
  const [projectTypeId, setProjectTypeId] = useState('')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  // 카테고리 목록 (드롭다운용)
  const [domains, setDomains] = useState([])
  const [projectTypes, setProjectTypes] = useState([])

  const navigate = useNavigate()

  // 마운트 시 카테고리 목록 1회만 가져오기
  useEffect(() => {
    api.get('/categories?type=DOMAIN').then((res) => setDomains(res.data))
    api.get('/categories?type=PROJECT_TYPE').then((res) => setProjectTypes(res.data))
  }, [])

  // keyword, domainId, projectTypeId, page 가 바뀔 때마다 게시글 재조회
  useEffect(() => {
    setLoading(true)
    const params = { page, size: 10 }
    if (keyword) params.keyword = keyword
    if (domainId) params.domainId = domainId
    if (projectTypeId) params.projectTypeId = projectTypeId

    api.get('/posts', { params })
      .then((res) => {
        setPosts(res.data.content)          // 페이징 응답의 실제 목록
        setTotalPages(res.data.totalPages)  // 전체 페이지 수
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [keyword, domainId, projectTypeId, page])

  // 검색창 엔터 또는 버튼 클릭 시 page를 0으로 리셋
  const handleSearch = (e) => {
    e.preventDefault()
    setPage(0) // 검색어 바뀌면 첫 페이지로
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <div style={styles.header}>
        <h1 style={styles.title}>사이드 프로젝트 게시판</h1>
        <div style={styles.headerRight}>
          <button style={styles.writeBtn} onClick={() => navigate('/posts/new')}>글 작성</button>
          <button style={styles.logoutBtn} onClick={handleLogout}>로그아웃</button>
        </div>
      </div>

      {/* 검색 + 필터 */}
      <form onSubmit={handleSearch} style={styles.searchBar}>
        <input
          style={styles.searchInput}
          type="text"
          placeholder="키워드 검색..."
          value={keyword}
          onChange={(e) => { setKeyword(e.target.value); setPage(0) }}
        />
        {/* 도메인 드롭다운 */}
        <select
          style={styles.select}
          value={domainId}
          onChange={(e) => { setDomainId(e.target.value); setPage(0) }}
        >
          <option value="">전체 도메인</option>
          {domains.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        {/* 프로젝트 유형 드롭다운 */}
        <select
          style={styles.select}
          value={projectTypeId}
          onChange={(e) => { setProjectTypeId(e.target.value); setPage(0) }}
        >
          <option value="">전체 유형</option>
          {projectTypes.map((pt) => (
            <option key={pt.id} value={pt.id}>{pt.name}</option>
          ))}
        </select>
      </form>

      {/* 게시글 목록 */}
      {loading ? (
        <div style={styles.center}>로딩 중...</div>
      ) : posts.length === 0 ? (
        <p style={styles.empty}>게시글이 없습니다.</p>
      ) : (
        <div style={styles.list}>
          {posts.map((post) => (
            <div key={post.id} style={styles.card} onClick={() => navigate(`/posts/${post.id}`)}>
              <h2 style={styles.postTitle}>{post.title}</h2>
              {/* 태그 목록 */}
              {post.tags && post.tags.length > 0 && (
                <div style={styles.tags}>
                  {post.tags.map((tag, index) => (
                    <span key={index} style={styles.tag}>#{tag}</span>
                  ))}
                </div>
              )}
              <p style={styles.postMeta}>
                {post.authorNickname} · {new Date(post.createdAt).toLocaleDateString('ko-KR')}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            style={styles.pageBtn}
            disabled={page === 0}              // 첫 페이지면 이전 버튼 비활성화
            onClick={() => setPage(page - 1)}
          >
            이전
          </button>
          <span style={styles.pageInfo}>{page + 1} / {totalPages}</span>
          <button
            style={styles.pageBtn}
            disabled={page === totalPages - 1}  // 마지막 페이지면 다음 버튼 비활성화
            onClick={() => setPage(page + 1)}
          >
            다음
          </button>
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
  searchBar: { display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' },
  searchInput: { flex: 1, padding: '0.5rem 0.75rem', border: '1px solid #dee2e6', borderRadius: '6px', fontSize: '0.9rem' },
  select: { padding: '0.5rem 0.75rem', border: '1px solid #dee2e6', borderRadius: '6px', fontSize: '0.9rem', background: '#fff' },
  list: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  card: { background: '#fff', borderRadius: '8px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', cursor: 'pointer' },
  postTitle: { fontSize: '1rem', fontWeight: '600', marginBottom: '0.4rem' },
  tags: { display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.4rem' },
  tag: { fontSize: '0.75rem', background: '#e7f5ff', color: '#339af0', padding: '0.2rem 0.5rem', borderRadius: '4px' },
  postMeta: { fontSize: '0.85rem', color: '#868e96' },
  empty: { textAlign: 'center', color: '#868e96', marginTop: '3rem' },
  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2rem' },
  pageBtn: { padding: '0.4rem 1rem', border: '1px solid #dee2e6', borderRadius: '6px', background: '#fff', cursor: 'pointer' },
  pageInfo: { fontSize: '0.9rem', color: '#495057' },
}