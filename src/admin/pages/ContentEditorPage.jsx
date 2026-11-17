import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { FiArrowLeft, FiDownload, FiExternalLink, FiImage } from 'react-icons/fi'
import { CONTENT_TYPES, CONTENT_TYPE_KEYS, serializeMarkdownFile, validateFrontmatter } from '../../../shared/content.js'
import { renderMarkdown } from '../../../shared/markdown.js'
import { del, get, put } from '../api'
import { ImageField, MediaPickerDialog } from '../components/MediaPicker'
import { ConfirmDialog, Field, Notice, PageHeader, Spinner } from '../ui'
import Prose from '../../components/Prose/Prose'

const today = () => new Date().toISOString().slice(0, 10)
const slugify = (s) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

const blank = (type) => ({
  title: '',
  slug: '',
  description: '',
  date: type === 'pages' ? '' : today(),
  updated: '',
  tags: [],
  status: 'published',
  order: '',
  link: '',
  cover: null,
})

const localKey = (type, slug) => `admin-draft:${type}:${slug || 'new'}`
const readLocal = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null')
  } catch {
    return null
  }
}
const writeLocal = (key, value) => {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable */
  }
}

/** Frontmatter object for saving: drop empty optional values, coerce numbers. */
function toFrontmatter(fm) {
  const out = { ...fm, tags: fm.tags.filter(Boolean) }
  for (const k of ['date', 'updated', 'link']) if (!out[k]) delete out[k]
  if (out.order === '' || out.order === null || out.order === undefined) delete out.order
  else out.order = Number(out.order)
  if (!out.cover) delete out.cover
  return out
}

