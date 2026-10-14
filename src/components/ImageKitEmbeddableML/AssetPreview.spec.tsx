import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, vi } from 'vitest'
import AssetPreview from './AssetPreview'
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

const noop = { onRemove: vi.fn(), onMove: vi.fn(), onUpdate: vi.fn() }

describe('AssetPreview', () => {
  test('renders nothing for an empty list', () => {
    const { container } = render(<AssetPreview assets={[]} {...noop} />)
    expect(container.firstChild).toBeNull()
  })

  test('hides the drag handle when there is only one asset', () => {
    render(<AssetPreview assets={[asset()]} {...noop} />)
    expect(screen.queryByRole('button', { name: /reorder photo.jpg/i })).not.toBeInTheDocument()
  })

  test('shows a drag handle per asset when there is more than one', () => {
    const assets = [asset({ fileId: 'a', name: 'a.jpg' }), asset({ fileId: 'b', name: 'b.jpg' })]
    render(<AssetPreview assets={assets} {...noop} />)

    expect(screen.getByRole('button', { name: /reorder a.jpg/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reorder b.jpg/i })).toBeInTheDocument()
  })

  test('shows dimensions and size for an image', () => {
    render(<AssetPreview assets={[asset()]} {...noop} />)
    expect(screen.getByText('800×600 · 12.1 KB')).toBeInTheDocument()
  })

  test('shows a video badge and duration instead of dimensions for a video', () => {
    // ImageKit's real per-file fileType for a video is "non-image" — mime is what identifies it.
    const video = asset({
      fileType: 'non-image',
      mime: 'video/mp4',
      width: 1920,
      height: 1080,
      duration: 75,
      size: 2_500_000,
    })
    render(<AssetPreview assets={[video]} {...noop} />)

    expect(screen.getByText('Video')).toBeInTheDocument()
    expect(screen.getByText('1:15 · 2.4 MB')).toBeInTheDocument()
    expect(screen.queryByText(/1920/)).not.toBeInTheDocument()
  })

  test('calls onRemove with the asset fileId', async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()
    render(<AssetPreview assets={[asset()]} {...noop} onRemove={onRemove} />)

    await user.click(screen.getByRole('button', { name: /remove photo.jpg/i }))
    expect(onRemove).toHaveBeenCalledWith('file-1')
  })

  test('links "preview" to the asset url', () => {
    render(<AssetPreview assets={[asset()]} {...noop} />)
    expect(screen.getByRole('link', { name: /preview photo.jpg/i })).toHaveAttribute(
      'href',
      'https://ik.imagekit.io/demo/photo.jpg',
    )
  })
})

const openSettings = async (user: ReturnType<typeof userEvent.setup>, name = 'photo.jpg') =>
  user.click(screen.getByRole('button', { name: new RegExp(`^settings for ${name}`, 'i') }))

