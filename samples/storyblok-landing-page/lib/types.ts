import type { SbBlokData } from '@storyblok/react'

/**
 * Shape written into a Storyblok field by the ImageKit field plugin's
 * `setContent` call. Mirrors `SelectedAsset` in the plugin repo
 * (src/components/ImageKitEmbeddableML/types.ts) — the plugin is the
 * only writer of this shape, so the frontend just needs to agree on it.
 */
export interface ImageKitAsset {
  fileId: string
  name: string
  filePath: string
  /** The URL to render — already has any editor-applied transformation baked in. */
  url: string
  /** The untransformed, canonical ImageKit URL `url` was derived from. Absent on assets selected before this field existed. */
  originalUrl?: string
  thumbnail: string
  fileType: string
  mime: string
  width: number
  height: number
  size: number
  /** Duration in seconds. Only present for video assets. */
  duration?: number
  /** ImageKit transformation string (e.g. "w-400,h-300,fo-auto") currently applied to `url`. */
  transformation?: string
}

/**
 * A Storyblok field using the ImageKit plugin stores an array once an editor
 * has selected assets — but a field that has never been touched comes back
 * from the API as `""` (Storyblok's default empty value for custom/plugin
 * field types), not `[]` or `undefined`. Always read these through
 * `assetList()`/`firstAsset()` in lib/utils.ts rather than assuming the
 * array shape directly.
 */
export type ImageKitField = ImageKitAsset[] | '' | undefined

export interface HeroStoryblok extends SbBlokData {
  component: 'hero'
  headline: string
  subheadline?: string
  cta_label?: string
  cta_url?: { url: string; cached_url?: string; linktype?: string }
  image?: ImageKitField
}

export interface FeatureStoryblok extends SbBlokData {
  component: 'feature'
  title: string
  description?: string
  icon?: ImageKitField
}

export interface FeatureGridStoryblok extends SbBlokData {
  component: 'feature_grid'
  heading?: string
  features: FeatureStoryblok[]
}

export interface GalleryStoryblok extends SbBlokData {
  component: 'gallery'
  heading?: string
  images?: ImageKitField
}

export type PageBlok = HeroStoryblok | FeatureGridStoryblok | GalleryStoryblok

export interface PageStoryblok extends SbBlokData {
  component: 'page'
  body: PageBlok[]
}
