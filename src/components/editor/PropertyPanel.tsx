'use client'

import React from 'react'
import { 
  Cog6ToothIcon,
  CubeIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline'
import { sceneSelectors } from '@/stores/sceneStore'
import { uiSelectors } from '@/stores/uiStore'

export function PropertyPanel() {
  const selectedObjects = sceneSelectors.useSelectedObjects()
  const sceneObjects = sceneSelectors.useSceneObjects()
  const currentScene = sceneSelectors.useCurrentScene()

  // Get selected object details
  const selectedObject = selectedObjects.length === 1 
    ? sceneObjects.find(obj => obj.id === selectedObjects[0])
    : null

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Cog6ToothIcon className="w-5 h-5" />
          Properties
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {selectedObject ? (
          /* Single Object Selected */
          <div className="space-y-6">
            {/* Object Info */}
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                <CubeIcon className="w-4 h-4" />
                Object Properties
              </h3>
              
              <div className="space-y-3">
                {/* Object Name */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Name</label>
                  <input
                    type="text"
                    value={`Object ${selectedObject.id.slice(-4)}`}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    readOnly
                  />
                </div>

                {/* Position */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">X</label>
                    <input
                      type="number"
                      value={selectedObject.x || 0}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Y</label>
                    <input
                      type="number"
                      value={selectedObject.y || 0}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      readOnly
                    />
                  </div>
                </div>

                {/* Size */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Width</label>
                    <input
                      type="number"
                      value={selectedObject.width || 0}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Height</label>
                    <input
                      type="number"
                      value={selectedObject.height || 0}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      readOnly
                    />
                  </div>
                </div>

                {/* Rotation */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Rotation (degrees)</label>
                  <input
                    type="number"
                    value={selectedObject.rotation || 0}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    readOnly
                  />
                </div>

                {/* Z-Index */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Layer (Z-Index)</label>
                  <input
                    type="number"
                    value={selectedObject.zIndex || 0}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    readOnly
                  />
                </div>
              </div>
            </div>

            {/* Interactions */}
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-3">Interactions</h3>
              <div className="text-xs text-gray-500 p-3 bg-gray-800 rounded">
                Interactive behaviors will be implemented in Phase 3
              </div>
            </div>
          </div>
        ) : selectedObjects.length > 1 ? (
          /* Multiple Objects Selected */
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-3">Multiple Objects Selected</h3>
              <p className="text-sm text-gray-400 mb-4">
                {selectedObjects.length} objects selected
              </p>
              
              <div className="text-xs text-gray-500 p-3 bg-gray-800 rounded">
                Multi-object editing will be implemented in Phase 3
              </div>
            </div>
          </div>
        ) : (
          /* No Selection */
          <div className="space-y-6">
            {/* Scene Info */}
            {currentScene && (
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3">Scene Properties</h3>
                
                <div className="space-y-3">
                  {/* Scene Name */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Scene Name</label>
                    <input
                      type="text"
                      value={currentScene.name}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      readOnly
                    />
                  </div>

                  {/* Scene Size */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Width</label>
                      <input
                        type="number"
                        value={currentScene.width || 1920}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Height</label>
                      <input
                        type="number"
                        value={currentScene.height || 1080}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        readOnly
                      />
                    </div>
                  </div>

                  {/* Object Count */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Objects</label>
                    <div className="text-sm text-gray-300 p-2 bg-gray-800 rounded">
                      {sceneObjects.length} objects in scene
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="text-center text-gray-400 py-8">
              <div className="text-2xl mb-2">👆</div>
              <p className="text-sm">
                Select an object in the scene to edit its properties
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700">
        <div className="text-xs text-gray-500 text-center">
          Phase 1: Basic Properties
        </div>
      </div>
    </div>
  )
} 