describe('AssetPreview settings panel', () => {
  test('is closed by default', () => {
    render(<AssetPreview assets={[asset()]} {...noop} />)
    expect(screen.queryByLabelText('Transformation')).not.toBeInTheDocument()
  })

  test('opens from the settings button, prefilled with the saved settings', async () => {
    const user = userEvent.setup()
    render(
      <AssetPreview
        assets={[asset({ transformation: 'e-grayscale', title: 'Hero', alt: 'Three dogs', copyright: 'ACME', source: 'https://x.y' })]}
        {...noop}
      />,
    )

    await openSettings(user)
    expect(screen.getByLabelText('Transformation')).toHaveValue('e-grayscale')
    expect(screen.getByLabelText('Title/Caption')).toHaveValue('Hero')
    expect(screen.getByLabelText('Alt text')).toHaveValue('Three dogs')
    expect(screen.getByLabelText('Copyright')).toHaveValue('ACME')
    expect(screen.getByLabelText('Source')).toHaveValue('https://x.y')
  })

  test('also opens by clicking the thumbnail', async () => {
    const user = userEvent.setup()
    render(<AssetPreview assets={[asset()]} {...noop} />)

    await user.click(screen.getByRole('button', { name: /open settings for photo.jpg/i }))
    expect(screen.getByLabelText('Transformation')).toBeInTheDocument()
  })

  test('saving passes every field to onUpdate and closes the panel', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    render(<AssetPreview assets={[asset()]} {...noop} onUpdate={onUpdate} />)

    await openSettings(user)
    await user.type(screen.getByLabelText('Transformation'), 'e-grayscale')
    await user.type(screen.getByLabelText('Title/Caption'), 'A caption')
    await user.type(screen.getByLabelText('Alt text'), 'Some alt')
    await user.type(screen.getByLabelText('Copyright'), 'ACME')
    await user.type(screen.getByLabelText('Source'), 'Unsplash')
    await user.click(screen.getByRole('button', { name: /^save$/i }))

    expect(onUpdate).toHaveBeenCalledWith('file-1', {
      transformation: 'e-grayscale',
      focalPoint: undefined,
      title: 'A caption',
      alt: 'Some alt',
      copyright: 'ACME',
      source: 'Unsplash',
    })
    expect(screen.queryByLabelText('Transformation')).not.toBeInTheDocument()
  })

  test('cancelling closes the panel without calling onUpdate', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    render(<AssetPreview assets={[asset()]} {...noop} onUpdate={onUpdate} />)

    await openSettings(user)
    await user.type(screen.getByLabelText('Alt text'), 'x')
    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(onUpdate).not.toHaveBeenCalled()
    expect(screen.queryByLabelText('Transformation')).not.toBeInTheDocument()
  })

  test('clicking the image sets a focal point from the click position', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    render(<AssetPreview assets={[asset()]} {...noop} onUpdate={onUpdate} />)

    await openSettings(user)
    const picker = screen.getByRole('button', { name: /^set focal point/i })
    picker.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100 }) as DOMRect
    fireEvent.click(picker, { clientX: 50, clientY: 75, detail: 1 })
    await user.click(screen.getByRole('button', { name: /^save$/i }))

    expect(onUpdate).toHaveBeenCalledWith('file-1', expect.objectContaining({ focalPoint: { x: 0.25, y: 0.75 } }))
  })

  test('arrow keys nudge the focal point, and Reset clears it', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    render(<AssetPreview assets={[asset({ focalPoint: { x: 0.5, y: 0.5 } })]} {...noop} onUpdate={onUpdate} />)

    await openSettings(user)
    const picker = screen.getByRole('button', { name: /^set focal point/i })
    fireEvent.keyDown(picker, { key: 'ArrowRight' })
    fireEvent.keyDown(picker, { key: 'ArrowUp' })
    await user.click(screen.getByRole('button', { name: /^save$/i }))
    expect(onUpdate).toHaveBeenLastCalledWith('file-1', expect.objectContaining({ focalPoint: { x: 0.55, y: 0.45 } }))

    await openSettings(user)
    await user.click(screen.getByRole('button', { name: /reset focal point/i }))
    await user.click(screen.getByRole('button', { name: /^save$/i }))
    expect(onUpdate).toHaveBeenLastCalledWith('file-1', expect.objectContaining({ focalPoint: undefined }))
  })

  test('hides the focal point picker for videos', async () => {
    const user = userEvent.setup()
    render(<AssetPreview assets={[asset({ fileType: 'non-image', mime: 'video/mp4' })]} {...noop} />)

    await openSettings(user)
    expect(screen.queryByRole('button', { name: /^set focal point/i })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Alt text')).toBeInTheDocument()
  })
})

describe('AssetPreview copy URL button', () => {
  test('copies the delivered (transformed) url', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    const url = 'https://ik.imagekit.io/demo/photo.jpg?tr=e-grayscale'
    render(<AssetPreview assets={[asset({ url })]} {...noop} />)

    await user.click(screen.getByRole('button', { name: /copy url for photo.jpg/i }))

    expect(writeText).toHaveBeenCalledWith(url)
    expect(await screen.findByRole('button', { name: /url copied/i })).toBeInTheDocument()
  })

  test('sits to the left of the settings button', () => {
    render(<AssetPreview assets={[asset()]} {...noop} />)
    const copy = screen.getByRole('button', { name: /copy url/i })
    const settings = screen.getByRole('button', { name: /^settings for/i })
    expect(copy.compareDocumentPosition(settings) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
