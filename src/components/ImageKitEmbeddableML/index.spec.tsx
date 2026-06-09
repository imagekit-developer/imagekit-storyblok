import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { setupFieldPlugin } from '@storyblok/field-plugin/test'
import { ImagekitMediaLibraryWidget } from 'imagekit-media-library-widget'
import FieldPlugin, { isValidAsset } from '.'

const openMock = vi.fn()
const destroyMock = vi.fn()

vi.mock('imagekit-media-library-widget', () => ({
  ImagekitMediaLibraryWidget: vi.fn().mockImplementation(() => ({
    open: openMock,
    destroy: destroyMock,
  })),
}))

describe('ImageKitEmbeddableML', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders nothing before plugin is loaded', () => {
    // Do not call setupFieldPlugin — plugin stays in initialising state
    const { container } = render(<FieldPlugin />)
    expect(container.firstChild).toBeNull()
  })

  test('renders the Select assets button in the empty state once loaded', async () => {
    const { cleanUp } = setupFieldPlugin()
    render(<FieldPlugin />)
    // Default options → multiple is true, so the plural label is shown.
    expect(await screen.findByRole('button', { name: /select assets/i })).toBeInTheDocument()
    cleanUp()
  })

  test('instantiates the ImageKit widget on mount', async () => {
    const { cleanUp } = setupFieldPlugin()
    render(<FieldPlugin />)
    await screen.findByRole('button', { name: /select assets/i })
    expect(ImagekitMediaLibraryWidget).toHaveBeenCalledTimes(1)
    cleanUp()
  })

  test('clicking Select assets opens the widget modal', async () => {
    const { cleanUp } = setupFieldPlugin()
    const user = userEvent.setup()
    render(<FieldPlugin />)

    const button = await screen.findByRole('button', { name: /select assets/i })
    await user.click(button)

    // The button click calls actions.setModalOpen(true), which triggers
    // the effect that calls widget.open().
    await vi.waitFor(() => expect(openMock).toHaveBeenCalled())

    cleanUp()
  })

  describe('isValidAsset', () => {
    // Storyblok seeds asset fields with { id: null, filename: null, fieldtype: 'asset', ... }.
    // That shell has the `id` and `filename` keys but with null values — a key-presence
    // check would accept it and AssetItem would then crash on asset.mime.startsWith(...),
    // tearing down the whole plugin and leaving the field blank with no button.
    test('rejects the Storyblok default empty-asset shell', () => {
      expect(isValidAsset({ id: null, filename: null, fieldtype: 'asset' })).toBe(false)
      expect(isValidAsset({ id: '', filename: '', fieldtype: 'asset' })).toBe(false)
    })

    test('rejects non-asset values', () => {
      expect(isValidAsset(null)).toBe(false)
      expect(isValidAsset(undefined)).toBe(false)
      expect(isValidAsset('string')).toBe(false)
      expect(isValidAsset({})).toBe(false)
      expect(isValidAsset({ id: '123' })).toBe(false)
      expect(isValidAsset({ filename: 'a.jpg' })).toBe(false)
    })

    test('accepts a real asset with a non-empty id and filename', () => {
      expect(isValidAsset({ id: '123', filename: 'https://ik.imagekit.io/x/a.jpg' })).toBe(true)
    })
  })
})
