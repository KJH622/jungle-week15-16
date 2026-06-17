import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import aiApi from '../api/aiApi'

export default function PostDetailPage() {
  const { id } = useParams()   // URL에서 게시글 ID 추출
  const navigate = useNavigate()

  const [post, setPost] = useState(null)
  const [comments, setComments] = useState([])
  const [commentInput, setCommentInput] = useState('')   // 댓글 입력값
  const [editingId, setEditingId] = useState(null)       // 수정 중인 댓글 ID
  const [editInput, setEditInput] = useState('')         // 수정 입력값
  const [loading, setLoading] = useState(true)
  const [githubInfo, setGithubInfo] = useState(null)      // GitHub 레포 정보
  const [relatedPosts, setRelatedPosts] = useState([])    // 관련 게시글 추천
  const [improving, setImproving] = useState(false)       // 개선 제안 로딩 중
  const [improveResult, setImproveResult] = useState(null) // 개선 제안 결과

  // 현재 로그인한 유저 닉네임 (내 댓글인지 확인용)
  const myNickname = localStorage.getItem('nickname')

  // 마운트 시 게시글 + 댓글 동시 조회
  useEffect(() => {
    Promise.all([
      api.get(`/posts/${id}`),
      api.get(`/posts/${id}/comments`),
    ]).then(([postRes, commentRes]) => {
      setPost(postRes.data)
      setComments(commentRes.data)
      setLoading(false)

      // github_url 있으면 MCP 서버에서 레포 정보 추가 조회
      if (postRes.data.githubUrl) {
        aiApi.get(`/mcp/github/repo?url=${encodeURIComponent(postRes.data.githubUrl)}`)
          .then((res) => {
            if (!res.data.error) setGithubInfo(res.data)
          })
          .catch(() => {}) // GitHub 조회 실패해도 게시글은 정상 표시
      }

      // 본문 기반 유사 게시글 추천 (GPT 없이 벡터 검색만)
      if (postRes.data.content) {
        aiApi.post('/rag/similar', {
          content: postRes.data.content,
          exclude_id: postRes.data.id,
        })
          .then((res) => {
            if (res.data.posts && res.data.posts.length > 0) {
              setRelatedPosts(res.data.posts)
            }
          })
          .catch(() => {}) // 추천 실패해도 게시글은 정상 표시
      }
    }).catch(() => navigate('/posts')) // 없는 게시글이면 목록으로
  }, [id])

  // 프로젝트 개선 제안 요청
  const handleImprove = async () => {
    setImproving(true)
    setImproveResult(null)
    try {
      const res = await api.post(`/posts/${id}/improve`)
      setImproveResult(res.data)  // Spring Boot가 Map → JSON으로 직렬화해서 반환
    } catch (e) {
      setImproveResult({ error: '개선 제안 요청에 실패했습니다.' })
    } finally {
      setImproving(false)
    }
  }

  // 게시글 삭제
  const handlePostDelete = async () => {
    if (!window.confirm('게시글을 삭제할까요?')) return
    await api.delete(`/posts/${id}`)
    navigate('/posts') // 삭제 후 목록으로
  }

  // 댓글 작성
  const handleCommentSubmit = async (e) => {
    e.preventDefault()
    if (!commentInput.trim()) return
    await api.post(`/posts/${id}/comments`, { content: commentInput })
    setCommentInput('')
    // 댓글 목록 새로고침
    const res = await api.get(`/posts/${id}/comments`)
    setComments(res.data)
  }

  // 댓글 수정 완료
  const handleEditSubmit = async (commentId) => {
    await api.put(`/posts/${id}/comments/${commentId}`, { content: editInput })
    setEditingId(null)
    const res = await api.get(`/posts/${id}/comments`)
    setComments(res.data)
  }

  // 댓글 삭제
  const handleDelete = async (commentId) => {
    if (!window.confirm('댓글을 삭제할까요?')) return
    await api.delete(`/posts/${id}/comments/${commentId}`)
    setComments(comments.filter((c) => c.id !== commentId)) // 목록에서 즉시 제거
  }

  if (loading) return <div style={styles.center}>로딩 중...</div>
  if (!post) return null

  return (
    <div style={styles.container}>
      {/* 뒤로가기 */}
      <button style={styles.backBtn} onClick={() => navigate('/posts')}>← 목록으로</button>

      {/* 게시글 본문 */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h1 style={styles.title}>{post.title}</h1>
          {/* 작성자 본인일 때만 수정/삭제 버튼 표시 */}
          {post.authorNickname === myNickname && (
            <div style={styles.postActions}>
              <button style={styles.editBtn} onClick={() => navigate(`/posts/${id}/edit`)}>수정</button>
              <button style={styles.deleteBtn} onClick={handlePostDelete}>삭제</button>
            </div>
          )}
        </div>
        <p style={styles.meta}>
          {post.authorNickname} · {new Date(post.createdAt).toLocaleDateString('ko-KR')}
        </p>
        {/* 카테고리 표시 */}
        {(post.domainName || post.projectTypeName) && (
          <p style={styles.category}>
            {post.domainName && <span style={styles.categoryBadge}>{post.domainName}</span>}
            {post.projectTypeName && <span style={styles.categoryBadge}>{post.projectTypeName}</span>}
          </p>
        )}
        {/* 태그 */}
        {post.tags && post.tags.length > 0 && (
          <div style={styles.tags}>
            {post.tags.map((tag, i) => (
              <span key={i} style={styles.tag}>#{tag}</span>
            ))}
          </div>
        )}
        {/* GitHub URL + MCP 레포 정보 카드 */}
        {post.githubUrl && (
          <>
            <p style={styles.githubLink}>
              🔗 <a href={post.githubUrl} target="_blank" rel="noopener noreferrer">{post.githubUrl}</a>
            </p>
            {githubInfo && (
              <div style={styles.githubCard}>
                <div style={styles.githubCardHeader}>
                  <span style={styles.githubRepoName}>{githubInfo.full_name}</span>
                  {githubInfo.language && (
                    <span style={styles.langBadge}>{githubInfo.language}</span>
                  )}
                </div>
                {githubInfo.description && (
                  <p style={styles.githubDesc}>{githubInfo.description}</p>
                )}
                <div style={styles.githubStats}>
                  <span style={styles.stat}>⭐ {githubInfo.stars.toLocaleString()}</span>
                  <span style={styles.stat}>🍴 {githubInfo.forks.toLocaleString()}</span>
                  <span style={styles.stat}>🐛 이슈 {githubInfo.open_issues.toLocaleString()}</span>
                  <span style={styles.statMuted}>
                    최근 커밋{' '}
                    {githubInfo.last_commit_at
                      ? new Date(githubInfo.last_commit_at).toLocaleDateString('ko-KR')
                      : new Date(githubInfo.updated_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
        <p style={styles.content}>{post.content}</p>

        {/* 개선 제안 버튼 — GitHub URL 있는 게시글에서만 표시 */}
        {post.githubUrl && (
          <div style={styles.improveSection}>
            <button
              style={improving ? styles.improveBtnLoading : styles.improveBtn}
              onClick={handleImprove}
              disabled={improving}
            >
              {improving ? '🤖 분석 중...' : '🤖 AI 개선 제안 받기'}
            </button>
          </div>
        )}

        {/* 개선 제안 결과 */}
        {improveResult && (
          <div style={styles.improveResult}>
            {improveResult.error ? (
              <p style={{ color: '#fa5252' }}>{improveResult.error}</p>
            ) : (
              <>
                <h3 style={styles.improveTitle}>💡 AI 개선 제안</h3>
                <div style={styles.improveCards}>
                  {Array.isArray(improveResult.suggestions) && improveResult.suggestions.map((s, i) => (
                    <div key={i} style={styles.improveCard}>
                      <div style={styles.improveCardNum}>{i + 1}</div>
                      <div style={styles.improveCardBody}>
                        <p style={styles.improveCardTitle}>{s.title}</p>
                        <div style={styles.improveCardRow}>
                          <span style={styles.improveCardLabel}>왜</span>
                          <span style={styles.improveCardText}>{s.reason}</span>
                        </div>
                        <div style={styles.improveCardRow}>
                          <span style={{...styles.improveCardLabel, background: '#d3f9d8', color: '#2f9e44'}}>방법</span>
                          <span style={styles.improveCardText}>{s.how}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {improveResult.similar_posts?.length > 0 && (
                  <div style={styles.improveSources}>
                    <p style={styles.improveSourceLabel}>참고한 유사 프로젝트</p>
                    {improveResult.similar_posts.map((p) => (
                      <span
                        key={p.id}
                        style={styles.improveSourceChip}
                        onClick={() => navigate(`/posts/${p.id}`)}
                      >
                        {p.title}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* 댓글 목록 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>댓글 {comments.length}개</h2>
        {comments.map((c) => (
          <div key={c.id} style={styles.comment}>
            {editingId === c.id ? (
              // 수정 모드
              <div style={styles.editRow}>
                <input
                  style={styles.editInput}
                  value={editInput}
                  onChange={(e) => setEditInput(e.target.value)}
                />
                <button style={styles.saveBtn} onClick={() => handleEditSubmit(c.id)}>저장</button>
                <button style={styles.cancelBtn} onClick={() => setEditingId(null)}>취소</button>
              </div>
            ) : (
              // 일반 모드
              <>
                <p style={styles.commentContent}>{c.content}</p>
                <div style={styles.commentMeta}>
                  <span>{c.authorNickname}</span>
                  {/* 내 댓글일 때만 수정/삭제 버튼 표시 */}
                  {c.authorNickname === myNickname && (
                    <span style={styles.commentActions}>
                      <button style={styles.editBtn} onClick={() => { setEditingId(c.id); setEditInput(c.content) }}>수정</button>
                      <button style={styles.deleteBtn} onClick={() => handleDelete(c.id)}>삭제</button>
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* 댓글 작성 */}
      <form onSubmit={handleCommentSubmit} style={styles.commentForm}>
        <input
          style={styles.commentInput}
          placeholder="댓글을 입력하세요..."
          value={commentInput}
          onChange={(e) => setCommentInput(e.target.value)}
        />
        <button style={styles.submitBtn} type="submit">등록</button>
      </form>

      {/* 관련 게시글 추천 — RAG 벡터 검색 결과 */}
      {relatedPosts.length > 0 && (
        <div style={styles.relatedSection}>
          <h2 style={styles.relatedTitle}>🔍 관련 게시글</h2>
          <div style={styles.relatedList}>
            {relatedPosts.map((p) => (
              <div
                key={p.id}
                style={styles.relatedCard}
                onClick={() => navigate(`/posts/${p.id}`)}
              >
                <p style={styles.relatedPostTitle}>{p.title}</p>
                <p style={styles.relatedPostMeta}>{p.author}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' },
  center: { textAlign: 'center', marginTop: '4rem', color: '#868e96' },
  backBtn: { background: 'none', border: 'none', color: '#339af0', fontSize: '0.9rem', marginBottom: '1rem', padding: 0 },
  card: { background: '#fff', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '1.5rem' },
  title: { fontSize: '1.4rem', fontWeight: '700', marginBottom: '0.5rem' },
  meta: { fontSize: '0.85rem', color: '#868e96', marginBottom: '0.75rem' },
  tags: { display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' },
  tag: { fontSize: '0.75rem', background: '#e7f5ff', color: '#339af0', padding: '0.2rem 0.5rem', borderRadius: '4px' },
  content: { fontSize: '1rem', lineHeight: '1.8', color: '#343a40' },
  section: { marginBottom: '1rem' },
  sectionTitle: { fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' },
  comment: { background: '#fff', borderRadius: '8px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: '0.5rem' },
  commentContent: { fontSize: '0.95rem', marginBottom: '0.4rem' },
  commentMeta: { display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#868e96' },
  commentActions: { display: 'flex', gap: '0.5rem' },
  editBtn: { background: 'none', border: 'none', color: '#339af0', fontSize: '0.8rem', cursor: 'pointer' },
  deleteBtn: { background: 'none', border: 'none', color: '#fa5252', fontSize: '0.8rem', cursor: 'pointer' },
  editRow: { display: 'flex', gap: '0.5rem' },
  editInput: { flex: 1, padding: '0.4rem 0.6rem', border: '1px solid #dee2e6', borderRadius: '6px', fontSize: '0.9rem' },
  saveBtn: { padding: '0.4rem 0.75rem', background: '#339af0', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.85rem' },
  cancelBtn: { padding: '0.4rem 0.75rem', background: 'none', border: '1px solid #dee2e6', borderRadius: '6px', fontSize: '0.85rem' },
  commentForm: { display: 'flex', gap: '0.5rem', marginTop: '1rem' },
  commentInput: { flex: 1, padding: '0.625rem 0.75rem', border: '1px solid #dee2e6', borderRadius: '6px', fontSize: '0.95rem' },
  submitBtn: { padding: '0.625rem 1rem', background: '#339af0', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' },
  postActions: { display: 'flex', gap: '0.5rem', flexShrink: 0 },
  category: { display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' },
  categoryBadge: { fontSize: '0.75rem', background: '#f1f3f5', color: '#495057', padding: '0.2rem 0.5rem', borderRadius: '4px' },
  githubLink: { fontSize: '0.9rem', marginBottom: '0.5rem', color: '#495057' },
  githubCard: {
    border: '1px solid #dee2e6', borderRadius: '8px', padding: '1rem',
    marginBottom: '1rem', background: '#f8f9fa',
  },
  githubCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' },
  githubRepoName: { fontSize: '0.9rem', fontWeight: '600', color: '#212529' },
  langBadge: { fontSize: '0.75rem', background: '#e7f5ff', color: '#339af0', padding: '0.15rem 0.5rem', borderRadius: '4px' },
  githubDesc: { fontSize: '0.85rem', color: '#495057', marginBottom: '0.75rem', lineHeight: '1.5' },
  githubStats: { display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' },
  stat: { fontSize: '0.85rem', color: '#343a40' },
  statMuted: { fontSize: '0.8rem', color: '#868e96', marginLeft: 'auto' },
  relatedSection: { marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #f1f3f5' },
  relatedTitle: { fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: '#495057' },
  relatedList: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  relatedCard: {
    background: '#fff', borderRadius: '8px', padding: '0.85rem 1rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)', cursor: 'pointer',
    borderLeft: '3px solid #7950f2',
  },
  relatedPostTitle: { fontSize: '0.9rem', fontWeight: '500', color: '#212529', marginBottom: '0.2rem' },
  relatedPostMeta: { fontSize: '0.78rem', color: '#868e96', margin: 0 },
  improveSection: { marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #f1f3f5' },
  improveBtn: {
    padding: '0.6rem 1.2rem', background: '#7950f2', color: '#fff',
    border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer',
  },
  improveBtnLoading: {
    padding: '0.6rem 1.2rem', background: '#adb5bd', color: '#fff',
    border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '0.9rem', cursor: 'not-allowed',
  },
  improveResult: {
    marginTop: '1rem', padding: '1.25rem 1.25rem 0.75rem',
    background: '#f8f0ff', borderRadius: '10px', border: '1px solid #e9d8fd',
  },
  improveTitle: { fontSize: '0.95rem', fontWeight: '700', color: '#5f3dc4', marginBottom: '1rem' },
  improveCards: { display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' },
  improveCard: {
    display: 'flex', gap: '0.875rem', background: '#fff',
    borderRadius: '8px', padding: '0.875rem 1rem',
    border: '1px solid #e9d8fd',
  },
  improveCardNum: {
    minWidth: '24px', height: '24px', borderRadius: '50%',
    background: '#7950f2', color: '#fff',
    fontSize: '0.75rem', fontWeight: '700',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginTop: '2px', flexShrink: 0,
  },
  improveCardBody: { display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 },
  improveCardTitle: { fontSize: '0.9rem', fontWeight: '700', color: '#212529', margin: 0 },
  improveCardRow: { display: 'flex', gap: '0.5rem', alignItems: 'flex-start' },
  improveCardLabel: {
    fontSize: '0.7rem', fontWeight: '700', padding: '0.15rem 0.45rem',
    borderRadius: '4px', background: '#e7f5ff', color: '#1971c2',
    whiteSpace: 'nowrap', marginTop: '2px', flexShrink: 0,
  },
  improveCardText: { fontSize: '0.85rem', color: '#495057', lineHeight: '1.6', margin: 0 },
  improveSources: { paddingTop: '0.75rem', borderTop: '1px solid #e9d8fd', paddingBottom: '0.5rem' },
  improveSourceLabel: { fontSize: '0.78rem', color: '#868e96', marginBottom: '0.4rem' },
  improveSourceChip: {
    display: 'inline-block', marginRight: '0.4rem', marginBottom: '0.3rem',
    padding: '0.2rem 0.6rem', background: '#ede9fe', color: '#5f3dc4',
    borderRadius: '12px', fontSize: '0.78rem', cursor: 'pointer',
  },
}