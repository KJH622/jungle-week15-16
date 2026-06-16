import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api/axios'

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
          <label>태그 (엔터로 추가)</label>
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
}