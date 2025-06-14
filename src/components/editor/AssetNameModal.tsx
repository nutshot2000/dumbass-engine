'use client'

import React, { useState, useEffect } from 'react'

interface AssetNameModalProps {
  isVisible: boolean
  onClose: () => void
  onConfirm: (name: string) => void
  defaultName: string
  title?: string
  description?: string
}

export function AssetNameModal({
  isVisible,
  onClose,
  onConfirm,
  defaultName,
  title = "Create Asset",
  description = "Enter a name for the new asset:"
}: AssetNameModalProps) {
  const [assetName, setAssetName] = useState(defaultName)

  // Update asset name when defaultName changes
  useEffect(() => {
    setAssetName(defaultName)
  }, [defaultName])

  // Reset when modal opens
  useEffect(() => {
    if (isVisible) {
      setAssetName(defaultName)
    }
  }, [isVisible, defaultName])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (assetName.trim()) {
      onConfirm(assetName.trim())
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-600 rounded-lg shadow-2xl p-6 max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ×
          </button>
        </div>

        {/* Description */}
        <p className="text-gray-300 mb-4">{description}</p>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Asset Name
            </label>
            <input
              type="text"
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter asset name..."
              autoFocus
              required
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!assetName.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              Create Asset
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white border border-gray-600 hover:border-gray-500 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 