import { FunctionComponent, useEffect, useRef } from 'react'
import type { SetModalOpen, SetContent } from '@storyblok/field-plugin'
import { ImagekitMediaLibraryWidget } from 'imagekit-media-library-widget'
import type { MediaLibraryWidgetCallback } from 'imagekit-media-library-widget'
import type { SelectedAsset, IKWidgetFile } from './types'

const ModalToggle: FunctionComponent<{
  isModalOpen: boolean
  setModalOpen: SetModalOpen<unknown>
  setContent: SetContent<SelectedAsset[]>
  imagekitId: string
  multiple: boolean
  maxFiles?: number
}> = ({ isModalOpen, setModalOpen, setContent, imagekitId, multiple, maxFiles }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<ImagekitMediaLibraryWidget | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const callback: MediaLibraryWidgetCallback = (payload) => {
      const assets: SelectedAsset[] = payload.data.map((file: IKWidgetFile) => ({
        fileId: file.fileId,
        name: file.name,
        filePath: file.filePath,
        url: file.url,
        thumbnail: file.thumbnail,
        fileType: file.fileType,
        mime: file.mime,
        width: file.width,
        height: file.height,
        size: file.size,
      }))
      setContent(assets)
      setModalOpen(false)
    }

    widgetRef.current = new ImagekitMediaLibraryWidget(
      {
        container: containerRef.current,
        view: 'modal',
        renderOpenButton: false,
        dimensions: {
          height: '100%',
          width: '100%'
        },
        mlSettings: {
          multiple,
          ...(maxFiles !== undefined && { maxFiles }),
          toolbar: {
            showCloseButton: true,
          },
          loginViaSSO: false,
          widgetImagekitId: imagekitId,
        },
      },
      callback,
    )

    return () => {
      widgetRef.current?.destroy()
      widgetRef.current = null
    }
  }, [setModalOpen, setContent, imagekitId, multiple, maxFiles])

  useEffect(() => {
    if (!widgetRef.current) return
    if (isModalOpen) {
      widgetRef.current.open()
    }
  }, [isModalOpen])

  return (
    <>
      <button
        className="btn w-full"
        type="button"
        onClick={() => setModalOpen(!isModalOpen)}
      >
        {isModalOpen ? 'Close' : 'Open'} modal
      </button>
      <div ref={containerRef} />
    </>
  )
}

export default ModalToggle
