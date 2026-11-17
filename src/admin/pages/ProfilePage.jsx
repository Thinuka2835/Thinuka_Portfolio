import { useEffect, useState } from 'react'
import { get, put } from '../api'
import { ImageField } from '../components/MediaPicker'
import { Field, Notice, PageHeader, Spinner } from '../ui'

const TEXT_FIELDS = [
  { name: 'name', label: 'Name', required: true, max: 80 },
  { name: 'greeting', label: 'Greeting', hint: 'Shown before your name in the hero, e.g. “Hi Folks! I’m”', max: 80 },
  { name: 'titleLine1', label: 'Title — first line', required: true, max: 40 },
  { name: 'titleHighlight', label: 'Title — highlighted word', required: true, max: 40 },
  { name: 'role', label: 'Specialities line', hint: 'Under the hero title, e.g. “Agile · Scrum · Delivery”', max: 200 },
  { name: 'availability', label: 'Availability badge', hint: 'Leave empty to hide the badge', max: 80 },
  { name: 'quote', label: 'About — headline quote', max: 300 },
  { name: 'highlightedWord', label: 'About — word to highlight in the quote', max: 40 },
]
const CONTACT_FIELDS = [
  { name: 'email', label: 'Public email', type: 'email', hint: 'Shown on the site and in the contact fallback. Leave empty to hide.' },
  { name: 'phone', label: 'Phone', type: 'tel', hint: 'Leave empty to hide.' },
  { name: 'location', label: 'Location', hint: 'Leave empty to hide.' },
  { name: 'resumeUrl', label: 'Résumé URL', type: 'url', hint: 'Full https:// link to a PDF. Leave empty to hide the résumé buttons.' },
]

export default function ProfilePage() {
  const [profile, setProfile] = useState(null)
  const [hero, setHero] = useState(null)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState(null)
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    Promise.all([get('/settings/profile'), get('/media')])
      .then(([{ profile }, { items }]) => {
        setProfile(profile)
        setHero(items.find((m) => m.id === profile.heroImageId) || null)
      })
      .catch((e) => setLoadError(e.message))
  }, [])

  const set = (k) => (e) => setProfile((p) => ({ ...p, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErrors({})
    setMessage(null)
    try {
      const { profile: saved } = await put('/settings/profile', { ...profile, heroImageId: hero?.id ?? null })
      setProfile(saved)
      setMessage({ tone: 'success', text: 'Saved. The live site shows the change within about a minute (link previews refresh on the next deploy).' })
    } catch (err) {
      setErrors(err.fields)
      setMessage({ tone: 'error', text: err.message })
    } finally {
      setBusy(false)
    }
  }

  if (loadError) return <Notice tone="error">{loadError}</Notice>
  if (!profile) return <Spinner />

  const input = (f) => (
    <Field key={f.name} label={f.label} hint={f.hint} error={errors[f.name]} required={f.required}>
      {(p) => <input {...p} className="a-input" type={f.type || 'text'} maxLength={f.max} value={profile[f.name] ?? ''} onChange={set(f.name)} />}
    </Field>
  )

  return (
    <>
      <PageHeader title="Profile & settings" description="Your name, hero, about text and public contact details." />
      {message && <Notice tone={message.tone} onDismiss={() => setMessage(null)}>{message.text}</Notice>}
      <form className="a-form" onSubmit={submit} noValidate>
        <section className="a-card">
          <h2 className="a-card-title">Hero & about</h2>
          <div className="a-form-grid">{TEXT_FIELDS.map(input)}</div>
          <Field label="About — bio" error={errors.bio}>
            {(p) => <textarea {...p} className="a-input" rows={5} maxLength={2000} value={profile.bio} onChange={set('bio')} />}
          </Field>
          <div className="a-field">
            <span className="a-label">Hero photo</span>
            <ImageField value={hero} onChange={setHero} label="Photo" />
            <p className="a-hint">A portrait with a transparent background works best. Without one, the built-in photo is used.</p>
            {errors.heroImageId && <p className="a-error">{errors.heroImageId}</p>}
          </div>
        </section>
        <section className="a-card">
          <h2 className="a-card-title">Contact details</h2>
          <div className="a-form-grid">{CONTACT_FIELDS.map(input)}</div>
        </section>
        <div className="a-form-actions a-form-actions--sticky">
          <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
        </div>
      </form>
    </>
  )
}
