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
  const chained = existingTr ? `${existingTr}:${transformation}` : transformation
  otherParams.push(`tr=${chained}`)
  return `${base}?${otherParams.join('&')}`
}

/**
 * Whether an asset is a video. ImageKit's per-file `fileType` is only ever
 * "image" or "non-image" — video assets fall under "non-image" just like PDFs
 * or raw files — so videos have to be identified by MIME type instead.
 */
export function isVideoAsset(asset: ImageKitAsset): boolean {
  return asset.mime.startsWith('video/')
}
