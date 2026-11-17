// Small, accessible UI building blocks for the admin.
import { useEffect, useId, useRef } from 'react'
import { FiAlertCircle, FiCheckCircle, FiInfo, FiX } from 'react-icons/fi'

export function PageHeader({ title, description, actions }) {
  return (
    <header className="a-page-header">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="a-page-actions">{actions}</div>}
    </header>
  )
}

const NOTICE_ICONS = { success: FiCheckCircle, error: FiAlertCircle, warning: FiAlertCircle, info: FiInfo }

export function Notice({ tone = 'info', children, onDismiss, role }) {
  const Icon = NOTICE_ICONS[tone]
  return (
    <div className={`a-notice a-notice--${tone}`} role={role ?? (tone === 'error' ? 'alert' : 'status')}>
      <Icon aria-hidden="true" className="a-notice-icon" />
      <div className="a-notice-body">{children}</div>
      {onDismiss && (
        <button type="button" className="a-icon-btn" onClick={onDismiss} aria-label="Dismiss">
          <FiX aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="a-spinner" role="status">
      <span className="a-spinner-ring" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

export function EmptyState({ title, children }) {
  return (
    <div className="a-empty">
      <p className="a-empty-title">{title}</p>
      {children && <div className="a-empty-body">{children}</div>}
    </div>
  )
}

/** Label + control + hint + error, wired up with ids and aria attributes. */
export function Field({ label, hint, error, required, children, className = '' }) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined
  return (
    <div className={`a-field ${className}`}>
      <label htmlFor={id} className="a-label">
        {label}
        {required && <span className="a-required" aria-hidden="true"> *</span>}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined, required })}
      {hint && (
        <p id={hintId} className="a-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="a-error">
          {error}
        </p>
      )}
    </div>
  )
}

export function Checkbox({ label, checked, onChange, hint }) {
  const id = useId()
  return (
    <div className="a-check">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={id}>
        {label}
        {hint && <span className="a-hint"> — {hint}</span>}
      </label>
    </div>
  )
}

/** Modal dialog built on <dialog> (focus trapping + Escape handled by the browser). */
export function Dialog({ open, title, onClose, children, footer, wide }) {
  const ref = useRef(null)
  const titleId = useId()
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      className={`a-dialog ${wide ? 'a-dialog--wide' : ''}`}
      aria-labelledby={titleId}
      // React propagates close/cancel from nested dialogs (e.g. the image picker
      // inside an edit form) — only react to events from this dialog itself.
      onClose={(e) => {
        if (e.target === ref.current) onClose()
      }}
      onCancel={(e) => {
        if (e.target !== ref.current) return
        e.preventDefault()
        onClose()
      }}
    >
      {open && (
        <>
          <header className="a-dialog-header">
            <h2 id={titleId}>{title}</h2>
            <button type="button" className="a-icon-btn" onClick={onClose} aria-label="Close dialog">
              <FiX aria-hidden="true" />
            </button>
          </header>
          <div className="a-dialog-body">{children}</div>
          {footer && <footer className="a-dialog-footer">{footer}</footer>}
        </>
      )}
    </dialog>
  )
}

export function ConfirmDialog({ open, title, children, confirmLabel = 'Confirm', tone = 'danger', busy, onConfirm, onClose, extra }) {
  return (
    <Dialog
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          {extra}
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={`btn btn--sm ${tone === 'danger' ? 'a-btn-danger-solid' : 'btn--primary'}`} onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      {children}
    </Dialog>
  )
}

export const formatBytes = (n) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

export const formatDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'
