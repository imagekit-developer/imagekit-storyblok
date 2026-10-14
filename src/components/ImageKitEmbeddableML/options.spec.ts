import { describe, test, expect, vi, beforeEach } from 'vitest'
import {
  applyDeliverySettings,
  applySettings,
  cropPreview,
  focusTransformation,
  buildInitialView,
  isVideoAsset,
  mergeAssets,
  moveAsset,
  parseOptions,
  previewThumbnail,
  withTransformation,
} from './options'
import type { SelectedAsset } from './types'

const asset = (overrides: Partial<SelectedAsset> = {}): SelectedAsset => ({
  fileId: 'file-1',
  name: 'photo.jpg',
  filePath: '/photo.jpg',
  url: 'https://ik.imagekit.io/demo/photo.jpg',
  originalUrl: 'https://ik.imagekit.io/demo/photo.jpg',
  thumbnail: 'https://ik.imagekit.io/demo/photo.jpg?tr=n-ik_ml_thumbnail',
  fileType: 'image',
  mime: 'image/jpeg',
  width: 800,
  height: 600,
  size: 12345,
  ...overrides,
})

describe('parseOptions', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  test('defaults multiple to true and everything else to undefined when no options are given', () => {
    const parsed = parseOptions({})
    expect(parsed.multiple).toBe(true)
    expect(parsed.imagekitId).toBeUndefined()
    expect(parsed.maxFiles).toBeUndefined()
    expect(parsed.loginViaSSO).toBe(false)
  })

  test('multiple is false only when explicitly set to the string "false"', () => {
    expect(parseOptions({ multiple: 'false' }).multiple).toBe(false)
    expect(parseOptions({ multiple: 'true' }).multiple).toBe(true)
    expect(parseOptions({ multiple: 'anything-else' }).multiple).toBe(true)
  })

  test('parses a valid maxFiles into a number', () => {
    expect(parseOptions({ maxFiles: '5' }).maxFiles).toBe(5)
  })

  test('ignores an invalid maxFiles and warns', () => {
    const parsed = parseOptions({ maxFiles: 'not-a-number' })
    expect(parsed.maxFiles).toBeUndefined()
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('maxFiles'))
  })

  test('ignores a zero or negative maxFiles', () => {
    expect(parseOptions({ maxFiles: '0' }).maxFiles).toBeUndefined()
    expect(parseOptions({ maxFiles: '-3' }).maxFiles).toBeUndefined()
  })

  test('accepts a valid fileType', () => {
    expect(parseOptions({ fileType: 'videos' }).fileType).toBe('videos')
  })

  test('ignores an invalid fileType and warns', () => {
    const parsed = parseOptions({ fileType: 'bogus' })
    expect(parsed.fileType).toBeUndefined()
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('fileType'))
  })

  test('clamps quality to the 1-100 range', () => {
    expect(parseOptions({ quality: '80' }).quality).toBe(80)
    expect(parseOptions({ quality: '150' }).quality).toBeUndefined()
    expect(parseOptions({ quality: '0' }).quality).toBeUndefined()
  })
})

describe('buildInitialView', () => {
  test('returns undefined when nothing is configured', () => {
    expect(buildInitialView(parseOptions({}))).toBeUndefined()
  })

  test('maps folderPath, searchQuery, collectionId and fileType to the widget shape', () => {
    expect(buildInitialView(parseOptions({ folderPath: '/marketing' }))).toEqual({ folderPath: '/marketing' })
    expect(buildInitialView(parseOptions({ searchQuery: 'name = "a.jpg"' }))).toEqual({
      searchQuery: 'name = "a.jpg"',
    })
    expect(buildInitialView(parseOptions({ collectionId: 'abc123' }))).toEqual({ collection: { id: 'abc123' } })
    expect(buildInitialView(parseOptions({ fileType: 'videos' }))).toEqual({ fileType: 'videos' })
  })

  test('"all" as collectionId opens the collections list', () => {
    expect(buildInitialView(parseOptions({ collectionId: 'all' }))).toEqual({ collection: {} })
  })

  test('prioritizes folderPath over the others when more than one is set', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    expect(buildInitialView(parseOptions({ folderPath: '/a', fileType: 'images' }))).toEqual({ folderPath: '/a' })
  })
})

