import { useCallback, useEffect, useState } from 'react'
import { FiCopy, FiRefreshCw, FiTrash2, FiUpload } from 'react-icons/fi'
import { del, get, patch } from '../api'
import { ACCEPT_ATTR, checkFile, thumb, uploadImage } from '../media'
import { ConfirmDialog, EmptyState, Notice, PageHeader, Spinner, formatBytes } from '../ui'

function UploadQueue({ queue }) {
  if (!queue.length) return null
  return (
    <ul className="a-upload-queue" aria-label="Uploads">
      {queue.map((u) => (
        <li key={u.key}>
          <span className="a-truncate">{u.name}</span>
          {u.error ? (
            <span className="a-error">{u.error}</span>
          ) : u.done ? (
            <span className="a-ok-text">Uploaded</span>
          ) : (
            <span className="a-progress" role="progressbar" aria-label={`Uploading ${u.name}`} aria-valuenow={u.progress} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${u.progress}%` }} />
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

function MediaCard({ item, onChanged, onDelete, setMessage }) {
  const [alt, setAlt] = useState(item.alt)
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState(null)

  const saveAlt = async () => {
    if (alt === item.alt) return
    setSaving(true)
    try {
      onChanged((await patch(`/media/${item.id}`, { alt })).item)
    } catch (e) {
      setMessage({ tone: 'error', text: e.message })
      setAlt(item.alt)
    } finally {
      setSaving(false)
    }
  }

  const replace = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const updated = await uploadImage(file, { replaceId: item.id, onProgress: setProgress })
      onChanged(updated)
      setMessage({ tone: 'success', text: 'Image replaced everywhere it’s used.' })
    } catch (err) {
      setMessage({ tone: 'error', text: `Replace failed: ${err.message}` })
    } finally {
      setProgress(null)
    }
  }

  const copy = async (text, what) => {
    try {
      await navigator.clipboard.writeText(text)
      setMessage({ tone: 'success', text: `${what} copied.` })
    } catch {
      setMessage({ tone: 'error', text: 'Couldn’t copy — your browser blocked clipboard access.' })
    }
  }

  const name = item.originalFilename || item.publicId.split('/').pop()
  return (
    <li className="a-media-card">
      <img src={thumb(item.secureUrl)} alt={item.alt || ''} loading="lazy" width="400" height="300" />
      <div className="a-media-body">
        <p className="a-media-name a-truncate" title={item.publicId}>{name}</p>
        <p className="a-muted a-small">
          {item.width}×{item.height} · {item.format.toUpperCase()} · {formatBytes(item.bytes)}
        </p>
        <label className="a-label a-small" htmlFor={`alt-${item.id}`}>Alt text</label>
        <input
          id={`alt-${item.id}`}
          className="a-input a-input--sm"
          value={alt}
          maxLength={300}
          placeholder="Describe the image"
          onChange={(e) => setAlt(e.target.value)}
          onBlur={saveAlt}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          aria-describedby={`alt-hint-${item.id}`}
          disabled={saving}
        />
        <p id={`alt-hint-${item.id}`} className="visually-hidden">Saved when you leave the field.</p>
        {progress !== null && (
          <span className="a-progress" role="progressbar" aria-label="Replacing image" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${progress}%` }} />
          </span>
        )}
        <div className="a-media-actions">
          <button type="button" className="a-icon-btn" onClick={() => copy(item.secureUrl, 'URL')} aria-label={`Copy URL of ${name}`} title="Copy URL">
            <FiCopy aria-hidden="true" />
          </button>
          <button type="button" className="a-icon-btn" onClick={() => copy(`![${alt}](${item.secureUrl})`, 'Markdown')} aria-label={`Copy Markdown for ${name}`} title="Copy Markdown">
            <span aria-hidden="true" className="a-md-badge">MD</span>
          </button>
          <label className="a-icon-btn a-file-btn" title="Replace file">
            <FiRefreshCw aria-hidden="true" />
            <span className="visually-hidden">Replace {name}</span>
            <input type="file" accept={ACCEPT_ATTR} onChange={replace} disabled={progress !== null} />
          </label>
          <button type="button" className="a-icon-btn a-icon-btn--danger" onClick={() => onDelete(item)} aria-label={`Delete ${name}`} title="Delete">
            <FiTrash2 aria-hidden="true" />
          </button>
        </div>
      </div>
    </li>
  )
}

export default function MediaPage() {
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [queue, setQueue] = useState([])
  const [dragging, setDragging] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [deleteState, setDeleteState] = useState({ busy: false, usages: null, error: null })

  const load = useCallback(() => {
    get('/media')
      .then((r) => setItems(r.items))
      .catch((e) => setError(e.message))
  }, [])
  useEffect(load, [load])

  const uploadFiles = async (files) => {
    const list = [...files].map((f, i) => ({ key: `${Date.now()}-${i}`, file: f, name: f.name, progress: 0, error: checkFile(f) }))
    setQueue((q) => [...list, ...q].slice(0, 20))
    for (const entry of list) {
      if (entry.error) continue
      const update = (patchObj) => setQueue((q) => q.map((u) => (u.key === entry.key ? { ...u, ...patchObj } : u)))
      try {
        const item = await uploadImage(entry.file, { onProgress: (p) => update({ progress: p }) })
        update({ done: true, progress: 100 })
        setItems((xs) => [item, ...(xs || []).filter((x) => x.id !== item.id)])
      } catch (err) {
        update({ error: err.message })
      }
    }
  }

  const confirmDelete = async () => {
    setDeleteState({ busy: true, usages: null, error: null })
    try {
      await del(`/media/${deleting.id}`)
      setItems((xs) => xs.filter((x) => x.id !== deleting.id))
      setDeleting(null)
      setMessage({ tone: 'success', text: 'Image deleted from the library and Cloudinary.' })
      setDeleteState({ busy: false, usages: null, error: null })
    } catch (err) {
      setDeleteState({ busy: false, usages: err.details?.usages || null, error: err.message })
    }
  }

  return (
    <>
      <PageHeader title="Media library" description="Images are stored in Cloudinary and optimised automatically for each screen size." />
      {message && <Notice tone={message.tone} onDismiss={() => setMessage(null)}>{message.text}</Notice>}

      <div
        className={`a-dropzone ${dragging ? 'is-dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          uploadFiles(e.dataTransfer.files)
        }}
      >
        <FiUpload aria-hidden="true" className="a-dropzone-icon" />
        <p>Drag images here, or</p>
        <label className="btn btn--primary btn--sm a-file-btn">
          Choose files
          <input type="file" accept={ACCEPT_ATTR} multiple onChange={(e) => {
            uploadFiles(e.target.files)
            e.target.value = ''
          }} />
        </label>
        <p className="a-hint">JPG, PNG, WebP, AVIF or GIF · up to 10 MB each</p>
      </div>
      <UploadQueue queue={queue} />

      {error ? (
        <Notice tone="error">{error}</Notice>
      ) : items === null ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState title="No images yet">Uploaded images appear here.</EmptyState>
      ) : (
        <ul className="a-media-grid">
          {items.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              setMessage={setMessage}
              onChanged={(u) => setItems((xs) => xs.map((x) => (x.id === u.id ? u : x)))}
              onDelete={(it) => {
                setDeleteState({ busy: false, usages: null, error: null })
                setDeleting(it)
              }}
            />
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete image?"
        confirmLabel="Delete permanently"
        busy={deleteState.busy}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      >
        <p>The file is removed from Cloudinary. Images still used somewhere can’t be deleted.</p>
        {deleteState.error && (
          <Notice tone="error">
            {deleteState.error}
            {deleteState.usages && (
              <ul className="a-list">
                {deleteState.usages.map((u) => (
                  <li key={u.label}>{u.label}</li>
                ))}
              </ul>
            )}
          </Notice>
        )}
      </ConfirmDialog>
    </>
  )
}
