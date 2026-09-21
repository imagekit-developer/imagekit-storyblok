import { getStoryblokApi } from '@storyblok/react'
import type { ISbStoryData } from '@storyblok/react'
import StoryblokBridge from '@/components/StoryblokBridge'
import type { PageStoryblok } from '@/lib/types'
import { getStoryVersion } from '@/lib/storyblok'

// Re-fetched on every request so edits made in the Storyblok Visual Editor
// (draft version) show up on reload without a redeploy.
export const dynamic = 'force-dynamic'

const STORY_SLUG = 'home'

export default async function HomePage() {
  const storyblokApi = getStoryblokApi()
  const version = getStoryVersion()
  const { data } = await storyblokApi.get(`cdn/stories/${STORY_SLUG}`, {
    version,
    // Storyblok's CDN pins responses to a "cache version" (cv): the first
    // request of a process with no explicit cv gets whatever the edge
    // happens to have cached, and every later request silently reuses that
    // same (possibly stale) cv. For draft content we want every request to
    // see the latest edit, so force a fresh cv each time. Published content
    // is left to Storyblok's normal cache (invalidated on publish), since a
    // storefront wants that CDN caching for performance.
    ...(version === 'draft' && { cv: Date.now() }),
  })

  const story = data.story as ISbStoryData<PageStoryblok>

  return <StoryblokBridge story={story} />
}