describe('applyDeliverySettings', () => {
  test('leaves the delivered url unchanged when no transformation or quality is set', () => {
    const a = asset()
    const result = applyDeliverySettings(a, parseOptions({}))
    expect(result.url).toBe(a.url)
    expect(result.originalUrl).toBe(a.url)
    expect(result.transformation).toBeUndefined()
  })

  test('appends a transformation string to the url', () => {
    const result = applyDeliverySettings(asset(), parseOptions({ transformation: 'w-400,h-300' }))
    expect(result.url).toBe('https://ik.imagekit.io/demo/photo.jpg?tr=w-400,h-300')
  })

  test('folds quality into the transformation string', () => {
    const result = applyDeliverySettings(asset(), parseOptions({ quality: '75' }))
    expect(result.url).toBe('https://ik.imagekit.io/demo/photo.jpg?tr=q-75')
  })

  test('combines transformation and quality, and preserves an existing query string', () => {
    const result = applyDeliverySettings(
      asset({
        url: 'https://ik.imagekit.io/demo/photo.jpg?updatedAt=1',
        originalUrl: 'https://ik.imagekit.io/demo/photo.jpg?updatedAt=1',
      }),
      parseOptions({ transformation: 'w-400', quality: '75' }),
    )
    expect(result.url).toBe('https://ik.imagekit.io/demo/photo.jpg?updatedAt=1&tr=w-400,q-75')
  })

  test('does not modify the thumbnail', () => {
    const a = asset()
    const result = applyDeliverySettings(a, parseOptions({ transformation: 'w-400' }))
    expect(result.thumbnail).toBe(a.thumbnail)
  })
})

describe('mergeAssets', () => {
  test('replaces the existing selection in single-select mode', () => {
    const existing = [asset({ fileId: 'old' })]
    const incoming = [asset({ fileId: 'new' })]
    expect(mergeAssets(existing, incoming, parseOptions({ multiple: 'false' }))).toEqual(incoming)
  })

  test('appends new assets in multi-select mode', () => {
    const existing = [asset({ fileId: 'a' })]
    const incoming = [asset({ fileId: 'b' })]
    const result = mergeAssets(existing, incoming, parseOptions({}))
    expect(result.map((a) => a.fileId)).toEqual(['a', 'b'])
  })

  test('dedupes by fileId', () => {
    const existing = [asset({ fileId: 'a', name: 'first' })]
    const incoming = [asset({ fileId: 'a', name: 'second' })]
    const result = mergeAssets(existing, incoming, parseOptions({}))
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('first')
  })

  test('caps the merged selection at maxFiles and warns', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const existing = [asset({ fileId: 'a' }), asset({ fileId: 'b' })]
    const incoming = [asset({ fileId: 'c' }), asset({ fileId: 'd' })]
    const result = mergeAssets(existing, incoming, parseOptions({ maxFiles: '3' }))
    expect(result.map((a) => a.fileId)).toEqual(['a', 'b', 'c'])
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('maxFiles'))
  })
})

describe('moveAsset', () => {
  const assets = [asset({ fileId: 'a' }), asset({ fileId: 'b' }), asset({ fileId: 'c' })]

  test('moves an asset forward', () => {
    expect(moveAsset(assets, 0, 2).map((a) => a.fileId)).toEqual(['b', 'c', 'a'])
  })

  test('moves an asset backward', () => {
    expect(moveAsset(assets, 2, 0).map((a) => a.fileId)).toEqual(['c', 'a', 'b'])
  })

  test('is a no-op when fromIndex equals toIndex', () => {
    expect(moveAsset(assets, 1, 1)).toBe(assets)
  })

  test('is a no-op for an out-of-range index', () => {
    expect(moveAsset(assets, 0, 5)).toBe(assets)
    expect(moveAsset(assets, -1, 1)).toBe(assets)
  })

  test('does not mutate the input array', () => {
    const copy = assets.slice()
    moveAsset(assets, 0, 2)
    expect(assets).toEqual(copy)
  })
})

