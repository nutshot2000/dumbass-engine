'use client'

import React, { useCallback, useState, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { 
  FolderIcon, 
  PhotoIcon, 
  SpeakerWaveIcon,
  UserIcon,
  Square3Stack3DIcon,
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TagIcon
} from '@heroicons/react/24/outline'
import { useAssetStore, assetSelectors } from '@/stores/assetStore'
import { Asset } from '@/types'
import { formatFileSize, createObjectURL } from '@/lib/fileUtils'
import { AssetRenameModal } from './AssetRenameModal'
import { AssetCategoryModal } from './AssetCategoryModal'


// Asset Context Menu Component
interface AssetContextMenuProps {
  x: number
  y: number
  isVisible: boolean
  asset: Asset | null
  onClose: () => void
  onRename: (asset: Asset) => void
  onChangeCategory: (asset: Asset) => void
  onDelete: (asset: Asset) => void
}

function AssetContextMenu({ 
  x, y, isVisible, asset, onClose, onRename, onChangeCategory, onDelete 
}: AssetContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  if (!isVisible || !asset) return null

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl py-2 min-w-[180px] backdrop-blur-sm"
      style={{ left: x, top: y }}
    >
      <div className="px-4 py-2 border-b border-gray-600 mb-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-700">
            <img src={asset.thumbnail} alt={asset.name} className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-sm font-medium text-white truncate">{asset.name}</p>
            <p className="text-xs text-gray-400">{asset.type}</p>
          </div>
        </div>
      </div>
      
      <button
        onClick={() => {
          onRename(asset)
          onClose()
        }}
        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-3 text-gray-300 hover:text-white transition-colors"
      >
        <PencilIcon className="w-4 h-4" />
        Rename Asset
      </button>
      
      <button
        onClick={() => {
          onChangeCategory(asset)
          onClose()
        }}
        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-3 text-blue-400 hover:text-blue-300 transition-colors"
      >
        <TagIcon className="w-4 h-4" />
        Change Category
      </button>
      
      <div className="h-px bg-gray-600 my-1" />
      
      <button
        onClick={() => {
          onDelete(asset)
          onClose()
        }}
        className="w-full px-4 py-2 text-left text-sm hover:bg-red-600/20 flex items-center gap-3 text-red-400 hover:text-red-300 transition-colors"
      >
        <TrashIcon className="w-4 h-4" />
        Delete Asset
      </button>
    </div>
  )
}

