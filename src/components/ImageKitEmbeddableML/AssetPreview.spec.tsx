import { render, screen } from '@testing-library/react'
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

const noop = { onRemove: vi.fn(), onMove: vi.fn(), onTransform: vi.fn() }

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

describe('AssetPreview transformation editor', () => {
  test('is closed by default', () => {
    render(<AssetPreview assets={[asset()]} {...noop} />)
    expect(screen.queryByLabelText('Transformation')).not.toBeInTheDocument()
  })

  test('opens on clicking the edit button, prefilled with the current transformation', async () => {
    const user = userEvent.setup()
    render(<AssetPreview assets={[asset({ transformation: 'w-400' })]} {...noop} />)

    await user.click(screen.getByRole('button', { name: /edit transformation for photo.jpg/i }))
    expect(screen.getByLabelText('Transformation')).toHaveValue('w-400')
  })

  test('applying a new transformation calls onTransform with the trimmed value and closes the editor', async () => {
    const user = userEvent.setup()
    const onTransform = vi.fn()
    render(<AssetPreview assets={[asset()]} {...noop} onTransform={onTransform} />)

    await user.click(screen.getByRole('button', { name: /edit transformation for photo.jpg/i }))
    await user.type(screen.getByLabelText('Transformation'), '  w-400,h-300  ')
    await user.click(screen.getByRole('button', { name: /^apply$/i }))

    expect(onTransform).toHaveBeenCalledWith('file-1', '  w-400,h-300  ')
    expect(screen.queryByLabelText('Transformation')).not.toBeInTheDocument()
  })

  test('cancelling closes the editor without calling onTransform', async () => {
    const user = userEvent.setup()
    const onTransform = vi.fn()
    render(<AssetPreview assets={[asset()]} {...noop} onTransform={onTransform} />)

    await user.click(screen.getByRole('button', { name: /edit transformation for photo.jpg/i }))
    await user.type(screen.getByLabelText('Transformation'), 'w-400')
    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(onTransform).not.toHaveBeenCalled()
    expect(screen.queryByLabelText('Transformation')).not.toBeInTheDocument()
  })

  test('only shows Reset when a transformation is already applied, and it clears via onTransform(undefined)', async () => {
    const user = userEvent.setup()
    const onTransform = vi.fn()

    const { rerender } = render(<AssetPreview assets={[asset()]} {...noop} onTransform={onTransform} />)
    await user.click(screen.getByRole('button', { name: /edit transformation for photo.jpg/i }))
    expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /cancel/i }))

    rerender(<AssetPreview assets={[asset({ transformation: 'w-400' })]} {...noop} onTransform={onTransform} />)
    await user.click(screen.getByRole('button', { name: /edit transformation for photo.jpg/i }))
    await user.click(screen.getByRole('button', { name: /reset/i }))

    expect(onTransform).toHaveBeenCalledWith('file-1', undefined)
  })
})