describe('isVideoAsset', () => {
  test('is true for a video/* mime type, regardless of fileType', () => {
    // ImageKit's real per-file fileType for videos is "non-image", not "video" —
    // confirmed against a live upload — so detection must go through mime.
    expect(isVideoAsset(asset({ mime: 'video/mp4', fileType: 'non-image' }))).toBe(true)
    expect(isVideoAsset(asset({ mime: 'video/quicktime', fileType: 'non-image' }))).toBe(true)
  })

  test('is false for an image mime type', () => {
    expect(isVideoAsset(asset({ mime: 'image/png', fileType: 'image' }))).toBe(false)
  })

  test('is false for other non-image mime types (e.g. a PDF)', () => {
    expect(isVideoAsset(asset({ mime: 'application/pdf', fileType: 'non-image' }))).toBe(false)
  })
})

describe('withTransformation', () => {
  test('applies a transformation on top of originalUrl', () => {
    const result = withTransformation(asset(), 'w-400')
    expect(result.url).toBe('https://ik.imagekit.io/demo/photo.jpg?tr=w-400')
    expect(result.originalUrl).toBe('https://ik.imagekit.io/demo/photo.jpg')
    expect(result.transformation).toBe('w-400')
  })

  test('replaces rather than compounds when re-applied', () => {
    const first = withTransformation(asset(), 'w-400')
    const second = withTransformation(first, 'w-800,h-600')
    expect(second.url).toBe('https://ik.imagekit.io/demo/photo.jpg?tr=w-800,h-600')
    expect(second.originalUrl).toBe('https://ik.imagekit.io/demo/photo.jpg')
  })

  test('clearing the transformation (undefined) resets url back to originalUrl', () => {
    const withTr = withTransformation(asset(), 'w-400')
    const cleared = withTransformation(withTr, undefined)
    expect(cleared.url).toBe(asset().originalUrl)
    expect(cleared.transformation).toBeUndefined()
  })

  test('treats a blank/whitespace-only string as clearing the transformation', () => {
    const withTr = withTransformation(asset(), 'w-400')
    const cleared = withTransformation(withTr, '   ')
    expect(cleared.url).toBe(asset().originalUrl)
    expect(cleared.transformation).toBeUndefined()
  })

  test('falls back to the current url as the base when originalUrl is missing (older stored content)', () => {
    const legacy = asset({ originalUrl: undefined as unknown as string })
    const result = withTransformation(legacy, 'w-400')
    expect(result.originalUrl).toBe(legacy.url)
    expect(result.url).toBe(`${legacy.url}?tr=w-400`)
  })

  test('does not modify the thumbnail', () => {
    const a = asset()
    expect(withTransformation(a, 'w-400').thumbnail).toBe(a.thumbnail)
  })
})

describe('previewThumbnail', () => {
  test('returns the plain thumbnail when no transformation is given', () => {
    expect(previewThumbnail(asset(), undefined)).toBe(asset().thumbnail)
    expect(previewThumbnail(asset(), '')).toBe(asset().thumbnail)
    expect(previewThumbnail(asset(), '   ')).toBe(asset().thumbnail)
  })

  test('replaces the thumbnail url\'s own tr param rather than duplicating the key', () => {
    // The fixture's thumbnail already carries ?tr=n-ik_ml_thumbnail, same as a real ImageKit
    // thumbnail URL — a second `tr=` key would be ambiguous, so it's replaced, not appended.
    const result = previewThumbnail(asset(), 'w-100,h-100')
    expect(result).toBe('https://ik.imagekit.io/demo/photo.jpg?tr=w-100,h-100')
  })

  test('does not touch the delivered url', () => {
    const a = asset()
    previewThumbnail(a, 'w-100,h-100')
    expect(a.url).toBe('https://ik.imagekit.io/demo/photo.jpg')
  })
})

