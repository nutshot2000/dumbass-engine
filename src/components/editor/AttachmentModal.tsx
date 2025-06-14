'use client'

import React from 'react'
import { SceneObject, Asset } from '@/types'

interface AttachmentModalProps {
  isVisible: boolean
  onClose: () => void
  topObject: SceneObject | null
  bottomObject: SceneObject | null
  topAsset: Asset | null
  bottomAsset: Asset | null
  onAttach: () => void
  onCreateAsset: () => void
}

export function AttachmentModal({
  isVisible,
  onClose,
  topObject,
  bottomObject,
  topAsset,
  bottomAsset,
  onAttach,
  onCreateAsset
}: AttachmentModalProps) {
  if (!isVisible || !topObject || !bottomObject) return null

  const topName = topAsset?.name || `Object ${topObject.id.slice(-4)}`
  const bottomName = bottomAsset?.name || `Object ${bottomObject.id.slice(-4)}`

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-600 rounded-lg shadow-2xl p-6 max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Connect Objects</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ×
          </button>
        </div>

        {/* Object Preview */}
        <div className="mb-6">
          <div className="text-sm text-gray-400 mb-2">Connecting:</div>
          <div className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg">
            <div className="flex-1">
              <div className="text-purple-300 font-medium">"{topName}"</div>
              <div className="text-xs text-gray-400">Selected object</div>
            </div>
            <div className="text-gray-400">→</div>
            <div className="flex-1">
              <div className="text-blue-300 font-medium">"{bottomName}"</div>
              <div className="text-xs text-gray-400">Target object</div>
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-3 mb-6">
          <button
            onClick={() => {
              onAttach()
              onClose()
            }}
            className="w-full p-4 text-left bg-purple-900/30 hover:bg-purple-900/50 border border-purple-500/50 rounded-lg transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">🔗</div>
              <div className="flex-1">
                <div className="text-purple-300 font-medium group-hover:text-purple-200">
                  Attach Objects
                </div>
                <div className="text-sm text-gray-400">
                  Objects will move together as one unit
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => {
              onCreateAsset()
              onClose()
            }}
            className="w-full p-4 text-left bg-green-900/30 hover:bg-green-900/50 border border-green-500/50 rounded-lg transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">💾</div>
              <div className="flex-1">
                <div className="text-green-300 font-medium group-hover:text-green-200">
                  Create Combined Asset
                </div>
                <div className="text-sm text-gray-400">
                  Save as reusable template for future use
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Cancel */}
        <button
          onClick={onClose}
          className="w-full p-2 text-gray-400 hover:text-white border border-gray-600 hover:border-gray-500 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
} 