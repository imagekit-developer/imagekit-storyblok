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
import { FiExternalLink, FiMove, FiSliders, FiX } from 'react-icons/fi'
import type { SelectedAsset } from './types'
import { isVideoAsset, previewThumbnail } from './options'

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

const TransformationEditor: FunctionComponent<{
  asset: SelectedAsset
  onApply: (transformation: string | undefined) => void
  onCancel: () => void
}> = ({ asset, onApply, onCancel }) => {
  const [value, setValue] = useState(asset.transformation ?? '')
  const [previewValue, setPreviewValue] = useState(value)
  const [previewFailed, setPreviewFailed] = useState(false)
  const inputId = `ik-transform-${asset.fileId}`

  // Debounced so a live preview isn't refetched from ImageKit on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setPreviewValue(value), 400)
    return () => clearTimeout(timer)
  }, [value])

  useEffect(() => setPreviewFailed(false), [previewValue])

  return (
    <div className="ik-transform-editor">
      <div className="ik-transform-preview">
        {previewFailed ? (
          <span className="ik-transform-preview-error">Preview unavailable — check the syntax below.</span>
        ) : (
          <img src={previewThumbnail(asset, previewValue)} alt="" onError={() => setPreviewFailed(true)} />
        )}
      </div>
      <label className="ik-transform-label" htmlFor={inputId}>
        Transformation
      </label>
      <input
        id={inputId}
        className="ik-transform-input"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="w-400,h-300,fo-auto,q-80"
        spellCheck={false}
        autoComplete="off"
      />
      <a
        className="ik-transform-docs-link"
        href="https://imagekit.io/docs/transformations"
        target="_blank"
        rel="noreferrer"
      >
        Transformation reference ↗
      </a>
      <div className="ik-transform-actions">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        {asset.transformation && (
          <button type="button" className="btn" onClick={() => onApply(undefined)}>
            Reset
          </button>
        )}
        <button type="button" className="btn btn-primary" onClick={() => onApply(value)}>
          Apply
        </button>
      </div>
    </div>
  )
}

const SortableAssetItem: FunctionComponent<{
  asset: SelectedAsset
  onRemove: (fileId: string) => void
  onTransform: (fileId: string, transformation: string | undefined) => void
  reorderable: boolean
  isEditing: boolean
  onToggleEdit: (fileId: string | null) => void
}> = ({ asset, onRemove, onTransform, reorderable, isEditing, onToggleEdit }) => {
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
        <div className="ik-asset-thumb-wrap">
          <img className="ik-asset-thumb" src={asset.thumbnail} alt={asset.name} />
          {isVideoAsset(asset) && <span className="ik-video-badge">Video</span>}
        </div>
        <div className="ik-asset-meta">
          <span className="ik-asset-name" title={asset.name}>
            {asset.name}
          </span>
          <span className="ik-asset-details">{assetDetails(asset)}</span>
        </div>
        <div className="ik-asset-actions">
          <button
            type="button"
            className={`ik-icon-btn${isEditing || asset.transformation ? ' ik-icon-btn-active' : ''}`}
            aria-label={`Edit transformation for ${asset.name}`}
            aria-expanded={isEditing}
            onClick={() => onToggleEdit(isEditing ? null : asset.fileId)}
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
        <TransformationEditor
          asset={asset}
          onApply={(transformation) => {
            onTransform(asset.fileId, transformation)
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
  onTransform: (fileId: string, transformation: string | undefined) => void
}> = ({ assets, onRemove, onMove, onTransform }) => {
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
              onTransform={onTransform}
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
