import { FunctionComponent, useState } from 'react'
import type { StoryblokAsset, EditableFields } from './types'

const focalPointToFocus = (x: number, y: number, width: number, height: number): string => {
  const px = Math.round((x / 100) * width)
  const py = Math.round((y / 100) * height)
  return `${px}x${py}:${px + 1}x${py + 1}`
}

const focusToFocalPoint = (
  focus: string,
  width: number,
  height: number,
): { x: number; y: number } | undefined => {
  if (!focus || !width || !height) return undefined
  const coords = focus.split(':')[0].split('x').map(Number)
  if (coords.length !== 2 || coords.some(isNaN)) return undefined
  return { x: (coords[0] / width) * 100, y: (coords[1] / height) * 100 }
}

const EditPanel: FunctionComponent<{
  asset: StoryblokAsset
  onSave: (fields: EditableFields) => void
  onCancel: () => void
}> = ({ asset, onSave, onCancel }) => {
  const [title, setTitle] = useState(asset.title)
  const [alt, setAlt] = useState(asset.alt)
  const [copyright, setCopyright] = useState(asset.copyright)
  const [source, setSource] = useState(asset.source)
  const [focalPoint, setFocalPoint] = useState(
    focusToFocalPoint(asset.focus, asset.width, asset.height),
  )

  const isVideo = asset.mime.startsWith('video/')

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10
    setFocalPoint({ x, y })
  }

  const handleSave = () => {
    const focus =
      focalPoint && asset.width && asset.height
        ? focalPointToFocus(focalPoint.x, focalPoint.y, asset.width, asset.height)
        : ''
    onSave({ alt, title, copyright, source, focus })
  }

  return (
    <div className="edit-panel">
      <div className="focal-point-wrapper">
        {isVideo ? (
          <video src={asset.filename} controls className="focal-point-image" />
        ) : (
          <>
            <div className="focal-point-container" onClick={handleImageClick}>
              <img src={asset.filename} alt={asset.name} className="focal-point-image" />
              {focalPoint && (
                <div
                  className="focal-point-marker"
                  style={{ left: `${focalPoint.x}%`, top: `${focalPoint.y}%` }}
                />
              )}
              <div className="focal-point-hint">Click to set focal point</div>
            </div>
            {focalPoint && (
              <button
                type="button"
                className="focal-point-reset"
                onClick={() => setFocalPoint(undefined)}
              >
                Reset focal point
              </button>
            )}
          </>
        )}
      </div>

      <div className="edit-panel__file-info">
        <span className="edit-panel__filename">{asset.name}</span>
        {asset.width > 0 && (
          <span className="edit-panel__dimensions">{asset.width} × {asset.height}</span>
        )}
      </div>

      <div className="edit-panel__form">
        <div className="form-field">
          <label className="form-label">Title/Caption</label>
          <input
            className="form-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a title or caption..."
          />
        </div>
        <div className="form-field">
          <label className="form-label">Alt text</label>
          <input
            className="form-input"
            type="text"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            placeholder="Describe the image..."
          />
        </div>
        <div className="form-field">
          <label className="form-label">Copyright</label>
          <input
            className="form-input"
            type="text"
            value={copyright}
            onChange={(e) => setCopyright(e.target.value)}
            placeholder="Copyright holder..."
          />
        </div>
        <div className="form-field">
          <label className="form-label">Source</label>
          <input
            className="form-input"
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Source URL or reference..."
          />
        </div>
      </div>

      <div className="edit-panel__footer">
        <button type="button" className="btn btn--secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn btn--primary" onClick={handleSave}>
          Save &amp; Close
        </button>
      </div>
    </div>
  )
}

export default EditPanel
