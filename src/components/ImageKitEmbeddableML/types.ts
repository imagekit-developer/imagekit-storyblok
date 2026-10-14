export type IKFileType = 'image' | 'video' | 'non-image'

export type SelectedAsset = {
  fileId: string
  name: string
  filePath: string
  /** The URL actually delivered to a frontend — `originalUrl` with `transformation` applied, if set. */
  url: string
  /** The untransformed, canonical ImageKit URL. Always the base that `transformation` is applied to. */
  originalUrl: string
  thumbnail: string
  fileType: string
  mime: string
  width: number
  height: number
  size: number
  tags?: string[]
  /** Duration in seconds. Only present for video assets. */
  duration?: number
  /** ImageKit transformation string (e.g. "w-400,h-300,fo-auto") currently applied to `url`. */
  transformation?: string
  /**
   * Point of interest as fractions (0–1) of the original image's width/height. Not baked into
   * `url` — a focal point only matters when cropping to a specific size, which is the frontend's
   * call. See `focusTransformation()` in options.ts for how it maps to ImageKit `xc`/`yc`.
   */
  focalPoint?: FocalPoint
  title?: string
  alt?: string
  copyright?: string
  source?: string
}

export type FocalPoint = { x: number; y: number }

/** The editor-controlled fields of an asset, as saved from its settings panel. */
export type AssetSettings = Pick<
  SelectedAsset,
  'transformation' | 'focalPoint' | 'title' | 'alt' | 'copyright' | 'source'
>

export interface IKWidgetFile {
  fileId: string
  name: string
  filePath: string
  url: string
  thumbnail: string
  fileType: string
  mime: string
  width: number
  height: number
  size: number
  tags?: string[]
  duration?: number
}
