import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api/axios'
import aiApi from '../api/aiApi'

export default function PostFormPage() {
  const { id } = useParams()            // id 있으면 수정 모드, 없으면 작성 모드
  const isEdit = Boolean(id)            // true/false로 모드 구분
  const navigate = useNavigate()

  // 폼 상태 — 작성/수정 모두 같은 구조
  const [form, setForm] = useState({
    title: '',
    content: '',
    githubUrl: '',
    tagInput: '',   // 태그 입력 중인 텍스트 (엔터로 추가)
    tags: [],       // 최종 태그 배열
    domainId: '',
    projectTypeId: '',
  })

  // 카테고리 목록
  const [domains, setDomains] = useState([])
  const [projectTypes, setProjectTypes] = useState([])

  // 태그 추천 상태
  const [suggestedTags, setSuggestedTags] = useState([])   // 추천된 태그 목록
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  useEffect(() => {
    // 카테고리 목록 불러오기
    const fetchCategories = async () => {
      const [domainRes, typeRes] = await Promise.all([
        api.get('/categories', { params: { type: 'DOMAIN' } }),
        api.get('/categories', { params: { type: 'PROJECT_TYPE' } }),
      ])
      setDomains(domainRes.data)
      setProjectTypes(typeRes.data)
    }

    // 수정 모드면 기존 게시글 데이터로 폼 채우기
    const fetchPost = async () => {
      const res = await api.get(`/posts/${id}`)
      const post = res.data
      setForm(prev => ({
        ...prev,
        title: post.title || '',
        content: post.content || '',
        githubUrl: post.githubUrl || '',
        tags: post.tags || [],
        // domainId/projectTypeId는 name으로 오는데, 셀렉트박스는 id 필요
        // 카테고리 로드 후 매핑하므로 일단 비워둠 (아래에서 처리)
      }))
    }

    fetchCategories()
    if (isEdit) fetchPost()
  }, [id, isEdit])

  // 수정 모드에서 카테고리 이름 → id 매핑 (categories 로드 완료 후)
  useEffect(() => {
    if (!isEdit || domains.length === 0 || projectTypes.length === 0) return

    const fetchPostForCategory = async () => {
      const res = await api.get(`/posts/${id}`)
      const post = res.data
      const matchedDomain = domains.find(d => d.name === post.domainName)
      const matchedType = projectTypes.find(t => t.name === post.projectTypeName)
      setForm(prev => ({
        ...prev,
        domainId: matchedDomain ? String(matchedDomain.id) : '',
        projectTypeId: matchedType ? String(matchedType.id) : '',
      }))
    }

    fetchPostForCategory()
  }, [domains, projectTypes, isEdit, id])

  // 일반 input/select 변경 처리
  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  // 태그 입력 — 엔터 또는 쉼표로 추가
  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const tag = form.tagInput.trim()
      if (tag && !form.tags.includes(tag)) {
        setForm(prev => ({ ...prev, tags: [...prev.tags, tag], tagInput: '' }))
      } else {
        setForm(prev => ({ ...prev, tagInput: '' }))
      }
    }
  }

  // 태그 삭제
  const removeTag = (tagToRemove) => {
    setForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tagToRemove) }))
  }

  // 추천 태그 클릭 → 태그 목록에 추가 (중복 제외)
  const addSuggestedTag = (tagName) => {
    if (!form.tags.includes(tagName)) {
      setForm(prev => ({ ...prev, tags: [...prev.tags, tagName] }))
    }
  }

  // AI 태그 추천 요청 — GitHub topics/language + RAG 유사 게시글 태그 합산
  const handleSuggestTags = async () => {
    if (!form.title.trim() && !form.content.trim()) return
    setLoadingSuggestions(true)
    setSuggestedTags([])

    try {
      // RAG 태그 추천 (유사 게시글 빈도 기반)
      const ragRes = await aiApi.post('/rag/suggest-tags', {
        title: form.title,
        content: form.content,
      })
      const ragTags = ragRes.data.tags || []  // [{ name, count }]

      // GitHub topics + language (URL 있을 때만)
      let githubTags = []
      if (form.githubUrl.trim().startsWith('https://github.com/')) {
        try {
          const ghRes = await aiApi.get(`/mcp/github/repo?url=${encodeURIComponent(form.githubUrl)}`)
          if (!ghRes.data.error) {
            const topics = (ghRes.data.topics || []).map(t => ({ name: t, source: 'github' }))
            const lang = ghRes.data.language && ghRes.data.language !== 'Unknown'
              ? [{ name: ghRes.data.language, source: 'github' }]
              : []
            githubTags = [...topics, ...lang]
          }
        } catch (_) { /* GitHub 조회 실패해도 RAG 결과는 보여줌 */ }
      }

      // GitHub 태그를 앞에, RAG 태그를 뒤에 — 중복 제거
      const githubNames = new Set(githubTags.map(t => t.name))
      const merged = [
        ...githubTags,
        ...ragTags.filter(t => !githubNames.has(t.name)),
      ]
      setSuggestedTags(merged)
    } catch (e) {
      console.error('태그 추천 실패', e)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  // 폼 제출
  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      title: form.title,
      content: form.content,
      githubUrl: form.githubUrl || null,
      tags: form.tags,
      domainId: form.domainId ? Number(form.domainId) : null,
      projectTypeId: form.projectTypeId ? Number(form.projectTypeId) : null,
    }

    if (isEdit) {
      await api.put(`/posts/${id}`, payload)   // 수정
      navigate(`/posts/${id}`)
    } else {
      const res = await api.post('/posts', payload)  // 작성
      navigate(`/posts/${res.data.id}`)
    }
  }

  return (
    <div style={styles.container}>
      <h2>{isEdit ? '게시글 수정' : '새 게시글 작성'}</h2>

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* 제목 */}
        <div style={styles.field}>
          <label>제목 *</label>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            required
            style={styles.input}
            placeholder="프로젝트 제목을 입력하세요"
          />
        </div>

        {/* 내용 */}
        <div style={styles.field}>
          <label>내용 *</label>
          <textarea
            name="content"
            value={form.content}
            onChange={handleChange}
            required
            style={styles.textarea}
            placeholder="프로젝트를 소개해주세요"
            rows={8}
          />
        </div>

        {/* GitHub URL */}
        <div style={styles.field}>
          <label>GitHub URL</label>
          <input
            name="githubUrl"
            value={form.githubUrl}
            onChange={handleChange}
            style={styles.input}
            placeholder="https://github.com/..."
          />
        </div>

        {/* 도메인 카테고리 */}
        <div style={styles.field}>
          <label>도메인</label>
          <select name="domainId" value={form.domainId} onChange={handleChange} style={styles.select}>
            <option value="">선택 안 함</option>
            {domains.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* 성격 카테고리 */}
        <div style={styles.field}>
          <label>프로젝트 유형</label>
          <select name="projectTypeId" value={form.projectTypeId} onChange={handleChange} style={styles.select}>
            <option value="">선택 안 함</option>
            {projectTypes.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {/* 태그 */}
        <div style={styles.field}>
          <div style={styles.tagLabelRow}>
            <label>태그 (엔터로 추가)</label>
            {/* AI 태그 추천 버튼 — 제목/내용 입력 후 클릭 */}
            <button
              type="button"
              onClick={handleSuggestTags}
              disabled={loadingSuggestions || (!form.title.trim() && !form.content.trim())}
              style={styles.suggestBtn}
            >
              {loadingSuggestions ? '분석 중...' : '✨ AI 태그 추천'}
            </button>
          </div>

          <div style={styles.tagBox}>
            {form.tags.map(tag => (
              <span key={tag} style={styles.tag}>
                {tag}
                <button type="button" onClick={() => removeTag(tag)} style={styles.tagRemove}>×</button>
              </span>
            ))}
            <input
              name="tagInput"
              value={form.tagInput}
              onChange={handleChange}
              onKeyDown={handleTagKeyDown}
              style={styles.tagInput}
              placeholder="태그 입력 후 엔터"
            />
          </div>

          {/* 추천 태그 칩 — 클릭하면 태그에 추가 */}
          {suggestedTags.length > 0 && (
            <div style={styles.suggestionsWrap}>
              <span style={styles.suggestionsLabel}>추천 태그:</span>
              {suggestedTags.map(({ name, source }) => {
                const alreadyAdded = form.tags.includes(name)
                const isGithub = source === 'github'
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => addSuggestedTag(name)}
                    disabled={alreadyAdded}
                    style={{
                      ...styles.suggestionChip,
                      ...(isGithub ? styles.suggestionChipGithub : {}),
                      ...(alreadyAdded ? styles.suggestionChipAdded : {}),
                    }}
                  >
                    {alreadyAdded ? `✓ ${name}` : isGithub ? `🐙 ${name}` : `+ ${name}`}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* 버튼 */}
        <div style={styles.buttons}>
          <button type="button" onClick={() => navigate(-1)} style={styles.cancelBtn}>취소</button>
          <button type="submit" style={styles.submitBtn}>
            {isEdit ? '수정 완료' : '작성 완료'}
          </button>
        </div>
      </form>
    </div>
  )
}

const styles = {
  container: { maxWidth: 700, margin: '40px auto', padding: '0 20px' },
  form: { display: 'flex', flexDirection: 'column', gap: 20 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  input: { padding: '10px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 15 },
  textarea: { padding: '10px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 15, resize: 'vertical' },
  select: { padding: '10px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 15 },
  tagBox: {
    display: 'flex', flexWrap: 'wrap', gap: 8, padding: '8px 12px',
    border: '1px solid #ddd', borderRadius: 6, minHeight: 44,
  },
  tag: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    background: '#e8f0fe', color: '#1a56db', padding: '4px 10px', borderRadius: 20, fontSize: 13,
  },
  tagRemove: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#555', padding: 0 },
  tagInput: { border: 'none', outline: 'none', fontSize: 14, minWidth: 120, flex: 1 },
  buttons: { display: 'flex', gap: 12, justifyContent: 'flex-end' },
  cancelBtn: { padding: '10px 24px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 15 },
  submitBtn: { padding: '10px 24px', borderRadius: 6, border: 'none', background: '#1a56db', color: '#fff', cursor: 'pointer', fontSize: 15 },
  tagLabelRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  suggestBtn: {
    padding: '4px 12px', fontSize: 12, borderRadius: 20,
    border: '1px solid #7950f2', background: '#fff', color: '#7950f2',
    cursor: 'pointer',
  },
  suggestionsWrap: { display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 6 },
  suggestionsLabel: { fontSize: 12, color: '#868e96' },
  suggestionChip: {
    padding: '4px 12px', fontSize: 12, borderRadius: 20,
    border: '1px solid #7950f2', background: '#f3f0ff', color: '#7950f2',
    cursor: 'pointer',
  },
  suggestionChipGithub: {
    border: '1px solid #4a9edd', background: '#e8f4fd', color: '#1a5f8a',
  },
  suggestionChipAdded: {
    border: '1px solid #dee2e6', background: '#f8f9fa', color: '#adb5bd',
    cursor: 'default',
  },
}