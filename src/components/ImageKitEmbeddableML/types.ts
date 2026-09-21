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
}

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
