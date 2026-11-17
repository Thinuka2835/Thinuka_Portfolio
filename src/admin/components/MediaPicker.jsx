import { useCallback, useEffect, useState } from 'react'
import { FiImage, FiUpload, FiX } from 'react-icons/fi'
import { get } from '../api'
import { ACCEPT_ATTR, thumb, uploadImage } from '../media'
import { Dialog, EmptyState, Notice, Spinner } from '../ui'

/** Dialog to choose an image from the library, or upload a new one. */
export function MediaPickerDialog({ open, onClose, onSelect }) {
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState(null)

  const load = useCallback(() => {
    get('/media')
      .then((r) => {
        setItems(r.items)
        setError(null)
      })
      .catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    try {
      const item = await uploadImage(file, { onProgress: setProgress })
      onSelect(item)
    } catch (err) {
      setError(err.message)
    } finally {
      setProgress(null)
    }
  }

  return (
    <Dialog open={open} title="Choose an image" onClose={onClose} wide>
      <div className="a-picker-toolbar">
        <label className="btn btn--primary btn--sm a-file-btn">
          <FiUpload aria-hidden="true" /> Upload new
          <input type="file" accept={ACCEPT_ATTR} onChange={onFile} disabled={progress !== null} />
        </label>
        {progress !== null && (
          <div className="a-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress">
            <span style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {items === null && !error ? (
        <Spinner />
      ) : items?.length === 0 ? (
        <EmptyState title="No images yet">Upload one to get started.</EmptyState>
      ) : (
        <ul className="a-picker-grid">
          {items?.map((m) => (
            <li key={m.id}>
              <button type="button" className="a-picker-item" onClick={() => onSelect(m)}>
                <img src={thumb(m.secureUrl, 240)} alt="" loading="lazy" />
                <span>{m.alt || m.originalFilename || m.publicId.split('/').pop()}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  )
}

/** Form control showing the selected image with Choose / Remove buttons. */
export function ImageField({ value, onChange, label = 'Image' }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="a-image-field">
      <div className="a-image-preview">
        {value?.url || value?.secureUrl ? (
          <img src={thumb(value.url || value.secureUrl, 320)} alt={value.alt || ''} />
        ) : (
          <FiImage aria-hidden="true" />
        )}
      </div>
      <div className="a-image-actions">
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOpen(true)}>
          {value ? 'Change' : 'Choose'} {label.toLowerCase()}
        </button>
        {value && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => onChange(null)}>
            <FiX aria-hidden="true" /> Remove
          </button>
        )}
        {value && !value.alt && <p className="a-hint">This image has no alt text — add it in the Media library.</p>}
      </div>
      <MediaPickerDialog
        open={open}
        onClose={() => setOpen(false)}
        onSelect={(m) => {
          onChange(m)
          setOpen(false)
        }}
      />
    </div>
  )
}
