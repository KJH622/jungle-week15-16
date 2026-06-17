import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import aiApi from '../api/aiApi'

export default function SearchPage() {
  const [query, setQuery] = useState('')        // 사용자 입력 질문
  const [answer, setAnswer] = useState('')      // GPT 답변
  const [sources, setSources] = useState([])   // 참고한 게시글 목록
  const [loading, setLoading] = useState(false) // 로딩 상태
  const [error, setError] = useState('')        // 에러 메시지
  const [searched, setSearched] = useState(false) // 검색 완료 여부 (결과 영역 표시 제어)

  const navigate = useNavigate()

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setError('')
    setAnswer('')
    setSources([])
    setSearched(true)

    try {
      // FastAPI POST /rag/search → { answer, sources: [{title, author}] }
      const res = await aiApi.post('/rag/search', { query })
      setAnswer(res.data.answer)
      setSources(res.data.sources)
    } catch (e) {
      setError('검색 중 오류가 발생했습니다. AI 서버가 실행 중인지 확인해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    // Enter로 검색 (Shift+Enter는 줄바꿈 허용)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/posts')}>← 목록으로</button>
        <h1 style={styles.title}>AI 프로젝트 검색</h1>
        <p style={styles.subtitle}>자연어로 질문하면 게시판 내용을 바탕으로 답변해드립니다.</p>
      </div>

      {/* 질문 입력 영역 */}
      <div style={styles.searchBox}>
        <textarea
          style={styles.textarea}
          placeholder="예: 웹개발 프로젝트 추천해줘, React 관련 게시글 있어?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
        />
        <button
          style={{ ...styles.searchBtn, opacity: loading ? 0.6 : 1 }}
          onClick={handleSearch}
          disabled={loading || !query.trim()}
        >
          {loading ? '검색 중...' : '검색'}
        </button>
      </div>

      {/* 에러 */}
      {error && <p style={styles.error}>{error}</p>}

      {/* 결과 영역 — 검색 완료 후에만 표시 */}
      {searched && !loading && !error && (
        <div style={styles.result}>
          {/* GPT 답변 */}
          <div style={styles.answerBox}>
            <p style={styles.sectionLabel}>AI 답변</p>
            <p style={styles.answerText}>{answer}</p>
          </div>

          {/* 참고 게시글 */}
          {sources.length > 0 && (
            <div style={styles.sourcesBox}>
              <p style={styles.sectionLabel}>참고한 게시글</p>
              <div style={styles.sourceList}>
                {sources.map((s, i) => (
                  <div
                    key={i}
                    style={styles.sourceCard}
                    onClick={() => navigate(`/posts/${s.id}`)}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#e9ecef'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#f8f9fa'}
                  >
                    <span style={styles.sourceTitle}>{s.title}</span>
                    <span style={styles.sourceAuthor}>{s.author} →</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 로딩 중 */}
      {loading && (
        <div style={styles.loadingBox}>
          <p style={styles.loadingText}>게시글을 분석하는 중입니다...</p>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' },
  header: { marginBottom: '2rem' },
  backBtn: {
    background: 'none', border: 'none', color: '#868e96',
    cursor: 'pointer', fontSize: '0.9rem', padding: '0 0 0.75rem 0',
  },
  title: { fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' },
  subtitle: { fontSize: '0.9rem', color: '#868e96', margin: 0 },

  searchBox: { display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' },
  textarea: {
    width: '100%', padding: '0.875rem 1rem', fontSize: '0.95rem',
    border: '1px solid #dee2e6', borderRadius: '8px', resize: 'vertical',
    fontFamily: 'inherit', lineHeight: '1.6', boxSizing: 'border-box',
  },
  searchBtn: {
    alignSelf: 'flex-end', padding: '0.6rem 2rem',
    background: '#339af0', color: '#fff', border: 'none',
    borderRadius: '6px', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer',
  },

  error: { color: '#e03131', fontSize: '0.9rem', marginBottom: '1rem' },

  loadingBox: {
    textAlign: 'center', padding: '3rem 0',
    border: '1px dashed #dee2e6', borderRadius: '8px',
  },
  loadingText: { color: '#868e96', fontSize: '0.95rem' },

  result: { display: 'flex', flexDirection: 'column', gap: '1.25rem' },

  answerBox: {
    background: '#fff', borderRadius: '8px', padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  sectionLabel: {
    fontSize: '0.75rem', fontWeight: '600', color: '#339af0',
    textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem',
  },
  answerText: { fontSize: '0.95rem', lineHeight: '1.8', color: '#212529', margin: 0, whiteSpace: 'pre-wrap' },

  sourcesBox: {
    background: '#fff', borderRadius: '8px', padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  sourceList: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  sourceCard: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '0.75rem 1rem', background: '#f8f9fa', borderRadius: '6px',
    cursor: 'pointer', transition: 'background 0.15s',
  },
  sourceTitle: { fontSize: '0.9rem', fontWeight: '500', color: '#212529' },
  sourceAuthor: { fontSize: '0.8rem', color: '#868e96' },
}
