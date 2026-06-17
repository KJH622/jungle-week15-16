import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import aiApi from '../api/aiApi'
import AIBadge from '../components/ui/AIBadge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import ErrorMessage from '../components/ui/ErrorMessage'
import LoadingIndicator from '../components/ui/LoadingIndicator'
import Textarea from '../components/ui/Textarea'
import ToolBadge from '../components/ui/ToolBadge'

const TOOL_LABELS = {
  search_posts: '게시글 검색 (RAG)',
  get_github_info: 'GitHub 정보 조회 (MCP)',
}

const EXAMPLES = [
  'React와 관련된 프로젝트 추천해줘',
  '백엔드 사이드 프로젝트 뭐가 있어?',
  'https://github.com/facebook/react 이 레포지토리 어때?',
  '게시판에서 AI 관련 프로젝트 찾아줘',
]

export default function AgentPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setResult(null)
    setError('')

    try {
      const res = await aiApi.post('/agent/chat', { query })
      setResult(res.data)
    } catch (err) {
      setError('에이전트 응답 중 오류가 발생했습니다.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const tools = [...new Set(result?.tools_used || [])]

  return (
    <main className="app-shell">
      <div className="app-container">
        <button className="back-button" type="button" onClick={() => navigate('/posts')}>
          ‹ 게시판으로
        </button>

        <header className="page-header">
          <div className="page-title-row">
            <h1 className="page-title">AI Agent</h1>
            <AIBadge>RAG · MCP</AIBadge>
          </div>
          <p className="page-subtitle">
            게시글 검색과 GitHub 정보 조회를 조합해 질문에 답변합니다.
          </p>
        </header>

        <Card style={{ marginBottom: 14 }}>
          <form className="form-grid" onSubmit={handleSubmit}>
            <Textarea
              rows={3}
              placeholder="예: React 프로젝트 추천해줘 / https://github.com/user/repo 이 레포지토리 어때?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="submit" disabled={loading || !query.trim()}>
                {loading ? '생각 중...' : '질문하기'}
              </Button>
            </div>
          </form>
        </Card>

        {error && <div style={{ marginBottom: 14 }}><ErrorMessage>{error}</ErrorMessage></div>}

        {loading && (
          <div style={{ marginBottom: 14 }}>
            <LoadingIndicator ai>에이전트가 필요한 도구를 고르는 중입니다...</LoadingIndicator>
          </div>
        )}

        {result && (
          <section>
            {tools.length > 0 && (
              <div className="inline-row" style={{ marginBottom: 10 }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: 12, fontWeight: 700 }}>
                  사용한 도구
                </span>
                {tools.map((tool) => (
                  <ToolBadge key={tool} type={tool === 'get_github_info' ? 'mcp' : 'rag'}>
                    {TOOL_LABELS[tool] || tool}
                  </ToolBadge>
                ))}
              </div>
            )}

            <div className="answer-card">
              <div className="page-title-row" style={{ marginBottom: 14 }}>
                <AIBadge>Agent 답변</AIBadge>
              </div>
              <p className="answer-text">{result.answer}</p>
            </div>
          </section>
        )}

        {!result && !loading && (
          <section style={{ marginTop: 18 }}>
            <div className="divider-label">이런 질문을 해보세요</div>
            <div className="example-list">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  className="example-card"
                  onClick={() => setQuery(example)}
                >
                  {example}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
