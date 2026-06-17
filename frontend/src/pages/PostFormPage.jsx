import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api/axios'
import aiApi from '../api/aiApi'
import AIBadge from '../components/ui/AIBadge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Select from '../components/ui/Select'
import TagChip from '../components/ui/TagChip'
import Textarea from '../components/ui/Textarea'
import TextInput from '../components/ui/TextInput'

export default function PostFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [form, setForm] = useState({
    title: '',
    content: '',
    githubUrl: '',
    tagInput: '',
    tags: [],
    domainId: '',
    projectTypeId: '',
  })
  const [domains, setDomains] = useState([])
  const [projectTypes, setProjectTypes] = useState([])
  const [suggestedTags, setSuggestedTags] = useState([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  useEffect(() => {
    const fetchCategories = async () => {
      const [domainRes, typeRes] = await Promise.all([
        api.get('/categories', { params: { type: 'DOMAIN' } }),
        api.get('/categories', { params: { type: 'PROJECT_TYPE' } }),
      ])
      setDomains(domainRes.data)
      setProjectTypes(typeRes.data)
    }

    const fetchPost = async () => {
      const res = await api.get(`/posts/${id}`)
      const post = res.data
      setForm((prev) => ({
        ...prev,
        title: post.title || '',
        content: post.content || '',
        githubUrl: post.githubUrl || '',
        tags: post.tags || [],
      }))
    }

    fetchCategories()
    if (isEdit) fetchPost()
  }, [id, isEdit])

  useEffect(() => {
    if (!isEdit || domains.length === 0 || projectTypes.length === 0) return

    const fetchPostForCategory = async () => {
      const res = await api.get(`/posts/${id}`)
      const post = res.data
      const matchedDomain = domains.find((domain) => domain.name === post.domainName)
      const matchedType = projectTypes.find((type) => type.name === post.projectTypeName)
      setForm((prev) => ({
        ...prev,
        domainId: matchedDomain ? String(matchedDomain.id) : '',
        projectTypeId: matchedType ? String(matchedType.id) : '',
      }))
    }

    fetchPostForCategory()
  }, [domains, projectTypes, isEdit, id])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const tag = form.tagInput.trim()
      if (tag && !form.tags.includes(tag)) {
        setForm((prev) => ({ ...prev, tags: [...prev.tags, tag], tagInput: '' }))
      } else {
        setForm((prev) => ({ ...prev, tagInput: '' }))
      }
    }
  }

  const removeTag = (tagToRemove) => {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((tag) => tag !== tagToRemove) }))
  }

  const addSuggestedTag = (tagName) => {
    if (!form.tags.includes(tagName)) {
      setForm((prev) => ({ ...prev, tags: [...prev.tags, tagName] }))
    }
  }

  const handleSuggestTags = async () => {
    if (!form.title.trim() && !form.content.trim()) return
    setLoadingSuggestions(true)
    setSuggestedTags([])

    try {
      const ragRes = await aiApi.post('/rag/suggest-tags', {
        title: form.title,
        content: form.content,
      })
      const ragTags = ragRes.data.tags || []

      let githubTags = []
      if (form.githubUrl.trim().startsWith('https://github.com/')) {
        try {
          const ghRes = await aiApi.get(`/mcp/github/repo?url=${encodeURIComponent(form.githubUrl)}`)
          if (!ghRes.data.error) {
            const topics = (ghRes.data.topics || []).map((topic) => ({ name: topic, source: 'github' }))
            const language = ghRes.data.language && ghRes.data.language !== 'Unknown'
              ? [{ name: ghRes.data.language, source: 'github' }]
              : []
            githubTags = [...topics, ...language]
          }
        } catch {
          // GitHub 조회가 실패해도 RAG 추천은 표시한다.
        }
      }

      const githubNames = new Set(githubTags.map((tag) => tag.name))
      setSuggestedTags([
        ...githubTags,
        ...ragTags.filter((tag) => !githubNames.has(tag.name)),
      ])
    } catch (e) {
      console.error('태그 추천 실패', e)
    } finally {
      setLoadingSuggestions(false)
    }
  }

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
      await api.put(`/posts/${id}`, payload)
      navigate(`/posts/${id}`)
    } else {
      const res = await api.post('/posts', payload)
      navigate(`/posts/${res.data.id}`)
    }
  }

  return (
    <main className="app-shell">
      <div className="app-container">
        <button className="back-button" type="button" onClick={() => navigate(-1)}>
          ‹ 뒤로가기
        </button>

        <header className="page-header">
          <h1 className="page-title">{isEdit ? '게시글 수정' : '새 게시글 작성'}</h1>
          <p className="page-subtitle">
            프로젝트 소개와 GitHub URL을 함께 남기면 AI 추천 품질이 좋아집니다.
          </p>
        </header>

        <Card>
          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="field-stack">
              <label className="field-label">제목 *</label>
              <TextInput
                name="title"
                value={form.title}
                onChange={handleChange}
                required
                placeholder="프로젝트 제목을 입력하세요"
              />
            </div>

            <div className="field-stack">
              <label className="field-label">내용 *</label>
              <Textarea
                name="content"
                value={form.content}
                onChange={handleChange}
                required
                rows={8}
                placeholder="프로젝트를 소개해주세요"
              />
            </div>

            <div className="field-stack">
              <label className="field-label">GitHub URL</label>
              <TextInput
                name="githubUrl"
                value={form.githubUrl}
                onChange={handleChange}
                placeholder="https://github.com/..."
              />
            </div>

            <div className="field-stack">
              <label className="field-label">도메인</label>
              <Select name="domainId" value={form.domainId} onChange={handleChange}>
                <option value="">선택 안 함</option>
                {domains.map((domain) => (
                  <option key={domain.id} value={domain.id}>{domain.name}</option>
                ))}
              </Select>
            </div>

            <div className="field-stack">
              <label className="field-label">프로젝트 유형</label>
              <Select name="projectTypeId" value={form.projectTypeId} onChange={handleChange}>
                <option value="">선택 안 함</option>
                {projectTypes.map((type) => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </Select>
            </div>

            <div className="field-stack">
              <div className="page-header--split" style={{ marginBottom: 0 }}>
                <label className="field-label">태그</label>
                <Button
                  variant="ai"
                  onClick={handleSuggestTags}
                  disabled={loadingSuggestions || (!form.title.trim() && !form.content.trim())}
                >
                  {loadingSuggestions ? '분석 중...' : 'AI 태그 추천'}
                </Button>
              </div>

              <div className="tag-input-box">
                {form.tags.map((tag) => (
                  <TagChip key={tag}>
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      style={{ border: 0, background: 'transparent', color: 'inherit', padding: 0 }}
                      aria-label={`${tag} 태그 삭제`}
                    >
                      ×
                    </button>
                  </TagChip>
                ))}
                <input
                  name="tagInput"
                  value={form.tagInput}
                  onChange={handleChange}
                  onKeyDown={handleTagKeyDown}
                  placeholder="태그 입력 후 Enter"
                />
              </div>

              <div className="ai-assist-box">
                <div className="inline-row" style={{ marginBottom: suggestedTags.length ? 10 : 0 }}>
                  <AIBadge>추천 태그</AIBadge>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
                    GitHub topics와 유사 게시글 태그를 함께 참고합니다.
                  </span>
                </div>
                {suggestedTags.length > 0 && (
                  <div className="chip-row">
                    {suggestedTags.map(({ name, source }) => {
                      const alreadyAdded = form.tags.includes(name)
                      const isGithub = source === 'github'
                      return (
                        <TagChip
                          key={name}
                          as="button"
                          type="button"
                          github={isGithub}
                          disabled={alreadyAdded}
                          onClick={() => addSuggestedTag(name)}
                        >
                          {alreadyAdded ? `✓ ${name}` : isGithub ? `GitHub ${name}` : `+ ${name}`}
                        </TagChip>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="action-row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
              <Button variant="ghost" onClick={() => navigate(-1)}>취소</Button>
              <Button type="submit">{isEdit ? '수정 완료' : '작성 완료'}</Button>
            </div>
          </form>
        </Card>
      </div>
    </main>
  )
}
