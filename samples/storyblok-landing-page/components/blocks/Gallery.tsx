import { storyblokEditable } from '@storyblok/react'
import type { GalleryStoryblok } from '@/lib/types'
import { assetList } from '@/lib/utils'
import StoryblokMedia from '@/components/StoryblokMedia'

export default function Gallery({ blok }: { blok: GalleryStoryblok }) {
  const images = assetList(blok.images)

  return (
    <section {...storyblokEditable(blok)} className="mx-auto max-w-6xl px-6 py-20">
      {blok.heading && <h2 className="mb-10 text-center text-3xl font-semibold">{blok.heading}</h2>}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {images.map((asset) => (
          <figure key={asset.fileId} className="m-0">
            <StoryblokMedia
              asset={asset}
              transformation="w-480,h-480,fo-auto,c-maintain_ratio"
              className="aspect-square w-full rounded-md object-cover"
            />
            {(asset.title || asset.copyright) && (
              <figcaption className="mt-2 text-sm">
                {asset.title && <span className="block font-medium">{asset.title}</span>}
                {asset.copyright && (
                  <span className="block text-xs text-muted-foreground">
                    {asset.source ? (
                      <a href={asset.source} className="hover:underline" target="_blank" rel="noreferrer">
                        {asset.copyright}
                      </a>
                    ) : (
                      asset.copyright
                    )}
                  </span>
                )}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
      {images.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          No images selected yet — add some via the ImageKit field in this story&apos;s Gallery block.
        </p>
      )}
    </section>
  )
}
