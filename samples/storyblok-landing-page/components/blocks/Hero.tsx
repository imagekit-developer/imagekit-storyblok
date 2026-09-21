import { storyblokEditable } from '@storyblok/react'
import type { HeroStoryblok } from '@/lib/types'
import { firstAsset } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import StoryblokMedia from '@/components/StoryblokMedia'

export default function Hero({ blok }: { blok: HeroStoryblok }) {
  const image = firstAsset(blok.image)

  return (
    <section {...storyblokEditable(blok)} className="relative overflow-hidden border-b border-border">
      {image && (
        <div className="absolute inset-0 -z-10">
          <StoryblokMedia
            asset={image}
            transformation="w-1920,q-70,fo-auto"
            className="h-full w-full object-cover opacity-20"
          />
        </div>
      )}
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 py-28 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">{blok.headline}</h1>
        {blok.subheadline && (
          <p className="max-w-2xl text-lg text-muted-foreground">{blok.subheadline}</p>
        )}
        {blok.cta_label && (
          <a
            href={blok.cta_url?.cached_url ?? blok.cta_url?.url ?? '#'}
            className={buttonVariants({ size: 'lg' })}
          >
            {blok.cta_label}
          </a>
        )}
      </div>
    </section>
  )
}
