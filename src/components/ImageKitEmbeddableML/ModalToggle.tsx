import { FunctionComponent, useEffect, useRef, useState } from 'react'
import type { SetModalOpen } from '@storyblok/field-plugin'
import { ImagekitMediaLibraryWidget } from 'imagekit-media-library-widget'
import type { MediaLibraryWidgetCallback } from 'imagekit-media-library-widget'
import type { SelectedAsset, IKWidgetFile } from './types'
import { applyDeliverySettings, buildInitialView, ParsedOptions } from './options'

const ModalToggle: FunctionComponent<{
  isModalOpen: boolean
  setModalOpen: SetModalOpen<unknown>
  onSelect: (assets: SelectedAsset[]) => void
  hasSelection: boolean
  options: ParsedOptions
}> = ({ isModalOpen, setModalOpen, onSelect, hasSelection, options }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<ImagekitMediaLibraryWidget | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { imagekitId, multiple, maxFiles, loginViaSSO } = options
  const initialView = buildInitialView(options)
  // Only the shape of these values (not identity) should trigger a rebuild of the widget.
  const initialViewKey = JSON.stringify(initialView)

  // Kept in refs (rather than the effect's dependency array) so that a parent
  // re-render — e.g. after removing an asset from the preview list — doesn't tear
  // down and rebuild the widget iframe. Only genuine option changes should do that.
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const optionsRef = useRef(options)
  optionsRef.current = options

  useEffect(() => {
    if (!containerRef.current) return
    setError(null)

    const callback: MediaLibraryWidgetCallback = (payload) => {
      const assets: SelectedAsset[] = payload.data.map((file: IKWidgetFile) => ({
        fileId: file.fileId,
        name: file.name,
        filePath: file.filePath,
        url: file.url,
        originalUrl: file.url,
        thumbnail: file.thumbnail,
        fileType: file.fileType,
        mime: file.mime,
        width: file.width,
        height: file.height,
        size: file.size,
        tags: file.tags,
        duration: file.duration,
      }))
      onSelectRef.current(assets.map((asset) => applyDeliverySettings(asset, optionsRef.current)))
      setModalOpen(false)
    }

    try {
      widgetRef.current = new ImagekitMediaLibraryWidget(
        {
          container: containerRef.current,
          view: 'modal',
          renderOpenButton: false,
          dimensions: {
            height: '100%',
            width: '100%',
          },
          mlSettings: {
            multiple,
            ...(maxFiles !== undefined && { maxFiles }),
            ...(initialView && { initialView }),
            toolbar: {
              showCloseButton: true,
            },
            loginViaSSO,
            ...(imagekitId && { widgetImagekitId: imagekitId }),
          },
        },
        callback,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the ImageKit media library widget.')
    }

    return () => {
      widgetRef.current?.destroy()
      widgetRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setModalOpen, imagekitId, multiple, maxFiles, loginViaSSO, initialViewKey])

  useEffect(() => {
    if (!widgetRef.current) return
    if (isModalOpen) {
      widgetRef.current.open()
    }
  }, [isModalOpen])

  if (error) {
    return (
      <div className="ik-error">
        <p>{error}</p>
        <button className="btn w-full" type="button" onClick={() => setError(null)}>
          Retry
        </button>
      </div>
    )
  }

  return (
    <>
      <button className="btn w-full" type="button" onClick={() => setModalOpen(!isModalOpen)}>
        {isModalOpen ? 'Close' : hasSelection && multiple ? 'Add more assets' : 'Select from ImageKit'}
      </button>
      <div ref={containerRef} />
    </>
  )
}

export default ModalToggle
