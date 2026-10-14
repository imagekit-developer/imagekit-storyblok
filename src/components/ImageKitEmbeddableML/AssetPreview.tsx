import { FunctionComponent, useEffect, useState } from 'react'
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { FiCheck, FiCopy, FiExternalLink, FiMove, FiSliders, FiX } from 'react-icons/fi'
import type { AssetSettings, FocalPoint, SelectedAsset } from './types'
import { cropPreview, isVideoAsset, previewThumbnail } from './options'

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`
}

function formatDuration(seconds: number): string {
  const total = Math.round(seconds)
  const minutes = Math.floor(total / 60)
  const remaining = total % 60
  return `${minutes}:${remaining.toString().padStart(2, '0')}`
}

function assetDetails(asset: SelectedAsset): string {
  if (isVideoAsset(asset)) {
    return [asset.duration !== undefined ? formatDuration(asset.duration) : undefined, formatBytes(asset.size)]
      .filter(Boolean)
      .join(' · ')
  }
  if (asset.fileType === 'image' && asset.width > 0 && asset.height > 0) {
    return `${asset.width}×${asset.height} · ${formatBytes(asset.size)}`
  }
  return formatBytes(asset.size)
}

/**
 * Clipboard API first; a hidden-textarea `execCommand('copy')` fallback for when the plugin's
 * iframe isn't granted `clipboard-write` by its host page.
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      return document.execCommand('copy')
    } catch {
      return false
    } finally {
      document.body.removeChild(textarea)
    }
  }
}

const CopyUrlButton: FunctionComponent<{ asset: SelectedAsset }> = ({ asset }) => {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle')

  useEffect(() => {
    if (status === 'idle') return
    const timer = setTimeout(() => setStatus('idle'), 1500)
    return () => clearTimeout(timer)
  }, [status])

  const label =
    status === 'copied' ? 'URL copied' : status === 'failed' ? 'Copy failed' : `Copy URL for ${asset.name}`

  return (
    <button
      type="button"
      className={`ik-icon-btn${status === 'copied' ? ' ik-icon-btn-active' : ''}`}
      aria-label={label}
      title={label}
      onClick={async () => setStatus((await copyToClipboard(asset.url)) ? 'copied' : 'failed')}
    >
      {status === 'copied' ? <FiCheck aria-hidden /> : <FiCopy aria-hidden />}
    </button>
  )
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const round3 = (value: number) => Math.round(value * 1000) / 1000

const FocalPointPicker: FunctionComponent<{
  asset: SelectedAsset
  value: FocalPoint | undefined
  onChange: (value: FocalPoint | undefined) => void
}> = ({ asset, value, onChange }) => {
  const nudge = (dx: number, dy: number) => {
    const current = value ?? { x: 0.5, y: 0.5 }
    onChange({ x: round3(clamp01(current.x + dx)), y: round3(clamp01(current.y + dy)) })
  }

  return (
    <div className="ik-focal">
      <button
        type="button"
        className="ik-focal-picker"
        aria-label="Set focal point — click the image, or use the arrow keys"
        onClick={(event) => {
          // A keyboard-triggered click has no pointer position; arrow keys handle that case.
          if (event.detail === 0) return
          const rect = event.currentTarget.getBoundingClientRect()
          onChange({
            x: round3(clamp01((event.clientX - rect.left) / rect.width)),
            y: round3(clamp01((event.clientY - rect.top) / rect.height)),
          })
        }}
        onKeyDown={(event) => {
          const step = 0.05
          const moves: Record<string, [number, number]> = {
            ArrowLeft: [-step, 0],
            ArrowRight: [step, 0],
            ArrowUp: [0, -step],
            ArrowDown: [0, step],
          }
          const move = moves[event.key]
          if (!move) return
          event.preventDefault()
          nudge(...move)
        }}
      >
        <img src={previewThumbnail(asset, 'w-600')} alt="" draggable={false} />
        {value && (
          <span
            className="ik-focal-marker"
            style={{ left: `${value.x * 100}%`, top: `${value.y * 100}%` }}
            aria-hidden
          />
        )}
        <span className="ik-focal-hint" aria-hidden>
          {value ? 'Click to move focal point' : 'Click to set focal point'}
        </span>
      </button>
      {value && (
        <button type="button" className="ik-link-btn" onClick={() => onChange(undefined)}>
          Reset focal point
        </button>
      )}
    </div>
  )
}

const CROP_PREVIEWS = [
  { label: '1:1', width: 160, height: 160 },
  { label: '16:9', width: 256, height: 144 },
  { label: '3:4', width: 120, height: 160 },
] as const

const CropPreviews: FunctionComponent<{
  asset: SelectedAsset
  settings: Pick<AssetSettings, 'transformation' | 'focalPoint'>
}> = ({ asset, settings }) => {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [settings.transformation, settings.focalPoint])

  if (failed) {
    return <p className="ik-settings-error">Preview unavailable — check the transformation syntax.</p>
  }

  return (
    <div className="ik-crop-previews" aria-label="Crop previews">
      {CROP_PREVIEWS.map(({ label, width, height }) => (
        <figure className="ik-crop-preview" key={label}>
          <img
            src={cropPreview(asset, settings, width, height)}
            alt={`${label} crop preview`}
            style={{ aspectRatio: `${width} / ${height}` }}
            onError={() => setFailed(true)}
          />
          <figcaption>{label}</figcaption>
        </figure>
      ))}
    </div>
  )
}

const TextField: FunctionComponent<{
  id: string
  label: string
  value: string
  placeholder: string
  onChange: (value: string) => void
  mono?: boolean
}> = ({ id, label, value, placeholder, onChange, mono }) => (
  <div className="ik-settings-field">
    <label className="ik-settings-label" htmlFor={id}>
      {label}
    </label>
    <input
      id={id}
      className={`ik-settings-input${mono ? ' ik-settings-input-mono' : ''}`}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      spellCheck={!mono}
      autoComplete="off"
    />
  </div>
)

const AssetSettingsPanel: FunctionComponent<{
  asset: SelectedAsset
  onSave: (settings: AssetSettings) => void
  onCancel: () => void
}> = ({ asset, onSave, onCancel }) => {
  const [focalPoint, setFocalPoint] = useState(asset.focalPoint)
  const [transformation, setTransformation] = useState(asset.transformation ?? '')
  const [previewTransformation, setPreviewTransformation] = useState(transformation)
  const [title, setTitle] = useState(asset.title ?? '')
  const [alt, setAlt] = useState(asset.alt ?? '')
  const [copyright, setCopyright] = useState(asset.copyright ?? '')
  const [source, setSource] = useState(asset.source ?? '')
  const id = (field: string) => `ik-${field}-${asset.fileId}`
  const isVideo = isVideoAsset(asset)

  // Debounced so the previews aren't refetched from ImageKit on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setPreviewTransformation(transformation), 400)
    return () => clearTimeout(timer)
  }, [transformation])

  return (
    <div className="ik-settings">
      {!isVideo && (
        <>
          <FocalPointPicker asset={asset} value={focalPoint} onChange={setFocalPoint} />
          <CropPreviews asset={asset} settings={{ transformation: previewTransformation, focalPoint }} />
        </>
      )}
      <TextField
        id={id('transformation')}
        label="Transformation"
        value={transformation}
        placeholder="e-grayscale,q-80"
        onChange={setTransformation}
        mono
      />
      <a
        className="ik-settings-docs-link"
        href="https://imagekit.io/docs/transformations"
        target="_blank"
        rel="noreferrer"
      >
        Transformation reference ↗
      </a>
      <hr className="ik-settings-divider" />
      <TextField id={id('title')} label="Title/Caption" value={title} placeholder="Add a title or caption…" onChange={setTitle} />
      <TextField id={id('alt')} label="Alt text" value={alt} placeholder="Describe the image…" onChange={setAlt} />
      <TextField id={id('copyright')} label="Copyright" value={copyright} placeholder="Copyright holder…" onChange={setCopyright} />
      <TextField id={id('source')} label="Source" value={source} placeholder="Source URL or reference…" onChange={setSource} />
      <div className="ik-settings-actions">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onSave({ transformation, focalPoint, title, alt, copyright, source })}
        >
          Save
        </button>
      </div>
    </div>
  )
}

const SortableAssetItem: FunctionComponent<{
  asset: SelectedAsset
  onRemove: (fileId: string) => void
  onUpdate: (fileId: string, settings: AssetSettings) => void
  reorderable: boolean
  isEditing: boolean
  onToggleEdit: (fileId: string | null) => void
}> = ({ asset, onRemove, onUpdate, reorderable, isEditing, onToggleEdit }) => {
  const hasSettings = Boolean(
    asset.transformation || asset.focalPoint || asset.title || asset.alt || asset.copyright || asset.source,
  )
  const toggle = () => onToggleEdit(isEditing ? null : asset.fileId)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: asset.fileId,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <li className="ik-asset-item" ref={setNodeRef} style={style}>
      <div className="ik-asset-row">
        {reorderable && (
          <button
            type="button"
            className="ik-icon-btn ik-drag-handle"
            aria-label={`Reorder ${asset.name}`}
            {...attributes}
            {...listeners}
          >
            <FiMove aria-hidden />
          </button>
        )}
        <button
          type="button"
          className="ik-asset-thumb-wrap"
          aria-label={`Open settings for ${asset.name}`}
          onClick={toggle}
        >
          <img className="ik-asset-thumb" src={asset.thumbnail} alt="" />
          {isVideoAsset(asset) && <span className="ik-video-badge">Video</span>}
        </button>
        <div className="ik-asset-meta">
          <span className="ik-asset-name" title={asset.name}>
            {asset.name}
          </span>
          <span className="ik-asset-details">{assetDetails(asset)}</span>
        </div>
        <div className="ik-asset-actions">
          <CopyUrlButton asset={asset} />
          <button
            type="button"
            className={`ik-icon-btn${isEditing || hasSettings ? ' ik-icon-btn-active' : ''}`}
            aria-label={`Settings for ${asset.name}`}
            title="Settings"
            aria-expanded={isEditing}
            onClick={toggle}
          >
            <FiSliders aria-hidden />
          </button>
          <a
            className="ik-icon-btn"
            href={asset.url}
            target="_blank"
            rel="noreferrer"
            aria-label={`Preview ${asset.name} in a new tab`}
          >
            <FiExternalLink aria-hidden />
          </a>
          <button
            type="button"
            className="ik-icon-btn ik-icon-btn-danger"
            aria-label={`Remove ${asset.name}`}
            onClick={() => onRemove(asset.fileId)}
          >
            <FiX aria-hidden />
          </button>
        </div>
      </div>
      {isEditing && (
        <AssetSettingsPanel
          asset={asset}
          onSave={(settings) => {
            onUpdate(asset.fileId, settings)
            onToggleEdit(null)
          }}
          onCancel={() => onToggleEdit(null)}
        />
      )}
    </li>
  )
}

const AssetPreview: FunctionComponent<{
  assets: SelectedAsset[]
  onRemove: (fileId: string) => void
  onMove: (fromIndex: number, toIndex: number) => void
  onUpdate: (fileId: string, settings: AssetSettings) => void
}> = ({ assets, onRemove, onMove, onUpdate }) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const [editingId, setEditingId] = useState<string | null>(null)

  if (assets.length === 0) return null

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const fromIndex = assets.findIndex((asset) => asset.fileId === active.id)
    const toIndex = assets.findIndex((asset) => asset.fileId === over.id)
    if (fromIndex === -1 || toIndex === -1) return

    onMove(fromIndex, toIndex)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={assets.map((asset) => asset.fileId)} strategy={verticalListSortingStrategy}>
        <ul className="ik-asset-list">
          {assets.map((asset) => (
            <SortableAssetItem
              asset={asset}
              onRemove={onRemove}
              onUpdate={onUpdate}
              reorderable={assets.length > 1}
              isEditing={editingId === asset.fileId}
              onToggleEdit={setEditingId}
              key={asset.fileId}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}

export default AssetPreview
