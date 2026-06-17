import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import aiApi from '../api/aiApi'

// 도구 이름을 사람이 읽기 좋은 레이블로 변환
const TOOL_LABELS = {
  search_posts: '📚 게시글 검색 (RAG)',
  get_github_info: '🐙 GitHub 정보 조회 (MCP)',
}

export default function AgentPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [result, setResult] = useState(null)   // { answer, tools_used }
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setResult(null)
    setError('')

    try {
      // POST /ai/agent/chat — GPT가 자율적으로 도구 선택 후 답변
      const res = await aiApi.post('/agent/chat', { query })
      setResult(res.data)
    } catch (err) {
      setError('에이전트 응답 중 오류가 발생했습니다.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <button style={styles.backBtn} onClick={() => navigate('/posts')}>← 게시판으로</button>
      <div style={styles.header}>
        <h1 style={styles.title}>🤖 AI Agent</h1>
        <p style={styles.subtitle}>
          게시글 검색(RAG)과 GitHub 정보 조회(MCP)를 조합해 질문에 답변합니다.
        </p>
      </div>

      {/* 질문 입력 */}
      <form onSubmit={handleSubmit} style={styles.form}>
        <textarea
          style={styles.textarea}
          placeholder="예: React 프로젝트 추천해줘 / https://github.com/user/repo 이 레포지토리 어때?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={3}
        />
        <button style={styles.submitBtn} type="submit" disabled={loading}>
          {loading ? '생각 중...' : '질문하기'}
        </button>
      </form>

      {/* 에러 */}
      {error && <p style={styles.error}>{error}</p>}

      {/* 결과 */}
      {result && (
        <div style={styles.resultWrap}>
          {/* 사용한 도구 뱃지 */}
          {result.tools_used && result.tools_used.length > 0 && (
            <div style={styles.toolsRow}>
              <span style={styles.toolsLabel}>사용한 도구:</span>
              {/* 중복 제거 후 표시 */}
              {[...new Set(result.tools_used)].map((tool) => (
                <span key={tool} style={styles.toolBadge}>
                  {TOOL_LABELS[tool] || tool}
                </span>
              ))}
            </div>
          )}

          {/* GPT 답변 */}
          <div style={styles.answerCard}>
            <p style={styles.answerText}>{result.answer}</p>
          </div>
        </div>
      )}

      {/* 사용 예시 (아직 결과 없을 때) */}
      {!result && !loading && (
        <div style={styles.examples}>
          <p style={styles.examplesTitle}>💡 이런 질문을 해보세요</p>
          {[
            'React와 관련된 프로젝트 추천해줘',
            '백엔드 사이드 프로젝트 뭐가 있어?',
            'https://github.com/facebook/react 이 레포지토리 스타가 몇 개야?',
            '게시판에서 AI 관련 프로젝트 찾아줘',
          ].map((ex) => (
            <button
              key={ex}
              style={styles.exampleBtn}
              onClick={() => setQuery(ex)}
            >
              {ex}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { maxWidth: '760px', margin: '0 auto', padding: '2rem 1rem' },
  backBtn: { background: 'none', border: 'none', color: '#339af0', fontSize: '0.9rem', marginBottom: '1rem', padding: 0, cursor: 'pointer' },
  header: { marginBottom: '1.5rem' },
  title: { fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.4rem' },
  subtitle: { color: '#868e96', fontSize: '0.9rem', lineHeight: '1.5' },
  form: { display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' },
  textarea: {
    padding: '0.75rem', border: '1px solid #dee2e6', borderRadius: '8px',
    fontSize: '0.95rem', resize: 'vertical', lineHeight: '1.6', fontFamily: 'inherit',
  },
  submitBtn: {
    alignSelf: 'flex-end', padding: '0.6rem 1.5rem',
    background: '#f03e3e', color: '#fff', border: 'none', borderRadius: '8px',
    fontWeight: '600', fontSize: '0.95rem', cursor: 'pointer',
  },
  error: { color: '#fa5252', fontSize: '0.9rem', marginBottom: '1rem' },
  resultWrap: { marginTop: '0.5rem' },
  toolsRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' },
  toolsLabel: { fontSize: '0.8rem', color: '#868e96' },
  toolBadge: {
    fontSize: '0.78rem', padding: '0.2rem 0.6rem',
    background: '#fff3bf', color: '#e67700', border: '1px solid #ffe066',
    borderRadius: '12px', fontWeight: '500',
  },
  answerCard: {
    background: '#fff', borderRadius: '10px', padding: '1.25rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)', lineHeight: '1.8',
  },
  answerText: { fontSize: '0.95rem', color: '#212529', whiteSpace: 'pre-wrap', margin: 0 },
  examples: { marginTop: '2rem' },
  examplesTitle: { fontSize: '0.85rem', color: '#868e96', marginBottom: '0.75rem' },
  exampleBtn: {
    display: 'block', width: '100%', textAlign: 'left',
    padding: '0.65rem 0.9rem', marginBottom: '0.4rem',
    background: '#fff', border: '1px solid #dee2e6', borderRadius: '8px',
    fontSize: '0.88rem', color: '#495057', cursor: 'pointer',
  },
}
