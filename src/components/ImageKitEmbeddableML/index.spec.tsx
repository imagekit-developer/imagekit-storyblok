import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { setupFieldPlugin } from '@storyblok/field-plugin/test'
import type { MediaLibraryWidgetCallback } from 'imagekit-media-library-widget'
import FieldPlugin from '.'

let capturedCallback: MediaLibraryWidgetCallback | undefined

vi.mock('imagekit-media-library-widget', () => ({
  ImagekitMediaLibraryWidget: vi.fn().mockImplementation((_options, callback) => {
    capturedCallback = callback
    return {
      open: vi.fn(),
      destroy: vi.fn(),
    }
  }),
}))

const fakeFile = (overrides: Partial<Record<string, unknown>> = {}) => ({
  fileId: 'file-1',
  name: 'photo.jpg',
  filePath: '/photo.jpg',
  url: 'https://ik.imagekit.io/demo/photo.jpg',
  thumbnail: 'https://ik.imagekit.io/demo/photo.jpg?tr=n-ik_ml_thumbnail',
  fileType: 'image',
  mime: 'image/jpeg',
  width: 800,
  height: 600,
  size: 12345,
  ...overrides,
})

describe('ImageKitEmbeddableML', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedCallback = undefined
  })

  test('renders nothing before plugin is loaded', () => {
    // Do not call setupFieldPlugin — plugin stays in initialising state
    const { container } = render(<FieldPlugin />)
    expect(container.firstChild).toBeNull()
  })

  test('renders the select button once loaded, with no asset preview', async () => {
    const { cleanUp } = setupFieldPlugin()
    render(<FieldPlugin />)
    expect(await screen.findByRole('button', { name: /select from imagekit/i })).toBeInTheDocument()
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
    cleanUp()
  })

  test('button label toggles between select and close as modal opens and closes', async () => {
    const { cleanUp } = setupFieldPlugin()
    const user = userEvent.setup()
    render(<FieldPlugin />)

    const button = await screen.findByRole('button', { name: /select from imagekit/i })
    await user.click(button)
    await waitFor(() => expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /close/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /select from imagekit/i })).toBeInTheDocument())

    cleanUp()
  })

  test('selecting an asset in the widget shows it in the preview list and switches the button label', async () => {
    const { cleanUp } = setupFieldPlugin()
    render(<FieldPlugin />)
    await screen.findByRole('button', { name: /select from imagekit/i })

    expect(capturedCallback).toBeDefined()
    act(() => capturedCallback!({ data: [fakeFile()] }))

    expect(await screen.findByText('photo.jpg')).toBeInTheDocument()
    expect(screen.getByText('800×600 · 12.1 KB')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /add more assets/i })).toBeInTheDocument()

    cleanUp()
  })

  test('selecting more assets in multi-select mode appends rather than replaces', async () => {
    const { cleanUp } = setupFieldPlugin()
    render(<FieldPlugin />)
    await screen.findByRole('button', { name: /select from imagekit/i })

    act(() => capturedCallback!({ data: [fakeFile({ fileId: 'file-1', name: 'first.jpg' })] }))
    await screen.findByText('first.jpg')

    act(() => capturedCallback!({ data: [fakeFile({ fileId: 'file-2', name: 'second.jpg' })] }))
    await screen.findByText('second.jpg')

    expect(screen.getByText('first.jpg')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)

    cleanUp()
  })

  test('removing an asset from the preview list clears it from the field content', async () => {
    const { cleanUp } = setupFieldPlugin()
    const user = userEvent.setup()
    render(<FieldPlugin />)
    await screen.findByRole('button', { name: /select from imagekit/i })

    act(() => capturedCallback!({ data: [fakeFile()] }))
    await screen.findByText('photo.jpg')

    await user.click(screen.getByRole('button', { name: /remove photo.jpg/i }))

    await waitFor(() => expect(screen.queryByText('photo.jpg')).not.toBeInTheDocument())
    expect(await screen.findByRole('button', { name: /select from imagekit/i })).toBeInTheDocument()

    cleanUp()
  })
})
