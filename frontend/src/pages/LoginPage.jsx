import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

export default function LoginPage() {
  // 현재 탭: 'login' | 'signup'
  const [tab, setTab] = useState('login')

  // 폼 입력값 상태
  const [form, setForm] = useState({ email: '', password: '', nickname: '' })

  // 에러 메시지
  const [error, setError] = useState('')

  const navigate = useNavigate()

  // 입력 필드 변경 시 form 상태 업데이트
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  // 폼 제출
  const handleSubmit = async (e) => {
    e.preventDefault() // 기본 새로고침 방지
    setError('')

    try {
      if (tab === 'login') {
        const res = await api.post('/auth/login', {
          email: form.email,
          password: form.password,
        })
        // JWT 토큰을 localStorage에 저장
        localStorage.setItem('token', res.data.token)
        localStorage.setItem('nickname', res.data.nickname) // 닉네임 저장
        navigate('/posts')

      } else {
        await api.post('/auth/signup', {
          email: form.email,
          password: form.password,
          nickname: form.nickname,
        })
        // 회원가입 성공 → 로그인 탭으로 전환
        setTab('login')
        setForm({ email: form.email, password: '', nickname: '' })
        alert('회원가입 완료! 로그인해주세요.')
      }
    } catch (err) {
      setError(err.response?.data?.message || '요청에 실패했습니다.')
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>사이드 프로젝트 게시판</h1>

        {/* 탭 전환 버튼 */}
        <div style={styles.tabs}>
          <button
            style={tab === 'login' ? styles.tabActive : styles.tab}
            onClick={() => { setTab('login'); setError('') }}
          >
            로그인
          </button>
          <button
            style={tab === 'signup' ? styles.tabActive : styles.tab}
            onClick={() => { setTab('signup'); setError('') }}
          >
            회원가입
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            style={styles.input}
            type="email"
            name="email"
            placeholder="이메일"
            value={form.email}
            onChange={handleChange}
            required
          />
          <input
            style={styles.input}
            type="password"
            name="password"
            placeholder="비밀번호"
            value={form.password}
            onChange={handleChange}
            required
          />
          {/* 회원가입 탭일 때만 닉네임 필드 표시 */}
          {tab === 'signup' && (
            <input
              style={styles.input}
              type="text"
              name="nickname"
              placeholder="닉네임"
              value={form.nickname}
              onChange={handleChange}
              required
            />
          )}

          {error && <p style={styles.error}>{error}</p>}

          <button style={styles.button} type="submit">
            {tab === 'login' ? '로그인' : '회원가입'}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f8f9fa',
  },
  card: {
    background: '#fff',
    borderRadius: '12px',
    padding: '2rem',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: '1.5rem',
    color: '#212529',
  },
  tabs: {
    display: 'flex',
    marginBottom: '1.5rem',
    borderBottom: '2px solid #e9ecef',
  },
  tab: {
    flex: 1,
    padding: '0.5rem',
    background: 'none',
    border: 'none',
    color: '#868e96',
    fontSize: '0.95rem',
    cursor: 'pointer',
  },
  tabActive: {
    flex: 1,
    padding: '0.5rem',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid #339af0',
    color: '#339af0',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '-2px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  input: {
    padding: '0.625rem 0.75rem',
    border: '1px solid #dee2e6',
    borderRadius: '6px',
    fontSize: '0.95rem',
    outline: 'none',
  },
  button: {
    padding: '0.625rem',
    background: '#339af0',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.95rem',
    fontWeight: '600',
    marginTop: '0.25rem',
  },
  error: {
    color: '#fa5252',
    fontSize: '0.85rem',
  },
}