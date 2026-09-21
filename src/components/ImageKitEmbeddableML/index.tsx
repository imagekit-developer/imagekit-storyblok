import './example.css'
import AssetPreview from './AssetPreview'
import ModalToggle from './ModalToggle'
import { FunctionComponent } from 'react'
import { useFieldPlugin } from '@storyblok/field-plugin/react'
import type { SelectedAsset } from './types'
import { mergeAssets, moveAsset, parseOptions, withTransformation } from './options'

const isValidAsset = (item: unknown): item is SelectedAsset =>
  typeof item === 'object' && item !== null && 'url' in item && 'fileId' in item

const FieldPlugin: FunctionComponent = () => {
  const { type, data, actions } = useFieldPlugin<SelectedAsset[]>({
    enablePortalModal: true,
    validateContent: (content: unknown) => ({
      content: Array.isArray(content) ? content.filter(isValidAsset) : [],
    }),
  })

  if (type !== 'loaded') {
    return null
  }

  const options = parseOptions(data.options)
  const assets = data.content ?? []

  const handleSelect = (incoming: SelectedAsset[]) => {
    actions.setContent(mergeAssets(assets, incoming, options))
  }

  const handleRemove = (fileId: string) => {
    actions.setContent(assets.filter((asset) => asset.fileId !== fileId))
  }

  const handleMove = (fromIndex: number, toIndex: number) => {
    actions.setContent(moveAsset(assets, fromIndex, toIndex))
  }

  const handleTransform = (fileId: string, transformation: string | undefined) => {
    actions.setContent(
      assets.map((asset) => (asset.fileId === fileId ? withTransformation(asset, transformation) : asset)),
    )
  }

  return (
    <div>
      <div className="container">
        <AssetPreview assets={assets} onRemove={handleRemove} onMove={handleMove} onTransform={handleTransform} />
        <ModalToggle
          isModalOpen={data.isModalOpen}
          setModalOpen={actions.setModalOpen}
          onSelect={handleSelect}
          hasSelection={assets.length > 0}
          options={options}
        />
      </div>
    </div>
  )
}

export default FieldPlugin
