// Config-driven list editor for the ordered collections.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiArrowDown, FiArrowUp, FiEdit2, FiEye, FiEyeOff, FiPlus, FiTrash2 } from 'react-icons/fi'
import { del, get, post, put } from '../api'
import { Checkbox, ConfirmDialog, Dialog, EmptyState, Field, Notice, Spinner } from '../ui'
import { ImageField } from './MediaPicker'

function FieldInput({ field, value, onChange, error, mediaById, rememberMedia }) {
  if (field.type === 'checkbox') return <Checkbox label={field.label} hint={field.hint} checked={Boolean(value)} onChange={onChange} />
  if (field.type === 'image') {
    const media = value ? mediaById[value] : null
    return (
      <div className="a-field">
        <span className="a-label">{field.label}</span>
        <ImageField
          value={media || (value ? { id: value } : null)}
          onChange={(m) => {
            if (m) rememberMedia(m)
            onChange(m ? m.id : null)
          }}
        />
        {error && <p className="a-error">{error}</p>}
      </div>
    )
  }
  return (
    <Field label={field.label} hint={field.hint} error={error} required={field.required}>
      {(props) =>
        field.type === 'select' ? (
          <select {...props} className="a-input" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            {...props}
            className="a-input"
            type={field.type === 'number' ? 'number' : field.type === 'url' ? 'url' : 'text'}
            inputMode={field.type === 'number' ? 'numeric' : undefined}
            value={value ?? ''}
            maxLength={field.maxLength}
            placeholder={field.placeholder}
            onChange={(e) => onChange(field.type === 'number' ? e.target.value.replace(/[^\d]/g, '') : e.target.value)}
          />
        )
      }
    </Field>
  )
}