export default function ContentEditorPage() {
  const { type, slug: routeSlug } = useParams()
  const isNew = routeSlug === undefined
  const navigate = useNavigate()
  const location = useLocation()
  const [status, setStatus] = useState(null)
  const [loaded, setLoaded] = useState(isNew ? { sha: null, slug: null } : null)
  const [fm, setFm] = useState(blank(type))
  const [body, setBody] = useState('')
  const [slugTouched, setSlugTouched] = useState(!isNew)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState(() => (location.state?.saved ? { tone: 'success', res: location.state.saved } : null))
  const [saving, setSaving] = useState(false)
  const [view, setView] = useState('write') // write | preview (small screens)
  const [previewHtml, setPreviewHtml] = useState('')
  const [restore, setRestore] = useState(() => (isNew ? readLocal(localKey(type, null)) : null))
  const [confirm, setConfirm] = useState(null) // 'unpublish' | 'delete'
  const [pickerOpen, setPickerOpen] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const textareaRef = useRef(null)
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify({ fm: blank(type), body: '' }))

  const valid = CONTENT_TYPE_KEYS.includes(type)
  const key = localKey(type, isNew ? null : routeSlug)
  const snapshot = JSON.stringify({ fm, body })
  const dirty = loaded !== null && snapshot !== savedSnapshot

  // Load status + existing entry
  useEffect(() => {
    get('/status').then(setStatus).catch(() => {})
    if (!valid || isNew) return
    get(`/content/${type}/${routeSlug}`)
      .then((entry) => {
        const data = { ...blank(type), ...entry.frontmatter, tags: entry.frontmatter.tags || [], order: entry.frontmatter.order ?? '', cover: entry.frontmatter.cover || null }
        for (const k of ['date', 'updated']) if (data[k] instanceof Date) data[k] = data[k].toISOString().slice(0, 10)
        setFm(data)
        setBody(entry.body)
        setLoaded({ sha: entry.sha, slug: routeSlug })
        const snap = JSON.stringify({ fm: data, body: entry.body })
        setSavedSnapshot(snap)
        const local = readLocal(key)
        if (local && local.baseSha === entry.sha && JSON.stringify({ fm: local.fm, body: local.body }) !== snap) setRestore(local)
      })
      .catch((e) => setLoadError(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, routeSlug])

  // Autosave a local working copy (survives reloads and closed tabs)
  useEffect(() => {
    if (!dirty) return
    const t = setTimeout(() => writeLocal(key, { fm, body, baseSha: loaded?.sha ?? null, savedAt: new Date().toISOString() }), 600)
    return () => clearTimeout(t)
  }, [dirty, fm, body, key, loaded])

  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  // Live preview (same sanitizing pipeline as the published site)
  useEffect(() => {
    let cancelled = false
    const t = setTimeout(() => {
      renderMarkdown(body).then((html) => !cancelled && setPreviewHtml(html))
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [body])

  const clientErrors = useMemo(() => {
    const res = validateFrontmatter(type, toFrontmatter(fm))
    if (res.success) return {}
    return Object.fromEntries(res.error.issues.map((i) => [i.path.join('.'), i.message]))
  }, [fm, type])

  if (!valid) return <Notice tone="error">Unknown content type.</Notice>
  if (loadError) return <Notice tone="error">{loadError} <Link className="a-link" to="/content">Back to content</Link></Notice>
  if (!loaded) return <Spinner />

  const typeDef = CONTENT_TYPES[type]
  const allowDrafts = status?.content?.allowDrafts
  const writable = status?.content?.writable !== false
  const set = (k) => (e) => {
    const v = e.target.value
    setFm((f) => {
      const next = { ...f, [k]: v }
      if (k === 'title' && !slugTouched) next.slug = slugify(v)
      return next
    })
  }

  const save = async (nextStatus = fm.status) => {
    setErrors({})
    setMessage(null)
    const frontmatter = toFrontmatter({ ...fm, status: nextStatus })
    const check = validateFrontmatter(type, frontmatter)
    if (!check.success) {
      setErrors(Object.fromEntries(check.error.issues.map((i) => [`frontmatter.${i.path.join('.')}`, i.message])))
      setMessage({ tone: 'error', text: 'Please fix the highlighted fields.' })
      return
    }
    setSaving(true)
    try {
      const res = await put(`/content/${type}/${frontmatter.slug}`, {
        frontmatter,
        body,
        expectedSha: loaded.sha,
        ...(loaded.slug && loaded.slug !== frontmatter.slug ? { previousSlug: loaded.slug } : {}),
      })
      const nextFm = { ...fm, status: nextStatus }
      writeLocal(key, null)
      if (res.slug !== routeSlug) {
        // New entry or renamed: open its own editor URL (remounts with fresh state)
        navigate(`/content/${type}/${res.slug}`, { replace: true, state: { saved: res } })
        return
      }
      setFm(nextFm)
      setSavedSnapshot(JSON.stringify({ fm: nextFm, body }))
      setLoaded({ sha: res.sha, slug: res.slug })
      setMessage({ tone: 'success', res })
    } catch (err) {
      setErrors(err.fields || {})
      setMessage({ tone: 'error', text: err.message, conflict: err.status === 409 })
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    setSaving(true)
    try {
      if (confirm === 'unpublish' && allowDrafts) {
        setConfirm(null)
        await save('draft')
        return
      }
      await del(`/content/${type}/${loaded.slug}?sha=${loaded.sha}&action=${confirm}`)
      writeLocal(key, null)
      // Keep the unpublished text in this browser: "New <type>" offers to restore it
      if (confirm === 'unpublish') writeLocal(localKey(type, null), { fm, body, baseSha: null, savedAt: new Date().toISOString() })
      navigate('/content', { replace: true })
    } catch (err) {
      setMessage({ tone: 'error', text: err.message, conflict: err.status === 409 })
      setConfirm(null)
    } finally {
      setSaving(false)
    }
  }

  const download = () => {
    const blob = new Blob([serializeMarkdownFile(toFrontmatter(fm), body)], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${fm.slug || 'untitled'}.md`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const insertImage = (m) => {
    setPickerOpen(false)
    const el = textareaRef.current
    const snippet = `![${m.alt || ''}](${m.secureUrl})`
    const start = el?.selectionStart ?? body.length
    const end = el?.selectionEnd ?? body.length
    setBody((b) => `${b.slice(0, start)}${snippet}${b.slice(end)}`)
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + snippet.length, start + snippet.length)
    })
  }

  const err = (k) => errors[`frontmatter.${k}`] || (fm[k] !== '' && clientErrors[k]) || undefined
  const publicPath = typeDef.route(fm.slug || 'slug')

  return (
    <>
      <Link to="/content" className="a-back">
        <FiArrowLeft aria-hidden="true" /> All content
      </Link>
      <PageHeader
        title={isNew ? `New ${typeDef.singular.toLowerCase()}` : fm.title || 'Untitled'}
        description={isNew ? 'Fill in the details, write in Markdown, then publish.' : `Editing ${type}/${loaded.slug}.md`}
        actions={
          <div className="a-btn-group">
            <button type="button" className="btn btn--ghost btn--sm" onClick={download}>
              <FiDownload aria-hidden="true" /> .md
            </button>
            {!isNew && (
              <button type="button" className="btn btn--danger btn--sm" onClick={() => setConfirm('unpublish')} disabled={!writable || saving}>
                Unpublish
              </button>
            )}
            <button type="button" className="btn btn--primary btn--sm" onClick={() => save('published')} disabled={!writable || saving}>
              {saving ? 'Publishing…' : isNew || fm.status !== 'published' ? 'Publish' : 'Publish changes'}
            </button>
          </div>
        }
      />

      {!writable && <Notice tone="warning">Editing is read-only here: {status.content.readOnlyReason}</Notice>}
      {!allowDrafts && status && (
        <Notice tone="info">
          Drafts are turned off because content is committed to a <strong>public</strong> repository, where a draft would be readable by anyone. Your
          work in progress is kept in this browser until you publish.
        </Notice>
      )}
      {restore && (
        <Notice tone="warning" onDismiss={() => { writeLocal(key, null); setRestore(null) }}>
          You have unsaved changes from {new Date(restore.savedAt).toLocaleString()}.{' '}
          <button type="button" className="a-link" onClick={() => { setFm(restore.fm); setBody(restore.body); setRestore(null) }}>
            Restore them
          </button>{' '}
          or dismiss to discard.
        </Notice>
      )}
      {message?.tone === 'success' && (
        <Notice tone="success" onDismiss={() => setMessage(null)}>
          {message.res.store === 'github' ? (
            <>
              Published — committed{' '}
              <a className="a-link" href={message.res.commitUrl} target="_blank" rel="noopener noreferrer">
                {message.res.commitSha.slice(0, 7)} <FiExternalLink aria-hidden="true" />
              </a>
              . It goes live at <code>{message.res.publicPath}</code> when the deployment finishes (usually 1–2 minutes).
            </>
          ) : (
            <>Saved to <code>{message.res.path}</code>. Commit it with git to publish it.</>
          )}
        </Notice>
      )}
      {message?.tone === 'error' && (
        <Notice tone="error" onDismiss={() => setMessage(null)}>
          {message.text}
          {message.conflict && (
            <>
              {' '}Your edits are kept in this browser.{' '}
              <button type="button" className="a-link" onClick={() => window.location.reload()}>Reload latest version</button>
            </>
          )}
        </Notice>
      )}

      <div className="a-editor">
        <section className="a-card a-editor-meta" aria-label="Details">
          <div className="a-form-grid">
            <Field label="Title" required error={err('title')}>
              {(p) => <input {...p} className="a-input" maxLength={150} value={fm.title} onChange={set('title')} />}
            </Field>
            <Field label="Slug" required hint={`URL: ${publicPath}`} error={err('slug')}>
              {(p) => (
                <input
                  {...p}
                  className="a-input"
                  maxLength={80}
                  value={fm.slug}
                  onChange={(e) => {
                    setSlugTouched(true)
                    setFm((f) => ({ ...f, slug: e.target.value.toLowerCase() }))
                  }}
                />
              )}
            </Field>
          </div>
          <Field label="Description" required hint="One or two sentences. Used on cards, in search results and link previews." error={err('description')}>
            {(p) => <textarea {...p} className="a-input" rows={2} maxLength={300} value={fm.description} onChange={set('description')} />}
          </Field>
          <div className="a-form-grid a-form-grid--3">
            <Field label="Date" required={type === 'articles'} error={err('date')}>
              {(p) => <input {...p} className="a-input" type="date" value={fm.date || ''} onChange={set('date')} />}
            </Field>
            <Field label="Updated (optional)" error={err('updated')}>
              {(p) => <input {...p} className="a-input" type="date" value={fm.updated || ''} onChange={set('updated')} />}
            </Field>
            <Field label="Tags" hint="Comma-separated" error={err('tags')}>
              {(p) => (
                <input
                  {...p}
                  className="a-input"
                  value={fm.tags.join(', ')}
                  onChange={(e) => setFm((f) => ({ ...f, tags: e.target.value.split(',').map((t) => t.trimStart()).slice(0, 12) }))}
                />
              )}
            </Field>
          </div>
          {type === 'projects' && (
            <div className="a-form-grid">
              <Field label="Order on home page" hint="Lower numbers first" error={err('order')}>
                {(p) => <input {...p} className="a-input" type="number" min="0" max="999" value={fm.order} onChange={set('order')} />}
              </Field>
              <Field label="External link (optional)" hint="Live product, case study PDF…" error={err('link')}>
                {(p) => <input {...p} className="a-input" type="url" placeholder="https://" value={fm.link || ''} onChange={set('link')} />}
              </Field>
            </div>
          )}
          <div className="a-field">
            <span className="a-label">Cover image</span>
            <ImageField
              label="Cover"
              value={fm.cover}
              onChange={(m) =>
                setFm((f) => ({
                  ...f,
                  cover: m ? { url: m.secureUrl || m.url, alt: m.alt || '', width: m.width, height: m.height, publicId: m.publicId } : null,
                }))
              }
            />
          </div>
          {allowDrafts && (
            <fieldset className="a-fieldset">
              <legend className="a-label">Status</legend>
              {['draft', 'published'].map((s) => (
                <label key={s} className="a-radio">
                  <input type="radio" name="status" value={s} checked={fm.status === s} onChange={() => setFm((f) => ({ ...f, status: s }))} />
                  {s === 'draft' ? 'Draft (not on the site)' : 'Published'}
                </label>
              ))}
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => save(fm.status)} disabled={!writable || saving}>
                Save as {fm.status}
              </button>
            </fieldset>
          )}
        </section>

        <div className="a-editor-tabs" role="tablist" aria-label="Editor view">
          {['write', 'preview'].map((v) => (
            <button key={v} type="button" role="tab" className="a-tab" aria-selected={view === v} onClick={() => setView(v)}>
              {v === 'write' ? 'Write' : 'Preview'}
            </button>
          ))}
        </div>

        <div className={`a-editor-panes is-${view}`}>
          <section className="a-card a-editor-write" aria-label="Markdown">
            <div className="a-editor-toolbar">
              <span className="a-label">Markdown</span>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPickerOpen(true)}>
                <FiImage aria-hidden="true" /> Insert image
              </button>
            </div>
            <textarea
              ref={textareaRef}
              className="a-input a-markdown"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              aria-label="Markdown body"
              spellCheck
              placeholder={'## Overview\n\nWrite in **Markdown**. Code blocks, tables and links are supported.'}
            />
          </section>
          <section className="a-card a-editor-preview" aria-label="Preview" aria-live="off">
            <p className="a-label">Preview</p>
            {body.trim() ? <Prose html={previewHtml} /> : <p className="a-muted">Nothing to preview yet.</p>}
          </section>
        </div>
      </div>

      <MediaPickerDialog open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={insertImage} />

      <ConfirmDialog
        open={Boolean(confirm)}
        title={allowDrafts ? 'Unpublish?' : 'Unpublish and remove?'}
        confirmLabel={allowDrafts ? 'Move to drafts' : 'Unpublish'}
        busy={saving}
        onConfirm={remove}
        onClose={() => setConfirm(null)}
        extra={
          !allowDrafts && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={download}>
              <FiDownload aria-hidden="true" /> Download .md first
            </button>
          )
        }
      >
        {allowDrafts ? (
          <p>The page is removed from the site on the next deployment and kept as a draft.</p>
        ) : (
          <>
            <p>
              Because drafts are off, unpublishing <strong>deletes the file</strong> from the repository, and the page disappears from the site
              after the next deployment.
            </p>
            <p>A copy stays in this browser so you can republish later. Note: the text remains visible in the public git history.</p>
          </>
        )}
      </ConfirmDialog>
    </>
  )
}
