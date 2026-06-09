import { FunctionComponent, useState } from 'react'
import type { StoryblokAsset } from './types'

const DragHandleIcon: FunctionComponent = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
    <circle cx="4" cy="3" r="1.5" />
    <circle cx="10" cy="3" r="1.5" />
    <circle cx="4" cy="7" r="1.5" />
    <circle cx="10" cy="7" r="1.5" />
    <circle cx="4" cy="11" r="1.5" />
    <circle cx="10" cy="11" r="1.5" />
  </svg>
)

const ReplaceIcon: FunctionComponent = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 4v6h-6" />
    <path d="M1 20v-6h6" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
)

const EditIcon: FunctionComponent = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

const CopyIcon: FunctionComponent = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)

const CheckIcon: FunctionComponent = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const DeleteIcon: FunctionComponent = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
)

const AssetItem: FunctionComponent<{
  asset: StoryblokAsset
  onReplace: () => void
  onEdit: () => void
  onDelete: () => void
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
  onDragEnd: () => void
  isDragging: boolean
  isDragOver: boolean
}> = ({ asset, onReplace, onEdit, onDelete, onDragStart, onDragOver, onDrop, onDragEnd, isDragging, isDragOver }) => {
  const [copied, setCopied] = useState(false)
  const displayName = asset.name || asset.filename.split('/').pop()?.replace(/\?.*$/, '') || asset.filename

  const handleCopy = () => {
    navigator.clipboard.writeText(asset.filename).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const classNames = [
    'asset-item',
    isDragging ? 'asset-item--dragging' : '',
    isDragOver ? 'asset-item--drag-over' : '',
  ].filter(Boolean).join(' ')

  return (
    <div
      className={classNames}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div className="asset-item__drag-handle" title="Drag to reorder">
        <DragHandleIcon />
      </div>
      <div className="asset-item__thumbnail">
        {asset.mime?.startsWith('video/') ? (
          <>
            <video src={asset.filename} preload="metadata" muted />
            <div className="asset-item__play-overlay">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="10" fill="rgba(0,0,0,0.45)" />
                <polygon points="8,6 15,10 8,14" fill="white" />
              </svg>
            </div>
          </>
        ) : (
          <img src={asset.thumbnail} alt={asset.alt || asset.name} />
        )}
      </div>
      <div className="asset-item__info">
        <span className="asset-item__name">{displayName}</span>
        {asset.title && (
          <span className="asset-item__caption">{asset.title}</span>
        )}
      </div>
      <div className="asset-item__actions">
        <button type="button" className="asset-action-btn" onClick={onReplace} title="Replace asset">
          <ReplaceIcon />
        </button>
        <button type="button" className="asset-action-btn" onClick={onEdit} title="Edit asset">
          <EditIcon />
        </button>
        <button
          type="button"
          className={`asset-action-btn${copied ? ' asset-action-btn--copied' : ''}`}
          onClick={handleCopy}
          title="Copy URL"
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
        <button type="button" className="asset-action-btn asset-action-btn--delete" onClick={onDelete} title="Delete asset">
          <DeleteIcon />
        </button>
      </div>
    </div>
  )
}

export default AssetItem
