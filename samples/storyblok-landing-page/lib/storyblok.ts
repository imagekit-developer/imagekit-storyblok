import { apiPlugin, storyblokInit } from '@storyblok/react'
import Page from '@/components/blocks/Page'
import Hero from '@/components/blocks/Hero'
import FeatureGrid from '@/components/blocks/FeatureGrid'
import Gallery from '@/components/blocks/Gallery'

const accessToken = process.env.NEXT_PUBLIC_STORYBLOK_CONTENT_TOKEN
const region = (process.env.NEXT_PUBLIC_STORYBLOK_REGION as 'eu' | 'us' | 'cn' | 'ap') || 'eu'

if (!accessToken) {
  throw new Error(
    'Missing NEXT_PUBLIC_STORYBLOK_CONTENT_TOKEN. Copy .env.local.example to .env.local and set it to your space\'s preview token.',
  )
}

storyblokInit({
  accessToken,
  use: [apiPlugin],
  apiOptions: { region },
  components: {
    page: Page,
    hero: Hero,
    feature_grid: FeatureGrid,
    gallery: Gallery,
  },
})

export type StoryVersion = 'draft' | 'published'

export function getStoryVersion(): StoryVersion {
  return process.env.NEXT_PUBLIC_STORYBLOK_VERSION === 'published' ? 'published' : 'draft'
}