export default function CollectionManager({ endpoint, singular, fields, columns, defaults, emptyText, needsMedia }) {
  const [items, setItems] = useState(null)
  const [media, setMedia] = useState([])
  const [loadError, setLoadError] = useState(null)
  const [message, setMessage] = useState(null)
  const [editing, setEditing] = useState(null) // { id|null, values }
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  const base = `/collections/${endpoint}`
  const load = useCallback(async () => {
    try {
      const [{ items }, mediaRes] = await Promise.all([get(base), needsMedia ? get('/media') : Promise.resolve({ items: [] })])
      setItems(items)
      setMedia(mediaRes.items)
      setLoadError(null)
    } catch (e) {
      setLoadError(e.message)
    }
  }, [base, needsMedia])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch; state is set after it resolves
    load()
  }, [load])

  const mediaById = useMemo(() => Object.fromEntries(media.map((m) => [m.id, m])), [media])

  const openEditor = (item) => {
    setErrors({})
    setEditing({
      id: item?.id ?? null,
      values: item ? Object.fromEntries(fields.map((f) => [f.name, item[f.name]])) : { ...defaults },
    })
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    const payload = { ...editing.values }
    for (const f of fields) if (f.type === 'number') payload[f.name] = payload[f.name] === '' ? null : Number(payload[f.name])
    try {
      if (editing.id) await put(`${base}/${editing.id}`, payload)
      else await post(base, payload)
      setEditing(null)
      setMessage({ tone: 'success', text: `${singular} saved. The live site updates within a minute.` })
      await load()
    } catch (err) {
      setErrors({ ...err.fields, _: Object.keys(err.fields).length ? null : err.message })
    } finally {
      setSaving(false)
    }
  }

  const move = async (index, dir) => {
    const next = [...items]
    const [moved] = next.splice(index, 1)
    next.splice(index + dir, 0, moved)
    setItems(next)
    try {
      await post(`${base}/reorder`, { ids: next.map((i) => i.id) })
    } catch (err) {
      setMessage({ tone: 'error', text: err.message })
      load()
    }
  }

  const toggleVisible = async (item) => {
    setBusy(true)
    try {
      const payload = Object.fromEntries(fields.map((f) => [f.name, item[f.name]]))
      await put(`${base}/${item.id}`, { ...payload, visible: !item.visible })
      await load()
    } catch (err) {
      setMessage({ tone: 'error', text: err.message })
    } finally {
      setBusy(false)
    }
  }

  const confirmDelete = async () => {
    setBusy(true)
    try {
      await del(`${base}/${deleting.id}`)
      setDeleting(null)
      setMessage({ tone: 'success', text: `${singular} deleted.` })
      await load()
    } catch (err) {
      setMessage({ tone: 'error', text: err.message })
      setDeleting(null)
    } finally {
      setBusy(false)
    }
  }

  if (loadError) return <Notice tone="error">Couldn’t load: {loadError} <button type="button" className="a-link" onClick={load}>Retry</button></Notice>
  if (!items) return <Spinner />

  return (
    <div className="a-collection">
      <div className="a-collection-bar">
        <button type="button" className="btn btn--primary btn--sm" onClick={() => openEditor(null)}>
          <FiPlus aria-hidden="true" /> Add {singular.toLowerCase()}
        </button>
      </div>
      {message && (
        <Notice tone={message.tone} onDismiss={() => setMessage(null)}>
          {message.text}
        </Notice>
      )}

      {items.length === 0 ? (
        <EmptyState title={emptyText} />
      ) : (
        <table className="a-table">
          <thead>
            <tr>
              <th scope="col">Order</th>
              {columns.map((c) => (
                <th key={c.key} scope="col">{c.label}</th>
              ))}
              <th scope="col">Visible</th>
              <th scope="col"><span className="visually-hidden">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const name = item[columns[0].key]
              return (
                <tr key={item.id} className={item.visible ? '' : 'a-row-hidden'}>
                  <td data-label="Order" className="a-order-cell">
                    <button type="button" className="a-icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${name} up`}>
                      <FiArrowUp aria-hidden="true" />
                    </button>
                    <button type="button" className="a-icon-btn" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label={`Move ${name} down`}>
                      <FiArrowDown aria-hidden="true" />
                    </button>
                  </td>
                  {columns.map((c) => (
                    <td key={c.key} data-label={c.label}>
                      {c.render ? c.render(item, mediaById) : String(item[c.key] ?? '')}
                    </td>
                  ))}
                  <td data-label="Visible">
                    <button type="button" className="a-icon-btn" onClick={() => toggleVisible(item)} disabled={busy} aria-label={item.visible ? `Hide ${name}` : `Show ${name}`} aria-pressed={item.visible}>
                      {item.visible ? <FiEye aria-hidden="true" /> : <FiEyeOff aria-hidden="true" />}
                    </button>
                  </td>
                  <td className="a-actions-cell">
                    <button type="button" className="a-icon-btn" onClick={() => openEditor(item)} aria-label={`Edit ${name}`}>
                      <FiEdit2 aria-hidden="true" />
                    </button>
                    <button type="button" className="a-icon-btn a-icon-btn--danger" onClick={() => setDeleting(item)} aria-label={`Delete ${name}`}>
                      <FiTrash2 aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      <Dialog
        open={Boolean(editing)}
        title={editing?.id ? `Edit ${singular.toLowerCase()}` : `Add ${singular.toLowerCase()}`}
        onClose={() => setEditing(null)}
      >
        {editing && (
          <form className="a-form" onSubmit={save} noValidate>
            {errors._ && <Notice tone="error">{errors._}</Notice>}
            {fields.map((f) => (
              <FieldInput
                key={f.name}
                field={f}
                value={editing.values[f.name]}
                error={errors[f.name]}
                mediaById={mediaById}
                rememberMedia={(m) => setMedia((list) => (list.some((x) => x.id === m.id) ? list : [m, ...list]))}
                onChange={(v) => setEditing((ed) => ({ ...ed, values: { ...ed.values, [f.name]: v } }))}
              />
            ))}
            <div className="a-form-actions">
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete ${singular.toLowerCase()}?`}
        confirmLabel="Delete"
        busy={busy}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      >
        <p>
          “{deleting && deleting[columns[0].key]}” will be removed from the site. This can’t be undone — to keep it but hide it, use the
          visibility toggle instead.
        </p>
      </ConfirmDialog>
    </div>
  )
}
