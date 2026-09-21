import type { ImageKitAsset } from '@/lib/types'
import { ikUrl, isVideoAsset } from '@/lib/utils'

interface StoryblokMediaProps {
  asset: ImageKitAsset
  className?: string
  /** ImageKit transformation string, e.g. "w-1200,h-630,fo-auto,q-80". */
  transformation?: string
}

/**
 * Renders an asset selected through the ImageKit field plugin — an <img> for
 * images, a <video> for video assets. Uses plain elements (not next/image)
 * because the URL already carries ImageKit's own resize/format
 * transformations via the `tr` query param.
 */
export default function StoryblokMedia({ asset, className, transformation }: StoryblokMediaProps) {
  const src = transformation ? ikUrl(asset, transformation) : asset.url

  if (isVideoAsset(asset)) {
    return (
      <video
        className={className}
        poster={asset.thumbnail}
        controls
        muted
        playsInline
        width={asset.width || undefined}
        height={asset.height || undefined}
        preload="metadata"
      >
        <source src={src} type={asset.mime} />
      </video>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={asset.name} width={asset.width} height={asset.height} className={className} loading="lazy" />
  )
}
