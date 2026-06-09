import './example.css'
import { FunctionComponent, useState, useCallback, useMemo } from 'react'
import { useFieldPlugin } from '@storyblok/field-plugin/react'
import type { StoryblokAsset, EditableFields } from './types'
import AssetItem from './AssetItem'
import EditPanel from './EditPanel'
import ModalToggle from './ModalToggle'

// Storyblok reloads the plugin iframe when entering the portal modal, which wipes React state.
// Persist the replace target in sessionStorage so it survives the reload.
const REPLACE_INDEX_KEY = 'imagekit-storyblok-plugin:replaceIndex'

const readReplaceIndex = (): number | null => {
  try {
    const v = sessionStorage.getItem(REPLACE_INDEX_KEY)
    if (v === null) return null
    const n = Number(v)
    return Number.isInteger(n) && n >= 0 ? n : null
  } catch {
    return null
  }
}

const writeReplaceIndex = (index: number | null) => {
  try {
    if (index === null) sessionStorage.removeItem(REPLACE_INDEX_KEY)
    else sessionStorage.setItem(REPLACE_INDEX_KEY, String(index))
  } catch {
    // sessionStorage unavailable — replace will fall back to add behaviour
  }
}

export const isValidAsset = (item: unknown): item is StoryblokAsset => {
  if (typeof item !== 'object' || item === null) return false
  const a = item as Record<string, unknown>
  // Reject Storyblok's default empty-asset shell (keys present but null/empty)
  return (
    typeof a.filename === 'string' &&
    a.filename.length > 0 &&
    a.id !== undefined &&
    a.id !== null &&
    a.id !== ''
  )
}

const FieldPlugin: FunctionComponent = () => {
  const { type, data, actions } = useFieldPlugin<StoryblokAsset | StoryblokAsset[] | null>({
    enablePortalModal: true,
    validateContent: (content: unknown) => ({
      content: (() => {
        if (Array.isArray(content)) return content.filter(isValidAsset)
        if (isValidAsset(content)) return content
        return null
      })(),
    }),
  })

  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [replaceIndex, setReplaceIndexState] = useState<number | null>(readReplaceIndex)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const setReplaceIndex = useCallback((index: number | null) => {
    writeReplaceIndex(index)
    setReplaceIndexState(index)
  }, [])

  const assets = useMemo<StoryblokAsset[]>(() => {
    if (type !== 'loaded') return []
    if (Array.isArray(data?.content)) return data.content
    if (isValidAsset(data?.content)) return [data.content]
    return []
  }, [type, data])

  const saveAssets = useCallback(
    (multiple: boolean, updated: StoryblokAsset[]) => {
      actions?.setContent(multiple ? updated : (updated[0] ?? null))
    },
    [actions],
  )

  const handleSelect = useCallback(
    (multiple: boolean, newAssets: StoryblokAsset[]) => {
      if (replaceIndex !== null) {
        if (!newAssets[0]) {
          setReplaceIndex(null)
          return
        }
        const prev = assets[replaceIndex]
        const merged: StoryblokAsset = {
          ...newAssets[0],
          alt: prev?.alt ?? '',
          title: prev?.title ?? '',
          copyright: prev?.copyright ?? '',
          source: prev?.source ?? '',
          focus: prev?.focus ?? '',
        }
        if (multiple) {
          const next = [...assets]
          next[replaceIndex] = merged
          actions?.setContent(next)
        } else {
          actions?.setContent(merged)
        }
        setReplaceIndex(null)
      } else {
        const existingIds = new Set(assets.map((a) => a.id))
        const toAdd = newAssets.filter((a) => !existingIds.has(a.id))
        saveAssets(multiple, [...assets, ...toAdd])
      }
    },
    [assets, replaceIndex, saveAssets, actions, setReplaceIndex],
  )

  if (type !== 'loaded') return null

  const multiple = data.options['multiple'] !== 'false'
  const maxFiles = data.options['maxFiles'] ? parseInt(data.options['maxFiles'], 10) : undefined
  const imagekitId = data.options['imagekitId'] ?? ''
  const isReplaceMode = replaceIndex !== null
  const isFull = !multiple && assets.length >= 1

  const handleDelete = (index: number) => {
    const updated = assets.filter((_, i) => i !== index)
    saveAssets(multiple, updated)
  }

  const handleReplace = (index: number) => {
    setReplaceIndex(index)
    actions.setModalOpen(true)
  }

  const handleOpenAdd = () => {
    setReplaceIndex(null)
    actions.setModalOpen(true)
  }

  const handleSaveEdit = (index: number, fields: EditableFields) => {
    const updated = [...assets]
    updated[index] = { ...updated[index], ...fields }
    saveAssets(multiple, updated)
    setEditingIndex(null)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDrop = (index: number) => {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null)
      setDragOverIndex(null)
      return
    }
    const updated = [...assets]
    const [moved] = updated.splice(dragIndex, 1)
    updated.splice(index, 0, moved)
    saveAssets(multiple, updated)
    setDragIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDragIndex(null)
    setDragOverIndex(null)
  }

  if (editingIndex !== null && assets[editingIndex]) {
    return (
      <EditPanel
        asset={assets[editingIndex]}
        onSave={(fields) => handleSaveEdit(editingIndex, fields)}
        onCancel={() => setEditingIndex(null)}
      />
    )
  }

  return (
    <div className="container">
      <ModalToggle
        key={isReplaceMode ? 'replace' : 'add'}
        isModalOpen={data.isModalOpen}
        setModalOpen={actions.setModalOpen}
        onSelect={(newAssets) => handleSelect(multiple, newAssets)}
        imagekitId={imagekitId}
        multiple={!isReplaceMode && multiple}
        maxFiles={isReplaceMode ? 1 : maxFiles}
      />
      {assets.length > 0 ? (
        <>
          <div className="assets-list">
            {assets.map((asset, index) => (
              <AssetItem
                key={asset.id}
                asset={asset}
                onReplace={() => handleReplace(index)}
                onEdit={() => setEditingIndex(index)}
                onDelete={() => handleDelete(index)}
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={() => handleDrop(index)}
                onDragEnd={handleDragEnd}
                isDragging={dragIndex === index}
                isDragOver={dragOverIndex === index}
              />
            ))}
          </div>
          {!isFull && (
            <button type="button" className="add-btn" onClick={handleOpenAdd}>
              + Add Assets
            </button>
          )}
        </>
      ) : (
        <button type="button" className="open-modal-btn" onClick={handleOpenAdd}>
          {multiple ? 'Select assets' : 'Select asset'}
        </button>
      )}
    </div>
  )
}

export default FieldPlugin
