import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import aiApi from '../api/aiApi'
import AIBadge from '../components/ui/AIBadge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import ErrorMessage from '../components/ui/ErrorMessage'
import LoadingIndicator from '../components/ui/LoadingIndicator'
import Textarea from '../components/ui/Textarea'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [answer, setAnswer] = useState('')
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)

  const navigate = useNavigate()

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setError('')
    setAnswer('')
    setSources([])
    setSearched(true)

    try {
      const res = await aiApi.post('/rag/search', { query })
      setAnswer(res.data.answer)
      setSources(res.data.sources)
    } catch {
      setError('검색 중 오류가 발생했습니다. AI 서버가 실행 중인지 확인해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
  }

  return (
    <main className="app-shell">
      <div className="app-container">
        <button className="back-button" type="button" onClick={() => navigate('/posts')}>
          ‹ 목록으로
        </button>

        <header className="page-header">
          <div className="page-title-row">
            <h1 className="page-title">RAG 프로젝트 검색</h1>
            <AIBadge>RAG 검색</AIBadge>
          </div>
          <p className="page-subtitle">
            자연어로 질문하면 게시글 내용을 바탕으로 답변하고 참고 게시글을 보여줍니다.
          </p>
        </header>

        <Card className="form-grid" style={{ marginBottom: 14 }}>
          <Textarea
            rows={3}
            placeholder="예: 웹개발 프로젝트 추천해줘, React 관련 게시글 있어?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="page-header--split" style={{ marginBottom: 0 }}>
            <span style={{ color: 'var(--color-text-disabled)', fontSize: 12 }}>
              Enter로 검색 · Shift+Enter로 줄바꿈
            </span>
            <Button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
            >
              {loading ? '검색 중...' : '검색'}
            </Button>
          </div>
        </Card>

        {error && <div style={{ marginBottom: 14 }}><ErrorMessage>{error}</ErrorMessage></div>}

        {loading && (
          <div style={{ marginBottom: 14 }}>
            <LoadingIndicator ai>게시글을 분석하는 중입니다...</LoadingIndicator>
          </div>
        )}

        {searched && !loading && !error && (
          <section>
            <div className="answer-card" style={{ marginBottom: 12 }}>
              <div className="page-title-row" style={{ marginBottom: 14 }}>
                <AIBadge>RAG 답변</AIBadge>
              </div>
              <p className="answer-text">{answer}</p>
            </div>

            {sources.length > 0 && (
              <>
                <div className="divider-label">참고한 게시글</div>
                <div className="source-list">
                  {sources.map((source) => (
                    <article
                      key={source.id}
                      className="source-card"
                      onClick={() => navigate(`/posts/${source.id}`)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <strong style={{ color: 'var(--color-text)', fontSize: 14 }}>{source.title}</strong>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: 13, flexShrink: 0 }}>
                          {source.author} →
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </main>
  )
}
