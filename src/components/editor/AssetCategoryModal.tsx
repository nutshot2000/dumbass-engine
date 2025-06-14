'use client'

import React, { useState, useEffect } from 'react'
import { TagIcon, XMarkIcon, UserIcon, PhotoIcon, Square3Stack3DIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline'
import { Asset } from '@/types'

interface AssetCategoryModalProps {
  isOpen: boolean
  asset: Asset | null
  onClose: () => void
  onChangeCategory: (assetId: string, newType: Asset['type']) => void
}

const categories: Array<{ type: Asset['type']; icon: React.ComponentType<any>; label: string; description: string }> = [
  { type: 'character', icon: UserIcon, label: 'Character', description: 'People, avatars, and character sprites' },
  { type: 'background', icon: PhotoIcon, label: 'Background', description: 'Scenes, landscapes, and environments' },
  { type: 'object', icon: Square3Stack3DIcon, label: 'Object', description: 'Props, items, and interactive elements' },
  { type: 'audio', icon: SpeakerWaveIcon, label: 'Audio', description: 'Music, sound effects, and voice clips' }
]

export function AssetCategoryModal({ isOpen, asset, onClose, onChangeCategory }: AssetCategoryModalProps) {
  const [selectedType, setSelectedType] = useState<Asset['type']>('character')

  useEffect(() => {
    if (isOpen && asset) {
      setSelectedType(asset.type)
    }
  }, [isOpen, asset])

  const handleSubmit = () => {
    if (asset && selectedType !== asset.type) {
      onChangeCategory(asset.id, selectedType)
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen || !asset) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onKeyDown={handleKeyDown}>
      <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-600 w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-600">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600 rounded-lg">
              <TagIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Change Category</h3>
              <p className="text-sm text-gray-400">Select the best category for this asset</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Asset Preview */}
          <div className="flex items-center gap-3 mb-6 p-3 bg-gray-700 rounded-lg">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-600">
              <img src={asset.thumbnail} alt={asset.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{asset.name}</p>
              <p className="text-xs text-gray-400">Current: {asset.type} • {asset.metadata.width} × {asset.metadata.height}</p>
            </div>
          </div>

          {/* Category Options */}
          <div className="space-y-3 mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Choose Category
            </label>
            {categories.map((category) => {
              const IconComponent = category.icon
              return (
                <button
                  key={category.type}
                  onClick={() => setSelectedType(category.type)}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    selectedType === category.type
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-600 hover:border-gray-500 hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      selectedType === category.type ? 'bg-blue-600' : 'bg-gray-600'
                    }`}>
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className={`font-medium ${
                        selectedType === category.type ? 'text-blue-400' : 'text-white'
                      }`}>
                        {category.label}
                      </h4>
                      <p className="text-sm text-gray-400">{category.description}</p>
                    </div>
                    {selectedType === category.type && (
                      <div className="ml-auto">
                        <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={selectedType === asset.type}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:text-gray-400 text-white rounded-lg transition-colors"
            >
              Change Category
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 