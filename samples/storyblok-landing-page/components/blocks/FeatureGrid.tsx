import { storyblokEditable } from '@storyblok/react'
import type { FeatureGridStoryblok, FeatureStoryblok } from '@/lib/types'
import { firstAsset } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import StoryblokMedia from '@/components/StoryblokMedia'

function FeatureCard({ blok }: { blok: FeatureStoryblok }) {
  const icon = firstAsset(blok.icon)

  return (
    <Card {...storyblokEditable(blok)}>
      <CardHeader>
        {icon && (
          <StoryblokMedia asset={icon} transformation="w-64,h-64,fo-auto" className="mb-2 h-10 w-10" />
        )}
        <CardTitle>{blok.title}</CardTitle>
        {blok.description && <CardDescription>{blok.description}</CardDescription>}
      </CardHeader>
      <CardContent />
    </Card>
  )
}

export default function FeatureGrid({ blok }: { blok: FeatureGridStoryblok }) {
  return (
    <section {...storyblokEditable(blok)} className="mx-auto max-w-6xl px-6 py-20">
      {blok.heading && <h2 className="mb-10 text-center text-3xl font-semibold">{blok.heading}</h2>}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {blok.features?.map((feature) => (
          <FeatureCard blok={feature} key={feature._uid} />
        ))}
      </div>
    </section>
  )
}
