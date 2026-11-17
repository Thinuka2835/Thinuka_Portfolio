import { useState } from 'react'
import { useAuth } from '../auth'
import { Field, Notice } from '../ui'
import ThemeToggle from '../../components/ThemeToggle/ThemeToggle'

export default function LoginPage() {
  const { login, notice } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    const fe = {}
    if (!email.trim()) fe.email = 'Enter your email.'
    if (!password) fe.password = 'Enter your password.'
    setFieldErrors(fe)
    if (Object.keys(fe).length) return
    setBusy(true)
    setError(null)
    try {
      await login(email.trim(), password)
    } catch (err) {
      setError(err.message)
      setFieldErrors(err.fields || {})
      setPassword('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="a-login">
      <div className="a-login-theme">
        <ThemeToggle />
      </div>
      <form className="a-login-card" onSubmit={submit} noValidate>
        <h1>Sign in</h1>
        <p className="a-muted">Site administration</p>
        {notice && !error && <Notice tone="info">{notice}</Notice>}
        {error && <Notice tone="error">{error}</Notice>}
        <Field label="Email" error={fieldErrors.email}>
          {(p) => <input {...p} className="a-input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />}
        </Field>
        <Field label="Password" error={fieldErrors.password}>
          {(p) => <input {...p} className="a-input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
        </Field>
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="a-hint">Accounts are created by the site owner from the command line. There is no self-registration.</p>
      </form>
    </main>
  )
}