export function AssetLibrary() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<Asset['type'] | 'all'>('all')
  const [draggedAsset, setDraggedAsset] = useState<Asset | null>(null)
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState({
    isVisible: false,
    x: 0,
    y: 0,
    asset: null as Asset | null
  })

  // Modal states
  const [renameModal, setRenameModal] = useState({
    isOpen: false,
    asset: null as Asset | null
  })
  
  const [categoryModal, setCategoryModal] = useState({
    isOpen: false,
    asset: null as Asset | null
  })

  const { uploadFiles, deleteAsset, updateAsset, regenerateAssetThumbnails } = useAssetStore()
  const assets = assetSelectors.useAssets()
  const isLoading = assetSelectors.useIsLoading()
  const error = assetSelectors.useError()
  const assetCount = assetSelectors.useAssetCount()

  // File upload with React-Dropzone
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    
    try {
      const result = await uploadFiles(acceptedFiles)
      console.log(`✅ Uploaded ${result.uploaded} files, ${result.errors} errors`)
    } catch (error) {
      console.error('Upload failed:', error)
    }
  }, [uploadFiles])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'],
      'audio/*': ['.mp3', '.wav', '.ogg']
    },
    multiple: true
  })

  // Filter assets based on search and type (memoized)
  const filteredAssets = React.useMemo(() => {
    return assets.filter(asset => {
      const matchesSearch = searchQuery === '' || 
        asset.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = selectedType === 'all' || asset.type === selectedType
      return matchesSearch && matchesType
    })
  }, [assets, searchQuery, selectedType])

  // Asset type counts (computed in render to avoid selector instability)
  const typeCounts = React.useMemo(() => ({
    all: assets.length,
    character: assets.filter(a => a.type === 'character').length,
    background: assets.filter(a => a.type === 'background').length,
    object: assets.filter(a => a.type === 'object').length,
    audio: assets.filter(a => a.type === 'audio').length
  }), [assets])

  // Handle asset drag start
  const handleDragStart = (asset: Asset) => {
    setDraggedAsset(asset)
  }

  // Handle asset delete
  const handleDeleteAsset = async (asset: Asset) => {
    if (window.confirm(`Delete "${asset.name}"?`)) {
      try {
        await deleteAsset(asset.id)
      } catch (error) {
        console.error('Failed to delete asset:', error)
      }
    }
  }

  // Context menu handlers
  const handleAssetRightClick = (e: React.MouseEvent, asset: Asset) => {
    e.preventDefault()
    e.stopPropagation()
    
    setContextMenu({
      isVisible: true,
      x: e.clientX,
      y: e.clientY,
      asset: asset
    })
  }

  const closeContextMenu = () => {
    setContextMenu(prev => ({ ...prev, isVisible: false }))
  }

  const handleRenameAsset = (asset: Asset) => {
    setRenameModal({ isOpen: true, asset })
    closeContextMenu()
  }

  const handleChangeCategoryAsset = (asset: Asset) => {
    setCategoryModal({ isOpen: true, asset })
    closeContextMenu()
  }

  const handleRenameSubmit = async (assetId: string, newName: string) => {
    try {
      await updateAsset(assetId, { name: newName })
      console.log(`✅ Renamed asset to "${newName}"`)
    } catch (error) {
      console.error('Failed to rename asset:', error)
    }
  }

  const handleCategorySubmit = async (assetId: string, newType: Asset['type']) => {
    try {
      await updateAsset(assetId, { type: newType })
      console.log(`✅ Changed asset category to "${newType}"`)
    } catch (error) {
      console.error('Failed to change category:', error)
    }
  }

  // Close context menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.isVisible) {
        closeContextMenu()
      }
    }
    
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [contextMenu.isVisible])

  // Get icon for asset type
  const getTypeIcon = (type: Asset['type']) => {
    switch (type) {
      case 'character': return UserIcon
      case 'background': return PhotoIcon
      case 'object': return Square3Stack3DIcon
      case 'audio': return SpeakerWaveIcon
      default: return PhotoIcon
    }
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Modern Header */}
      <div className="p-4 bg-gradient-to-r from-gray-800 to-gray-700 border-b border-gray-600">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <FolderIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Asset Library</h2>
              <p className="text-xs text-gray-400">{assetCount} assets • Ready to use</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                if (window.confirm('Regenerate thumbnails for all assets? This will fix transparency issues but may take a moment.')) {
                  try {
                    await regenerateAssetThumbnails()
                    console.log('✅ Successfully regenerated all thumbnails')
                  } catch (error) {
                    console.error('Failed to regenerate thumbnails:', error)
                  }
                }
              }}
              disabled={isLoading}
              className="px-3 py-2 text-xs bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-all hover:scale-105 disabled:hover:scale-100 shadow-lg"
              title="Fix transparency issues in existing assets"
            >
              ✨ Fix Transparency
            </button>
          </div>
        </div>

        {/* Enhanced Search */}
        <div className="relative mb-4">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search your assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              ×
            </button>
          )}
        </div>

        {/* Modern Type Filter */}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(typeCounts) as Array<keyof typeof typeCounts>).map((type) => {
            const TypeIcon = type === 'all' ? Square3Stack3DIcon : getTypeIcon(type as Asset['type'])
            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-all hover:scale-105 ${
                  selectedType === type
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <TypeIcon className="w-3 h-3" />
                {type} ({typeCounts[type]})
              </button>
            )
          })}
        </div>
      </div>



      {/* Enhanced Upload Area */}
      <div 
        {...getRootProps()}
        className={`m-4 p-8 border-2 border-dashed rounded-xl transition-all cursor-pointer group ${
          isDragActive 
            ? 'border-blue-400 bg-blue-500/20 scale-105' 
            : 'border-gray-600 hover:border-blue-500 hover:bg-blue-500/5'
        }`}
      >
        <input {...getInputProps()} />
        <div className="text-center">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center transition-all ${
            isDragActive ? 'bg-blue-500 scale-110' : 'bg-gray-700 group-hover:bg-blue-600'
          }`}>
            <PlusIcon className="w-8 h-8 text-white" />
          </div>
          <h3 className={`text-lg font-semibold mb-2 transition-colors ${
            isDragActive ? 'text-blue-400' : 'text-white group-hover:text-blue-400'
          }`}>
            {isDragActive ? 'Drop your files here!' : 'Add New Assets'}
          </h3>
          <p className="text-sm text-gray-400 mb-2">
            {isDragActive
              ? 'Release to upload...'
              : 'Drag & drop files or click to browse'
            }
          </p>
          <div className="flex flex-wrap justify-center gap-1 text-xs text-gray-500">
            <span className="px-2 py-1 bg-gray-800 rounded">PNG</span>
            <span className="px-2 py-1 bg-gray-800 rounded">JPG</span>
            <span className="px-2 py-1 bg-gray-800 rounded">GIF</span>
            <span className="px-2 py-1 bg-gray-800 rounded">WebP</span>
            <span className="px-2 py-1 bg-gray-800 rounded">SVG</span>
            <span className="px-2 py-1 bg-gray-800 rounded">MP3</span>
            <span className="px-2 py-1 bg-gray-800 rounded">WAV</span>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="mx-4 p-3 bg-blue-900/50 border border-blue-500 rounded-lg text-sm text-blue-200">
          Processing files...
        </div>
      )}

      {/* Enhanced Asset Grid */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-900">
        {filteredAssets.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-800 rounded-full flex items-center justify-center">
              <PhotoIcon className="w-12 h-12 text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {searchQuery || selectedType !== 'all' 
                ? 'No matching assets found'
                : 'Your asset library is empty'
              }
            </h3>
            <p className="text-gray-400 mb-6">
              {searchQuery || selectedType !== 'all' 
                ? 'Try adjusting your search or filter settings'
                : 'Upload some images, audio files, or other assets to get started!'
              }
            </p>
            {searchQuery || selectedType !== 'all' ? (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSelectedType('all')
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredAssets.map((asset) => {
              const TypeIcon = getTypeIcon(asset.type)
              return (
                <div
                  key={asset.id}
                  className="group relative aspect-square bg-gray-800 rounded-xl overflow-hidden cursor-pointer hover:shadow-xl hover:shadow-blue-500/20 transition-all duration-300 hover:scale-105 border border-gray-700 hover:border-blue-500"
                  onClick={() => console.log('Asset clicked:', asset.name)}
                  onContextMenu={(e) => handleAssetRightClick(e, asset)}
                  draggable
                  onDragStart={(e) => {
                    console.log('🚀 Drag started for asset:', asset.name)
                    e.dataTransfer.setData('application/json', JSON.stringify({
                      type: 'asset',
                      assetId: asset.id,
                      assetName: asset.name
                    }))
                    e.dataTransfer.effectAllowed = 'copy'
                    console.log('📝 Set drag data:', { type: 'asset', assetId: asset.id, assetName: asset.name })
                  }}
                  onDragEnd={(e) => {
                    console.log('🏁 Drag ended for asset:', asset.name)
                  }}
                >
                  {/* Asset Type Badge */}
                  <div className="absolute top-2 left-2 z-10 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1">
                    <TypeIcon className="w-3 h-3 text-white" />
                    <span className="text-xs text-white font-medium">{asset.type}</span>
                  </div>

                  <img
                    src={asset.thumbnail}
                    alt={asset.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    draggable={false}
                  />
                  
                  {/* Enhanced Info Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3">
                    <h4 className="text-sm font-semibold text-white truncate mb-1">{asset.name}</h4>
                    <div className="flex items-center justify-between text-xs text-gray-300">
                      <span>{asset.metadata.width} × {asset.metadata.height}</span>
                      <span className="text-blue-400">
                        {formatFileSize(asset.metadata.fileSize || 0)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="bg-red-500 hover:bg-red-600 text-white rounded-lg p-1.5 transition-colors shadow-lg"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteAsset(asset)
                      }}
                      title="Delete asset"
                    >
                      <TrashIcon className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Drag Indicator */}
                  <div className="absolute inset-0 bg-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-center">
                    <div className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-semibold">
                      Drag to Canvas
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Asset Context Menu */}
      <AssetContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        isVisible={contextMenu.isVisible}
        asset={contextMenu.asset}
        onClose={closeContextMenu}
        onRename={handleRenameAsset}
        onChangeCategory={handleChangeCategoryAsset}
        onDelete={handleDeleteAsset}
      />

      {/* Rename Modal */}
      <AssetRenameModal
        isOpen={renameModal.isOpen}
        asset={renameModal.asset}
        onClose={() => setRenameModal({ isOpen: false, asset: null })}
        onRename={handleRenameSubmit}
      />

      {/* Category Modal */}
      <AssetCategoryModal
        isOpen={categoryModal.isOpen}
        asset={categoryModal.asset}
        onClose={() => setCategoryModal({ isOpen: false, asset: null })}
        onChangeCategory={handleCategorySubmit}
      />
    </div>
  )
} 