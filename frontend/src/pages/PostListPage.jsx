import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api/axios'
import AIBadge from '../components/ui/AIBadge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import LoadingIndicator from '../components/ui/LoadingIndicator'
import Pagination from '../components/ui/Pagination'
import PostCard from '../components/ui/PostCard'
import Select from '../components/ui/Select'
import TextInput from '../components/ui/TextInput'

export default function PostListPage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalPages, setTotalPages] = useState(0)
  const [domains, setDomains] = useState([])
  const [projectTypes, setProjectTypes] = useState([])

  const [searchParams, setSearchParams] = useSearchParams()
  const keyword = searchParams.get('keyword') || ''
  const domainId = searchParams.get('domainId') || ''
  const projectTypeId = searchParams.get('projectTypeId') || ''
  const page = parseInt(searchParams.get('page') || '0', 10)
  const [inputValue, setInputValue] = useState(keyword)

  const navigate = useNavigate()

  useEffect(() => {
    api.get('/categories?type=DOMAIN').then((res) => setDomains(res.data))
    api.get('/categories?type=PROJECT_TYPE').then((res) => setProjectTypes(res.data))
  }, [])

  useEffect(() => {
    const params = { page, size: 10 }
    if (keyword) params.keyword = keyword
    if (domainId) params.domainId = domainId
    if (projectTypeId) params.projectTypeId = projectTypeId

    api.get('/posts', { params })
      .then((res) => {
        setPosts(res.data.content)
        setTotalPages(res.data.totalPages)
      })
      .finally(() => setLoading(false))
  }, [keyword, domainId, projectTypeId, page])

  const updateParams = (updates) => {
    const next = {}
    if (keyword) next.keyword = keyword
    if (domainId) next.domainId = domainId
    if (projectTypeId) next.projectTypeId = projectTypeId
    if (page) next.page = page
    Object.assign(next, updates)
    Object.keys(next).forEach((key) => {
      if (next[key] === '' || next[key] === null || next[key] === undefined || next[key] === 0) {
        delete next[key]
      }
    })
    setSearchParams(next)
  }

  const handleSearch = () => {
    updateParams({ keyword: inputValue.trim(), page: 0 })
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('nickname')
    navigate('/login')
  }

  return (
    <main className="app-shell">
      <div className="app-container app-container--wide">
        <header className="page-header--split">
          <div>
            <div className="page-title-row">
              <h1 className="page-title">사이드 프로젝트 게시판</h1>
              <AIBadge>관련 프로젝트 검색</AIBadge>
            </div>
            <p className="page-subtitle">프로젝트를 공유하고 비슷한 프로젝트를 찾아보세요.</p>
          </div>

          <div className="action-row">
            <Button variant="ai" onClick={() => navigate('/search')}>관련 프로젝트 검색</Button>
            <Button onClick={() => navigate('/posts/new')}>글 작성</Button>
            <Button variant="ghost" onClick={handleLogout}>로그아웃</Button>
          </div>
        </header>

        <Card className="filter-card" padded={false}>
          <TextInput
            type="text"
            placeholder="키워드 검색... (Enter로 검색)"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch()
            }}
            onBlur={handleSearch}
          />
          <Select value={domainId} onChange={(e) => updateParams({ domainId: e.target.value, page: 0 })}>
            <option value="">전체 도메인</option>
            {domains.map((domain) => (
              <option key={domain.id} value={domain.id}>{domain.name}</option>
            ))}
          </Select>
          <Select value={projectTypeId} onChange={(e) => updateParams({ projectTypeId: e.target.value, page: 0 })}>
            <option value="">전체 유형</option>
            {projectTypes.map((type) => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </Select>
        </Card>

        {loading ? (
          <LoadingIndicator>게시글을 불러오는 중입니다...</LoadingIndicator>
        ) : posts.length === 0 ? (
          <EmptyState>게시글이 없습니다.</EmptyState>
        ) : (
          <section className="source-list">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onClick={() => navigate(`/posts/${post.id}`)}
              />
            ))}
          </section>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          onPrev={() => updateParams({ page: page - 1 })}
          onNext={() => updateParams({ page: page + 1 })}
        />
      </div>
    </main>
  )
}
