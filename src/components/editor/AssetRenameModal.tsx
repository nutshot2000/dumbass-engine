'use client'

import React, { useState, useEffect, useRef } from 'react'
import { PencilIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { Asset } from '@/types'

interface AssetRenameModalProps {
  isOpen: boolean
  asset: Asset | null
  onClose: () => void
  onRename: (assetId: string, newName: string) => void
}

export function AssetRenameModal({ isOpen, asset, onClose, onRename }: AssetRenameModalProps) {
  const [newName, setNewName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && asset) {
      setNewName(asset.name)
      // Focus input after modal opens
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 100)
    }
  }, [isOpen, asset])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (asset && newName.trim() && newName.trim() !== asset.name) {
      onRename(asset.id, newName.trim())
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-600 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-600">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <PencilIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Rename Asset</h3>
              <p className="text-sm text-gray-400">Change the name of your asset</p>
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
        <form onSubmit={handleSubmit} className="p-6">
          {/* Asset Preview */}
          <div className="flex items-center gap-3 mb-4 p-3 bg-gray-700 rounded-lg">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-600">
              <img src={asset.thumbnail} alt={asset.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{asset.name}</p>
              <p className="text-xs text-gray-400">{asset.type} • {asset.metadata.width} × {asset.metadata.height}</p>
            </div>
          </div>

          {/* Name Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              New Name
            </label>
            <input
              ref={inputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter new asset name..."
              required
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newName.trim() || newName.trim() === asset.name}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:text-gray-400 text-white rounded-lg transition-colors"
            >
              Rename
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 