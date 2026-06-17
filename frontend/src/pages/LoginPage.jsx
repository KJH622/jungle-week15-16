import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import ErrorMessage from '../components/ui/ErrorMessage'
import TextInput from '../components/ui/TextInput'
import Toast from '../components/ui/Toast'

export default function LoginPage() {
  const [tab, setTab] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', nickname: '' })
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const navigate = useNavigate()

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 3000)
    return () => clearTimeout(timer)
  }, [toast])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const switchTab = (nextTab) => {
    setTab(nextTab)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      if (tab === 'login') {
        const res = await api.post('/auth/login', {
          email: form.email,
          password: form.password,
        })
        localStorage.setItem('token', res.data.token)
        localStorage.setItem('nickname', res.data.nickname)
        navigate('/posts')
        return
      }

      await api.post('/auth/signup', {
        email: form.email,
        password: form.password,
        nickname: form.nickname,
      })
      setTab('login')
      setForm({ email: form.email, password: '', nickname: '' })
      setToast('회원가입이 완료되었습니다. 로그인해주세요.')
    } catch (err) {
      setError(err.response?.data?.message || '요청에 실패했습니다.')
    }
  }

  return (
    <main className="auth-shell">
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div className="page-header" style={{ textAlign: 'center', marginBottom: 18 }}>
          <h1 className="page-title">사이드 프로젝트 게시판</h1>
          <p className="page-subtitle">로그인하고 프로젝트를 공유해보세요.</p>
        </div>

        <Card className="auth-card" padded={false}>
          <div className="tab-switcher">
            <button
              type="button"
              className={`tab-button ${tab === 'login' ? 'tab-button--active' : ''}`}
              onClick={() => switchTab('login')}
            >
              로그인
            </button>
            <button
              type="button"
              className={`tab-button ${tab === 'signup' ? 'tab-button--active' : ''}`}
              onClick={() => switchTab('signup')}
            >
              회원가입
            </button>
          </div>

          <form className="form-grid" onSubmit={handleSubmit}>
            <TextInput
              type="email"
              name="email"
              placeholder="이메일"
              value={form.email}
              onChange={handleChange}
              required
            />
            <TextInput
              type="password"
              name="password"
              placeholder="비밀번호"
              value={form.password}
              onChange={handleChange}
              required
            />
            {tab === 'signup' && (
              <TextInput
                type="text"
                name="nickname"
                placeholder="닉네임"
                value={form.nickname}
                onChange={handleChange}
                required
              />
            )}

            {error && <ErrorMessage>{error}</ErrorMessage>}

            <Button type="submit" style={{ width: '100%', marginTop: 6 }}>
              {tab === 'login' ? '로그인' : '회원가입'}
            </Button>
          </form>
        </Card>
      </div>
      <Toast message={toast} type="success" />
    </main>
  )
}
