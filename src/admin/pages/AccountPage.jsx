import { useState } from 'react'
import { post } from '../api'
import { useAuth } from '../auth'
import { Field, Notice, PageHeader, formatDateTime } from '../ui'

export default function AccountPage() {
  const { user, session, logout } = useAuth()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setErrors({})
    setMessage(null)
    if (form.newPassword !== form.confirm) return setErrors({ confirm: 'Passwords don’t match.' })
    setBusy(true)
    try {
      await post('/auth/password', { currentPassword: form.currentPassword, newPassword: form.newPassword })
      setForm({ currentPassword: '', newPassword: '', confirm: '' })
      setMessage({ tone: 'success', text: 'Password changed. Other sessions were signed out.' })
    } catch (err) {
      setErrors(err.fields)
      if (!Object.keys(err.fields).length) setMessage({ tone: 'error', text: err.message })
    } finally {
      setBusy(false)
    }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <>
      <PageHeader title="Account" description={user.email} />
      <section className="a-card" aria-labelledby="session-h">
        <h2 id="session-h" className="a-card-title">This session</h2>
        <p>Signs out automatically at {formatDateTime(session.expiresAt)}, or after a period of inactivity.</p>
        <div className="a-form-actions a-form-actions--start">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => logout(false)}>Sign out</button>
          <button type="button" className="btn btn--danger btn--sm" onClick={() => logout(true)}>Sign out everywhere</button>
        </div>
      </section>

      <section className="a-card" aria-labelledby="pw-h">
        <h2 id="pw-h" className="a-card-title">Change password</h2>
        {message && <Notice tone={message.tone}>{message.text}</Notice>}
        <form className="a-form a-form--narrow" onSubmit={submit} noValidate>
          <Field label="Current password" error={errors.currentPassword}>
            {(p) => <input {...p} className="a-input" type="password" autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')} />}
          </Field>
          <Field label="New password" hint="At least 12 characters. A passphrase works well." error={errors.newPassword}>
            {(p) => <input {...p} className="a-input" type="password" autoComplete="new-password" value={form.newPassword} onChange={set('newPassword')} />}
          </Field>
          <Field label="Repeat new password" error={errors.confirm}>
            {(p) => <input {...p} className="a-input" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} />}
          </Field>
          <div className="a-form-actions a-form-actions--start">
            <button type="submit" className="btn btn--primary btn--sm" disabled={busy}>{busy ? 'Saving…' : 'Change password'}</button>
          </div>
        </form>
      </section>
    </>
  )
}
