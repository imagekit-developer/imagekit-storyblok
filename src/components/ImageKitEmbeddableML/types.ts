export type StoryblokAsset = {
  id: string
  alt: string
  name: string
  focus: string
  title: string
  width: number
  height: number
  source: string
  filename: string
  copyright: string
  fieldtype: 'asset'
  meta_data: Record<string, unknown>
  public_id: string
  aspect_ratio: number
  is_external_url: boolean
  thumbnail: string
  mime: string
}

export type EditableFields = Pick<StoryblokAsset, 'alt' | 'title' | 'copyright' | 'source' | 'focus'>
