import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ImageKitAsset, ImageKitField } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Normalizes an ImageKit field to an array, handling Storyblok's `""` empty-field value. */
export function assetList(field: ImageKitField): ImageKitAsset[] {
  return Array.isArray(field) ? field : []
}

/** ImageKit fields are stored as arrays; most blocks only render the first asset. */
export function firstAsset(field: ImageKitField): ImageKitAsset | undefined {
  return assetList(field)[0]
}

/**
 * Sets the `tr` transformation param on an asset's URL for this specific placement (e.g. the
 * Hero always wants its background at a particular size). `asset.url` may already carry its own
 * `tr=` if an editor applied a transformation in Storyblok's field UI — that step is *chained*
 * onto (ImageKit's own `:`-separated multi-step syntax), not discarded or written as a second
 * `tr=` key: an editor's creative edit (grayscale, a crop focus, a format hint) should still show
 * up wherever the asset is used, with this placement's own sizing/quality applied as the next
 * step. Built by hand (not URLSearchParams) so values keep their literal, unencoded `w-400,h-300`
 * comma syntax rather than being percent-encoded. See
 * https://imagekit.io/docs/transformations#chained-transformations for the chaining syntax.
 */
export function ikUrl(asset: ImageKitAsset, transformation: string): string {
  const [base, query = ''] = asset.url.split('?')
  const params = query.split('&').filter(Boolean)
  const existingTr = params.find((param) => param.startsWith('tr='))?.slice('tr='.length)
  const otherParams = params.filter((param) => !param.startsWith('tr='))
  const placement = withFocalPoint(asset, transformation)
  const chained = existingTr ? `${existingTr}:${placement}` : placement
  otherParams.push(`tr=${chained}`)
  return `${base}?${otherParams.join('&')}`
}

/**
 * If the editor set a focal point and this placement crops (has both `w-` and `h-`), replace any
 * `fo-*` focus with explicit `xc`/`yc` centered on it. With the default `c-maintain_ratio` crop,
 * ImageKit scales the image to cover the box first and reads `xc`/`yc` in that *scaled* image's
 * pixels — so the center is computed from the original dimensions and the requested box here.
 * Placements that don't crop server-side (e.g. width-only) rely on `focalPointStyle()` instead.
 */
function withFocalPoint(asset: ImageKitAsset, transformation: string): string {
  const { focalPoint } = asset
  const parts = transformation.split(',')
  const width = Number(parts.find((part) => /^w-\d+$/.test(part))?.slice(2))
  const height = Number(parts.find((part) => /^h-\d+$/.test(part))?.slice(2))
  if (!focalPoint || !width || !height || asset.width <= 0 || asset.height <= 0) return transformation

  const scale = Math.max(width / asset.width, height / asset.height)
  const xc = Math.round(focalPoint.x * asset.width * scale)
  const yc = Math.round(focalPoint.y * asset.height * scale)
  return [...parts.filter((part) => !part.startsWith('fo-')), `xc-${xc}`, `yc-${yc}`].join(',')
}

/**
 * `object-position` for a browser-side `object-fit: cover` crop, so the focal point also holds
 * when the browser (not ImageKit) does the cropping — e.g. a full-bleed hero background.
 */
export function focalPointStyle(asset: ImageKitAsset): { objectPosition: string } | undefined {
  const { focalPoint } = asset
  if (!focalPoint) return undefined
  return { objectPosition: `${Math.round(focalPoint.x * 100)}% ${Math.round(focalPoint.y * 100)}%` }
}

/**
 * Whether an asset is a video. ImageKit's per-file `fileType` is only ever
 * "image" or "non-image" — video assets fall under "non-image" just like PDFs
 * or raw files — so videos have to be identified by MIME type instead.
 */
export function isVideoAsset(asset: ImageKitAsset): boolean {
  return asset.mime.startsWith('video/')
}