describe('focusTransformation', () => {
  test('falls back to fo-auto without a focal point', () => {
    expect(focusTransformation(asset(), 300, 300)).toBe('w-300,h-300,fo-auto')
  })

  test('maps the focal point into the scaled image\'s pixel space', () => {
    // 2700x1800 covering a 300x300 box scales by 1/6 to 450x300; x=0.15 of 450 = 67.5 -> 68.
    const dogs = asset({ width: 2700, height: 1800, focalPoint: { x: 0.15, y: 0.5 } })
    expect(focusTransformation(dogs, 300, 300)).toBe('w-300,h-300,xc-68,yc-150')
  })

  test('uses whichever dimension forces the larger scale', () => {
    // 800x600 into 400x100: width needs 0.5, height needs ~0.167 -> scale 0.5 -> 400x300.
    const a = asset({ width: 800, height: 600, focalPoint: { x: 0.5, y: 0.9 } })
    expect(focusTransformation(a, 400, 100)).toBe('w-400,h-100,xc-200,yc-270')
  })

  test('falls back to fo-auto when the asset has no known dimensions', () => {
    expect(focusTransformation(asset({ width: 0, height: 0, focalPoint: { x: 0.2, y: 0.2 } }), 100, 100)).toBe(
      'w-100,h-100,fo-auto',
    )
  })
})

describe('cropPreview', () => {
  test('crops the original url, chaining the editor transformation first', () => {
    const a = asset({ url: 'https://ik.imagekit.io/demo/photo.jpg?tr=e-sepia', transformation: 'e-sepia' })
    expect(cropPreview(a, { transformation: 'e-grayscale', focalPoint: { x: 0.5, y: 0.5 } }, 100, 100)).toBe(
      'https://ik.imagekit.io/demo/photo.jpg?tr=e-grayscale:w-100,h-100,xc-67,yc-50',
    )
  })

  test('is just the crop when there is no transformation', () => {
    expect(cropPreview(asset(), { transformation: '  ' }, 100, 100)).toBe(
      'https://ik.imagekit.io/demo/photo.jpg?tr=w-100,h-100,fo-auto',
    )
  })
})

describe('applySettings', () => {
  test('applies the transformation to url and stores trimmed metadata', () => {
    const result = applySettings(asset(), {
      transformation: 'e-grayscale',
      focalPoint: { x: 0.3, y: 0.6 },
      title: '  A caption ',
      alt: 'Alt',
      copyright: 'ACME',
      source: 'Unsplash',
    })
    expect(result.url).toBe('https://ik.imagekit.io/demo/photo.jpg?tr=e-grayscale')
    expect(result.focalPoint).toEqual({ x: 0.3, y: 0.6 })
    expect(result.title).toBe('A caption')
    expect(result.alt).toBe('Alt')
    expect(result.copyright).toBe('ACME')
    expect(result.source).toBe('Unsplash')
  })

  test('blank fields clear previously saved values', () => {
    const saved = asset({ title: 'Old', alt: 'Old', focalPoint: { x: 0.1, y: 0.1 } })
    const result = applySettings(saved, { transformation: '', title: ' ', alt: '', focalPoint: undefined })
    expect(result.title).toBeUndefined()
    expect(result.alt).toBeUndefined()
    expect(result.focalPoint).toBeUndefined()
    expect(result.transformation).toBeUndefined()
  })

  test('does not bake the focal point into the delivered url', () => {
    const result = applySettings(asset(), { focalPoint: { x: 0.2, y: 0.8 } })
    expect(result.url).toBe(asset().url)
  })
})
