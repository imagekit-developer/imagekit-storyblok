import type { FileTypeValue, InitialView } from 'imagekit-media-library-widget'
import type { SelectedAsset } from './types'

const FILE_TYPES = ['images', 'videos', 'cssJs', 'others'] as const
type FileType = (typeof FILE_TYPES)[number]

/**
 * Whether an asset is a video. ImageKit's per-file `fileType` metadata is only
 * ever "image" or "non-image" (the "videos" value in FILE_TYPES above is a
 * widget *search filter*, not a value that shows up on an actual file) — so
 * videos have to be identified by MIME type instead.
 */
export function isVideoAsset(asset: SelectedAsset): boolean {
  return asset.mime.startsWith('video/')
}

export interface ParsedOptions {
  /** ImageKit ID to authenticate the widget with. Optional — if omitted, the widget
   * uses the account of whichever ImageKit user is already signed in in the editor's
   * browser. Set this explicitly when a space may be used by people with access to
   * more than one ImageKit account. */
  imagekitId?: string
  multiple: boolean
  maxFiles?: number
  loginViaSSO: boolean
  folderPath?: string
  collectionId?: string
  searchQuery?: string
  fileType?: FileType
  /** Default transformation string (e.g. "w-1200,q-80") applied to the `url` of
   * every asset at selection time. Only affects assets selected after the option
   * is set — see https://imagekit.io/docs/transformations. */
  transformation?: string
  /** Convenience option folded into `transformation` as `q-<value>`. */
  quality?: number
}

function warn(key: string, value: string, expectation: string): void {
  console.warn(`[ImageKit field plugin] Ignoring invalid "${key}" option ("${value}"). Expected ${expectation}.`)
}

function parsePositiveInt(key: string, raw: string | undefined, max?: number): number | undefined {
  if (!raw) return undefined
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed <= 0 || (max !== undefined && parsed > max)) {
    warn(key, raw, max !== undefined ? `an integer between 1 and ${max}` : 'a positive integer')
    return undefined
  }
  return parsed
}

/** Turns the raw string key/value options Storyblok gives every field plugin into a validated, typed config. */
export function parseOptions(options: Record<string, string>): ParsedOptions {
  let fileType: FileType | undefined
  if (options.fileType) {
    if ((FILE_TYPES as readonly string[]).includes(options.fileType)) {
      fileType = options.fileType as FileType
    } else {
      warn('fileType', options.fileType, `one of ${FILE_TYPES.join(', ')}`)
    }
  }

  return {
    imagekitId: options.imagekitId || undefined,
    multiple: options.multiple !== 'false',
    maxFiles: parsePositiveInt('maxFiles', options.maxFiles),
    loginViaSSO: options.loginViaSSO === 'true',
    folderPath: options.folderPath || undefined,
    collectionId: options.collectionId || undefined,
    searchQuery: options.searchQuery || undefined,
    fileType,
    transformation: options.transformation || undefined,
    quality: parsePositiveInt('quality', options.quality, 100),
  }
}

/**
 * The widget accepts only one `initialView` mode at a time. If more than one of
 * folderPath/collectionId/searchQuery/fileType is configured, the first match in
 * this priority order wins (matching the order the widget's own docs list them in).
 */
export function buildInitialView(opts: ParsedOptions): InitialView | undefined {
  const set = [opts.folderPath, opts.searchQuery, opts.collectionId, opts.fileType].filter(Boolean).length
  if (set > 1) {
    console.warn(
      '[ImageKit field plugin] Only one of "folderPath", "searchQuery", "collectionId" or "fileType" can be active at once. Using the first one found.',
    )
  }

  if (opts.folderPath) return { folderPath: opts.folderPath }
  if (opts.searchQuery) return { searchQuery: opts.searchQuery }
  if (opts.collectionId) return { collection: opts.collectionId === 'all' ? {} : { id: opts.collectionId } }
  if (opts.fileType) return { fileType: opts.fileType as FileTypeValue }
  return undefined
}

/**
 * Sets the `tr` query param on an ImageKit URL, replacing any existing one rather than appending
 * a duplicate — real ImageKit thumbnail URLs often already carry `?tr=n-ik_ml_thumbnail`, and a
 * second `tr=` key would be ambiguous rather than a valid chained transformation. Built by hand
 * (not URLSearchParams) so the value keeps its literal, unencoded `w-400,h-300` comma syntax —
 * ImageKit's own docs and dashboard always show `tr=` this way, and percent-encoding the commas
 * would be functionally fine but look broken to anyone reading the URL.
 */
function appendTransformation(url: string, transformation: string): string {
  const [base, query = ''] = url.split('?')
  const params = query.split('&').filter((param) => param && !param.startsWith('tr='))
  params.push(`tr=${transformation}`)
  return `${base}?${params.join('&')}`
}

/**
 * Applies (or clears) an ImageKit transformation string on an asset. Always transforms from
 * `originalUrl` — the untransformed base — rather than the current `url`, so re-applying a
 * different transformation replaces it cleanly instead of compounding `tr=` params. This is the
 * single place `url` gets (re)computed, used both for the field-level default transformation
 * (`applyDeliverySettings`, below) and for an editor's own per-asset edit in the field UI.
 */
export function withTransformation(asset: SelectedAsset, transformation: string | undefined): SelectedAsset {
  const originalUrl = asset.originalUrl ?? asset.url
  const clean = transformation?.trim() || undefined
  return {
    ...asset,
    originalUrl,
    transformation: clean,
    url: clean ? appendTransformation(originalUrl, clean) : originalUrl,
  }
}

/** The same transformation, applied to the asset's thumbnail instead — for a live preview. */
export function previewThumbnail(asset: SelectedAsset, transformation: string | undefined): string {
  const clean = transformation?.trim()
  return clean ? appendTransformation(asset.thumbnail, clean) : asset.thumbnail
}

/** Applies the field-level default "transformation"/"quality" options to a newly selected asset. */
export function applyDeliverySettings(asset: SelectedAsset, opts: ParsedOptions): SelectedAsset {
  const transformation = [opts.transformation, opts.quality ? `q-${opts.quality}` : undefined]
    .filter(Boolean)
    .join(',')

  return withTransformation(asset, transformation || undefined)
}

/**
 * Reconciles newly picked assets with what's already stored on the field.
 * In multi-select mode, new picks are appended (deduped by fileId) rather than
 * replacing the existing selection, so editors can build up a set of assets across
 * multiple visits to the widget. Single-select mode always replaces.
 */
export function mergeAssets(existing: SelectedAsset[], incoming: SelectedAsset[], opts: ParsedOptions): SelectedAsset[] {
  if (!opts.multiple) return incoming.slice(0, 1)

  const existingIds = new Set(existing.map((asset) => asset.fileId))
  const merged = [...existing, ...incoming.filter((asset) => !existingIds.has(asset.fileId))]

  if (opts.maxFiles !== undefined && merged.length > opts.maxFiles) {
    console.warn(
      `[ImageKit field plugin] Selection capped at maxFiles (${opts.maxFiles}); ${merged.length - opts.maxFiles} asset(s) were dropped.`,
    )
    return merged.slice(0, opts.maxFiles)
  }

  return merged
}

/** Moves the asset at `fromIndex` to `toIndex`, used by the preview list's drag-to-reorder. */
export function moveAsset(assets: SelectedAsset[], fromIndex: number, toIndex: number): SelectedAsset[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    fromIndex >= assets.length ||
    toIndex < 0 ||
    toIndex >= assets.length
  ) {
    return assets
  }

  const next = assets.slice()
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}
