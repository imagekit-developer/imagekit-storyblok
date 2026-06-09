import { FunctionComponent, useEffect, useRef } from 'react'
import type { SetModalOpen } from '@storyblok/field-plugin'
import { ImagekitMediaLibraryWidget } from 'imagekit-media-library-widget'
import type { MediaLibraryWidgetCallback } from 'imagekit-media-library-widget'
import type { StoryblokAsset } from './types'

const ModalToggle: FunctionComponent<{
  isModalOpen: boolean
  setModalOpen: SetModalOpen<unknown>
  onSelect: (assets: StoryblokAsset[]) => void
  imagekitId: string
  multiple: boolean
  maxFiles?: number
}> = ({ isModalOpen, setModalOpen, onSelect, imagekitId, multiple, maxFiles }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<ImagekitMediaLibraryWidget | null>(null)
  // Always call the latest onSelect without recreating the widget on every render
  const onSelectRef = useRef(onSelect)
  useEffect(() => { onSelectRef.current = onSelect })

  useEffect(() => {
    if (!containerRef.current) return

    const callback: MediaLibraryWidgetCallback = (payload) => {
      // The widget fires this for both INSERT and CLOSE events; CLOSE has no `data` array.
      if (!Array.isArray(payload?.data)) {
        setModalOpen(false)
        return
      }
      const assets: StoryblokAsset[] = payload.data.map((file: any) => ({
        id: String(file.fileId),
        alt: '',
        name: file.name,
        focus: '',
        title: '',
        width: file.width ?? 0,
        height: file.height ?? 0,
        source: '',
        filename: file.url,
        copyright: '',
        fieldtype: 'asset' as const,
        meta_data: {},
        public_id: file.filePath,
        aspect_ratio: file.width && file.height ? file.width / file.height : 0,
        is_external_url: true,
        thumbnail: file.thumbnail,
        mime: file.mime,
      }))
      onSelectRef.current(assets)
      setModalOpen(false)
    }

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
          toolbar: {
            showCloseButton: false,
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
  }, [setModalOpen, imagekitId, multiple, maxFiles])

  useEffect(() => {
    if (!widgetRef.current) return
    if (isModalOpen) {
      widgetRef.current.open()
    }
  }, [isModalOpen])

  return <div ref={containerRef} />
}

export default ModalToggle
