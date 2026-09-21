'use client'

// Next.js bundles Server Components and Client Components into separate
// module graphs. `storyblokInit()` in app/layout.tsx only registers
// components for the server graph (so page.tsx's `getStoryblokApi()` call
// works) — this import re-runs it in the client graph too, which is where
// <StoryblokComponent> below actually resolves "page"/"hero"/etc. Without
// this, resolution silently fails with "Component X doesn't exist."
import '@/lib/storyblok'
import { StoryblokComponent, useStoryblokState } from '@storyblok/react'
import type { ISbStoryData } from '@storyblok/react'
import type { PageStoryblok } from '@/lib/types'

interface StoryblokBridgeProps {
  story: ISbStoryData<PageStoryblok>
}

/**
 * Client component wrapping `useStoryblokState`, which subscribes to
 * postMessage events from the Visual Editor iframe and live-updates
 * `story.content` as an editor types — this is what makes the preview
 * pane update instantly instead of requiring a page reload.
 */
export default function StoryblokBridge({ story }: StoryblokBridgeProps) {
  const liveStory = useStoryblokState(story)
  const content = liveStory?.content ?? story.content

  return <StoryblokComponent blok={content} />
}
