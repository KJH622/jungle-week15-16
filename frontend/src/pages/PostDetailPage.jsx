import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import aiApi from '../api/aiApi'
import AIBadge from '../components/ui/AIBadge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import CategoryBadge from '../components/ui/CategoryBadge'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import ErrorMessage from '../components/ui/ErrorMessage'
import LoadingIndicator from '../components/ui/LoadingIndicator'
import TagChip from '../components/ui/TagChip'
import TextInput from '../components/ui/TextInput'

export default function PostDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [post, setPost] = useState(null)
  const [comments, setComments] = useState([])
  const [commentInput, setCommentInput] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editInput, setEditInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [githubInfo, setGithubInfo] = useState(null)
  const [githubLoading, setGithubLoading] = useState(false)
  const [githubError, setGithubError] = useState('')
  const [relatedPosts, setRelatedPosts] = useState([])
  const [relatedLoading, setRelatedLoading] = useState(false)
  const [relatedError, setRelatedError] = useState('')
  const [relatedChecked, setRelatedChecked] = useState(false)
  const [improving, setImproving] = useState(false)
  const [improveResult, setImproveResult] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const myNickname = localStorage.getItem('nickname')

  useEffect(() => {
    Promise.all([
      api.get(`/posts/${id}`),
      api.get(`/posts/${id}/comments`),
    ]).then(([postRes, commentRes]) => {
      setPost(postRes.data)
      setComments(commentRes.data)
      setLoading(false)
      setGithubInfo(null)
      setGithubError('')
      setRelatedPosts([])
      setRelatedError('')
      setRelatedChecked(false)

      if (postRes.data.githubUrl) {
        setGithubLoading(true)
        aiApi.get(`/mcp/github/repo?url=${encodeURIComponent(postRes.data.githubUrl)}`)
          .then((res) => {
            if (!res.data.error) setGithubInfo(res.data)
            else setGithubError(res.data.error)
          })
          .catch(() => setGithubError('GitHub API 정보를 불러오지 못했습니다.'))
          .finally(() => setGithubLoading(false))
      }

      if (postRes.data.title || postRes.data.content || postRes.data.tags?.length) {
        setRelatedLoading(true)
        aiApi.post('/rag/similar', {
          title: postRes.data.title || '',
          content: postRes.data.content || '',
          exclude_id: postRes.data.id,
          tags: postRes.data.tags || [],
        })
          .then((res) => {
            setRelatedPosts(res.data.posts || [])
          })
          .catch(() => setRelatedError('RAG 관련 게시글을 불러오지 못했습니다.'))
          .finally(() => {
            setRelatedLoading(false)
            setRelatedChecked(true)
          })
      }
    }).catch(() => navigate('/posts'))
  }, [id, navigate])

  const handleImprove = async () => {
    if (improving) return
    setImproving(true)
    setImproveResult(null)
    try {
      const res = await api.post(`/posts/${id}/improve`)
      setImproveResult(res.data)
    } catch {
      setImproveResult({ error: '개선 제안 요청에 실패했습니다.' })
    } finally {
      setImproving(false)
    }
  }

  const requestPostDelete = () => {
    setConfirm({
      title: '게시글 삭제',
      message: '게시글을 정말 삭제할까요? 삭제 후에는 복구할 수 없습니다.',
      confirmLabel: '삭제하기',
      onConfirm: async () => {
        await api.delete(`/posts/${id}`)
        setConfirm(null)
        navigate('/posts')
      },
    })
  }

  const requestCommentDelete = (commentId) => {
    setConfirm({
      title: '댓글 삭제',
      message: '댓글을 정말 삭제할까요?',
      confirmLabel: '삭제하기',
      onConfirm: async () => {
        await api.delete(`/posts/${id}/comments/${commentId}`)
        setComments((prev) => prev.filter((comment) => comment.id !== commentId))
        setConfirm(null)
      },
    })
  }

  const handleCommentSubmit = async (e) => {
    e.preventDefault()
    if (!commentInput.trim()) return
    await api.post(`/posts/${id}/comments`, { content: commentInput })
    setCommentInput('')
    const res = await api.get(`/posts/${id}/comments`)
    setComments(res.data)
  }

  const handleEditSubmit = async (commentId) => {
    if (!editInput.trim()) return
    await api.put(`/posts/${id}/comments/${commentId}`, { content: editInput })
    setEditingId(null)
    setEditInput('')
    const res = await api.get(`/posts/${id}/comments`)
    setComments(res.data)
  }

  if (loading) {
    return (
      <main className="app-shell">
        <div className="app-container">
          <LoadingIndicator>게시글을 불러오는 중입니다...</LoadingIndicator>
        </div>
      </main>
    )
  }

  if (!post) return null

  const lastCommit = githubInfo?.last_commit_at || githubInfo?.updated_at

  return (
    <main className="app-shell">
      <div className="app-container">
        <button className="back-button" type="button" onClick={() => navigate('/posts')}>
          ‹ 목록으로
        </button>

        <Card style={{ marginBottom: 12 }}>
          <div className="detail-title-row">
            <h1 className="post-title">{post.title}</h1>
            {post.authorNickname === myNickname && (
              <div className="inline-row">
                <Button variant="ghost" onClick={() => navigate(`/posts/${id}/edit`)}>수정</Button>
                <Button variant="danger" onClick={requestPostDelete}>삭제</Button>
              </div>
            )}
          </div>

          <p className="post-meta">
            {post.authorNickname} · {new Date(post.createdAt).toLocaleDateString('ko-KR')}
          </p>

          {(post.domainName || post.projectTypeName || post.tags?.length > 0) && (
            <div className="chip-row" style={{ marginBottom: 16 }}>
              {post.domainName && <CategoryBadge>{post.domainName}</CategoryBadge>}
              {post.projectTypeName && <CategoryBadge>{post.projectTypeName}</CategoryBadge>}
              {post.tags?.map((tag) => <TagChip key={tag}>#{tag}</TagChip>)}
            </div>
          )}

          {post.githubUrl && (
            <>
              <a
                className="github-link-box"
                href={post.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub {post.githubUrl} ↗
              </a>

              {githubLoading && (
                <div className="status-note">GitHub API에서 레포지토리 정보를 불러오는 중입니다.</div>
              )}

              {githubError && (
                <div style={{ marginBottom: 16 }}>
                  <ErrorMessage>{githubError}</ErrorMessage>
                </div>
              )}

              {githubInfo && (
                <div className="github-card">
                  <div className="github-card__header">
                    <span className="github-card__name">{githubInfo.full_name}</span>
                    <AIBadge>GitHub API</AIBadge>
                  </div>
                  {githubInfo.description && (
                    <p className="github-card__desc">{githubInfo.description}</p>
                  )}
                  <div className="github-card__stats">
                    {githubInfo.language && <TagChip>{githubInfo.language}</TagChip>}
                    <span className="github-card__stat">★ {githubInfo.stars.toLocaleString()}</span>
                    <span className="github-card__stat">Fork {githubInfo.forks.toLocaleString()}</span>
                    <span className="github-card__stat">Issues {githubInfo.open_issues.toLocaleString()}</span>
                    {lastCommit && (
                      <span className="github-card__stat">
                        마지막 커밋 {new Date(lastCommit).toLocaleDateString('ko-KR')}
                      </span>
                    )}
                    {githubInfo.cached && <span className="github-card__stat">캐시 사용</span>}
                  </div>
                </div>
              )}
            </>
          )}

          <p className="post-content">{post.content}</p>

          {post.githubUrl && (
            <div style={{ borderTop: '1px solid var(--color-bg)', marginTop: 24, paddingTop: 20 }}>
              <p className="section-copy" style={{ marginBottom: 12 }}>
                GitHub 레포 현황은 MCP 도구로 확인하고, RAG 유사 게시글을 함께 참고해 개선 제안을 만듭니다.
              </p>
              <Button variant="ai" onClick={handleImprove} disabled={improving}>
                {improving ? '분석 중...' : 'Agent 개선 제안 받기'}
              </Button>
            </div>
          )}

          {improveResult && (
            <div className="ai-panel" style={{ marginTop: 16 }}>
              {improveResult.error ? (
                <ErrorMessage>{improveResult.error}</ErrorMessage>
              ) : (
                <>
                  <div className="page-title-row" style={{ marginBottom: 14 }}>
                    <AIBadge>Agent 개선 제안</AIBadge>
                  </div>
                  <div className="source-list" style={{ marginBottom: improveResult.similar_posts?.length ? 16 : 0 }}>
                    {Array.isArray(improveResult.suggestions) && improveResult.suggestions.map((suggestion, index) => (
                      <Card key={`${suggestion.title}-${index}`} className="source-card" style={{ cursor: 'default' }}>
                        <strong style={{ color: 'var(--color-text)', fontSize: 14 }}>
                          {index + 1}. {suggestion.title}
                        </strong>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>
                          <b>왜</b> {suggestion.reason}
                        </p>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>
                          <b>방법</b> {suggestion.how}
                        </p>
                      </Card>
                    ))}
                  </div>

                  {improveResult.similar_posts?.length > 0 && (
                    <>
                      <div className="divider-label">참고한 유사 프로젝트</div>
                      <div className="chip-row">
                        {improveResult.similar_posts.map((similar) => (
                          <TagChip
                            key={similar.id}
                            as="button"
                            type="button"
                            onClick={() => navigate(`/posts/${similar.id}`)}
                          >
                            {similar.title}
                          </TagChip>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </Card>

        <Card style={{ marginBottom: 12 }}>
          <h2 className="section-title" style={{ marginBottom: 20 }}>댓글 {comments.length}개</h2>

          {comments.length > 0 && (
            <div className="comment-list">
              {comments.map((comment) => (
                <div key={comment.id} className="comment-item">
                  <div className="comment-item__header">
                    <span className="comment-author">{comment.authorNickname}</span>
                    {comment.authorNickname === myNickname && editingId !== comment.id && (
                      <div className="inline-row">
                        <Button
                          variant="text"
                          onClick={() => {
                            setEditingId(comment.id)
                            setEditInput(comment.content)
                          }}
                        >
                          수정
                        </Button>
                        <Button variant="text" onClick={() => requestCommentDelete(comment.id)}>삭제</Button>
                      </div>
                    )}
                  </div>

                  {editingId === comment.id ? (
                    <div className="form-grid" style={{ gap: 8 }}>
                      <TextInput value={editInput} onChange={(e) => setEditInput(e.target.value)} />
                      <div className="inline-row" style={{ justifyContent: 'flex-end' }}>
                        <Button variant="ghost" onClick={() => setEditingId(null)}>취소</Button>
                        <Button onClick={() => handleEditSubmit(comment.id)}>저장</Button>
                      </div>
                    </div>
                  ) : (
                    <p className="comment-content">{comment.content}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          <form className="comment-form" onSubmit={handleCommentSubmit}>
            <TextInput
              placeholder="댓글을 입력하세요..."
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
            />
            <Button type="submit">등록</Button>
          </form>
        </Card>

        {(relatedLoading || relatedError || relatedChecked || relatedPosts.length > 0) && (
          <section>
            <div className="section-title-row">
              <h2 className="section-title">관련 게시글</h2>
              <AIBadge>RAG 추천</AIBadge>
            </div>
            <p className="section-copy">현재 게시글 본문을 임베딩해 벡터 유사도가 높은 게시글을 보여줍니다.</p>

            {relatedLoading && <div className="status-note">RAG 유사 게시글을 찾는 중입니다.</div>}
            {relatedError && <ErrorMessage>{relatedError}</ErrorMessage>}
            {!relatedLoading && !relatedError && relatedChecked && relatedPosts.length === 0 && (
              <div className="status-note">아직 유사한 게시글을 찾지 못했습니다.</div>
            )}
            {relatedPosts.length > 0 && (
              <div className="related-list">
                {relatedPosts.map((related) => (
                  <article
                    key={related.id}
                    className="related-card"
                    onClick={() => navigate(`/posts/${related.id}`)}
                  >
                    <h3 className="related-card__title">{related.title}</h3>
                    <p className="related-card__meta">{related.author}</p>
                    <div className="related-card__reason">
                      {related.similarity !== null && related.similarity !== undefined && (
                        <span>벡터 유사도 {related.similarity}%</span>
                      )}
                      {related.matched_tags?.length > 0 ? (
                        <span>공통 태그 {related.matched_tags.join(', ')}</span>
                      ) : (
                        <span>{related.reason || '본문 임베딩 기반 추천'}</span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        <ConfirmDialog
          open={!!confirm}
          title={confirm?.title}
          message={confirm?.message}
          confirmLabel={confirm?.confirmLabel}
          onConfirm={confirm?.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      </div>
    </main>
  )
}
