'use client'

import React, { useEffect, useRef } from 'react'
import {
  TrashIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  LockOpenIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline'

interface ContextMenuProps {
  x: number
  y: number
  isVisible: boolean
  onClose: () => void
  selectedObjectCount: number
  selectedObjectIds: string[]
  onDelete: () => void
  onDuplicate?: () => void
  onBringToFront?: () => void
  onSendToBack?: () => void
  onToggleVisibility?: () => void
  onToggleLock?: () => void
  onSnapInPlace?: () => void
  onGroup?: (objectIds: string[]) => void
  onUngroup?: (objectId: string) => void
  getObjectGroup?: (objectId: string) => any
  onSaveAsAsset?: (objectIds: string[]) => void
  onClearScene?: () => void
  getOverlappingObjects?: (objectId: string) => any[]
  onAttachObjects?: (topObjectId: string, bottomObjectId: string) => void
  onDetachObject?: (objectId: string) => void
  getAssetById?: (assetId: string) => any
  sceneObjects?: any[]
}

export function ContextMenu({
  x,
  y,
  isVisible,
  onClose,
  selectedObjectCount,
  selectedObjectIds,
  onDelete,
  onDuplicate,
  onBringToFront,
  onSendToBack,
  onToggleVisibility,
  onToggleLock,
  onSnapInPlace,
  onGroup,
  onUngroup,
  getObjectGroup,
  onSaveAsAsset,
  onClearScene,
  getOverlappingObjects,
  onAttachObjects,
  onDetachObject,
  getAssetById,
  sceneObjects
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isVisible, onClose])

  if (!isVisible) return null

  // Adjust position to keep menu on screen
  const adjustedX = Math.min(x, window.innerWidth - 200)
  const adjustedY = Math.min(y, window.innerHeight - 300)

  const hasSelection = selectedObjectCount > 0

  // Check if we can group (multiple objects selected)
  const canGroup = selectedObjectIds.length > 1 && onGroup

  // Check if we can ungroup (single grouped object selected)
  const canUngroup = selectedObjectIds.length === 1 && getObjectGroup?.(selectedObjectIds[0]) && onUngroup

  // Check if we can save as asset (grouped objects selected)
  const canSaveAsAsset = selectedObjectIds.length > 1 && onSaveAsAsset
  const isGroupedSelection = selectedObjectIds.length >= 1 && selectedObjectIds.some(id => getObjectGroup?.(id)) && onSaveAsAsset

  // Check for overlapping objects (only for single object selection)
  const overlappingObjects = selectedObjectIds.length === 1 && getOverlappingObjects ? 
    getOverlappingObjects(selectedObjectIds[0]) : []
  const hasOverlappingObjects = overlappingObjects.length > 0
  
  // Debug logging for overlap detection
  if (selectedObjectIds.length === 1) {
    console.log(`🖱️ ContextMenu: Checking overlaps for ${selectedObjectIds[0].slice(-4)}`)
    console.log(`🔍 Found ${overlappingObjects.length} overlapping objects:`, 
      overlappingObjects.map(obj => obj.id.slice(-4)))
    console.log(`📋 Will show attachment options: ${hasOverlappingObjects}`)
  }

  // Check if selected object is attached to something
  const selectedObject = selectedObjectIds.length === 1 ? 
    sceneObjects?.find(obj => obj.id === selectedObjectIds[0]) : null
  const isAttached = selectedObject?.attachedToId
  
  // Check if any selected objects are locked
  const hasLockedObjects = selectedObjectIds.some(id => 
    sceneObjects?.find(obj => obj.id === id)?.locked
  )
  const allObjectsLocked = selectedObjectIds.length > 0 && selectedObjectIds.every(id => 
    sceneObjects?.find(obj => obj.id === id)?.locked
  )

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-2 min-w-[180px]"
      style={{
        left: adjustedX,
        top: adjustedY
      }}
    >
      {/* Menu Header */}
      <div className="px-3 py-1 border-b border-gray-600 mb-1">
        <span className="text-xs text-gray-400">
          {hasSelection 
            ? `${selectedObjectCount} object${selectedObjectCount > 1 ? 's' : ''} selected`
            : 'Canvas'
          }
        </span>
      </div>

      {/* Object Actions (only when objects are selected) */}
      {hasSelection && (
        <>
          <button
            onClick={() => {
              onDelete()
              onClose()
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2 text-red-400 hover:text-red-300"
          >
            <TrashIcon className="w-4 h-4" />
            Delete {selectedObjectCount > 1 ? 'Objects' : 'Object'}
            <span className="ml-auto text-xs text-gray-500">Del</span>
          </button>

          {/* Duplicate */}
          <button
            onClick={() => {
              onDuplicate?.()
              onClose()
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2 text-gray-300"
            disabled={!onDuplicate}
          >
            <DocumentDuplicateIcon className="w-4 h-4" />
            Duplicate
            <span className="ml-auto text-xs text-gray-500">Ctrl+D</span>
          </button>

          {/* Snap in Place */}
          <button
            onClick={() => {
              onSnapInPlace?.()
              onClose()
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2 text-amber-400 hover:text-amber-300"
            disabled={!onSnapInPlace}
          >
            📍 Snap in Place & Lock
            <span className="ml-auto text-xs text-gray-500">Prevents dragging</span>
          </button>

          <div className="h-px bg-gray-600 my-1" />

          {/* Attachment Options (only for single object with overlaps) */}
          {hasOverlappingObjects && selectedObjectIds.length === 1 && onAttachObjects && (
            <>
              <div className="px-3 py-1 text-xs text-purple-400 font-medium bg-purple-900/20 border-l-2 border-purple-400">
                🔗 Connect Overlapping Objects ({overlappingObjects.length} found)
              </div>
              {overlappingObjects.slice(0, 3).map((overlappingObj: any) => {
                // Get asset name for display
                const asset = getAssetById?.(overlappingObj.assetId)
                const displayName = asset?.name || `Object ${overlappingObj.id.slice(-4)}`
                
                return (
                  <button
                    key={overlappingObj.id}
                    onClick={() => {
                      console.log(`🔗 Attempting to attach ${selectedObjectIds[0].slice(-4)} to ${overlappingObj.id.slice(-4)}`)
                      onAttachObjects(selectedObjectIds[0], overlappingObj.id)
                      onClose()
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-purple-700/50 flex items-center gap-2 text-purple-300 hover:text-purple-200 bg-purple-900/10 border-l-2 border-purple-400/50"
                  >
                    🧲 Connect to "{displayName}"
                    <span className="ml-auto text-xs text-gray-400">
                      {overlappingObj.zIndex > (sceneObjects?.find(o => o.id === selectedObjectIds[0])?.zIndex || 0) ? '⬆️ Above' : '⬇️ Below'}
                    </span>
                  </button>
                )
              })}
              {overlappingObjects.length > 3 && (
                <div className="px-3 py-1 text-xs text-gray-500">
                  +{overlappingObjects.length - 3} more overlapping
                </div>
              )}
              
              {/* Quick Save All Overlapping as Asset */}
              <button
                onClick={() => {
                  const allIds = [selectedObjectIds[0], ...overlappingObjects.map(obj => obj.id)]
                  console.log(`💾 Creating combined asset from ${allIds.length} overlapping objects`)
                  onSaveAsAsset?.(allIds)
                  onClose()
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-green-700/50 flex items-center gap-2 text-green-300 hover:text-green-200 bg-green-900/10 border-l-2 border-green-400/50"
              >
                💾 Save All {overlappingObjects.length + 1} Objects as New Asset
                <span className="ml-auto text-xs text-gray-400">Create Template</span>
              </button>
              
              <div className="h-px bg-gray-600 my-1" />
            </>
          )}

          {/* Detachment Option (only for attached objects) */}
          {isAttached && onDetachObject && (
            <>
              <button
                onClick={() => {
                  onDetachObject(selectedObjectIds[0])
                  onClose()
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2 text-orange-400 hover:text-orange-300"
              >
                🔓 Detach from Parent
              </button>
              <div className="h-px bg-gray-600 my-1" />
            </>
          )}

          {/* Save Attached Assembly as Asset */}
          {selectedObjectIds.length === 1 && selectedObject?.attachedObjects?.length && onSaveAsAsset && (
            <>
              <button
                onClick={() => {
                  // Include the parent and all attached children
                  const allAttachedIds = [selectedObjectIds[0], ...(selectedObject.attachedObjects || [])]
                  onSaveAsAsset(allAttachedIds)
                  onClose()
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2 text-green-400 hover:text-green-300"
              >
                💾 Save Attached Assembly as Asset
                <span className="ml-auto text-xs text-gray-500">
                  {1 + (selectedObject.attachedObjects?.length || 0)} objects
                </span>
              </button>
              <div className="h-px bg-gray-600 my-1" />
            </>
          )}

          {/* Save as Asset Option */}
          {(canSaveAsAsset || isGroupedSelection) && (
            <>
              <button
                onClick={() => {
                  onSaveAsAsset?.(selectedObjectIds)
                  onClose()
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2 text-green-400 hover:text-green-300"
              >
                💾 Save as Asset
                <span className="ml-auto text-xs text-gray-500">Create Template</span>
              </button>
              <div className="h-px bg-gray-600 my-1" />
            </>
          )}

          {/* Grouping Options */}
          {canGroup && (
            <button
              onClick={() => {
                onGroup?.(selectedObjectIds)
                onClose()
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2 text-blue-400 hover:text-blue-300"
            >
              🔗 Group Objects
              <span className="ml-auto text-xs text-gray-500">Ctrl+G</span>
            </button>
          )}

          {canUngroup && (
            <button
              onClick={() => {
                onUngroup?.(selectedObjectIds[0])
                onClose()
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2 text-blue-400 hover:text-blue-300"
            >
              🔓 Ungroup Objects
              <span className="ml-auto text-xs text-gray-500">Ctrl+Shift+G</span>
            </button>
          )}

          {(canGroup || canUngroup) && <div className="h-px bg-gray-600 my-1" />}

          {/* Layer Controls */}
          <button
            onClick={() => {
              onBringToFront?.()
              onClose()
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2 text-gray-300"
            disabled={!onBringToFront}
          >
            ⬆️ Bring to Front
          </button>

          <button
            onClick={() => {
              onSendToBack?.()
              onClose()
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2 text-gray-300"
            disabled={!onSendToBack}
          >
            ⬇️ Send to Back
          </button>

          <div className="h-px bg-gray-600 my-1" />

          {/* Visibility & Lock (placeholders for future) */}
          <button
            onClick={() => {
              onToggleVisibility?.()
              onClose()
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2 text-gray-300"
            disabled={!onToggleVisibility}
          >
            <EyeSlashIcon className="w-4 h-4" />
            Hide Object{selectedObjectCount > 1 ? 's' : ''}
          </button>

          <button
            onClick={() => {
              onToggleLock?.()
              onClose()
            }}
            className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2 ${
              hasLockedObjects ? 'text-amber-400 hover:text-amber-300' : 'text-gray-300'
            }`}
            disabled={!onToggleLock}
          >
            {allObjectsLocked ? (
              <LockOpenIcon className="w-4 h-4" />
            ) : (
              <LockClosedIcon className="w-4 h-4" />
            )}
            {allObjectsLocked 
              ? `Unlock Object${selectedObjectCount > 1 ? 's' : ''}` 
              : `Lock Object${selectedObjectCount > 1 ? 's' : ''}`
            }
            {hasLockedObjects && !allObjectsLocked && (
              <span className="ml-auto text-xs text-amber-400">Mixed</span>
            )}
          </button>
        </>
      )}

      {/* Canvas Actions (when no objects selected) */}
      {!hasSelection && (
        <>
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2 text-gray-400"
            disabled
          >
            No objects selected
          </button>
          
          <div className="h-px bg-gray-600 my-1" />
          
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2 text-gray-300"
            onClick={onClose}
          >
            Paste Here
            <span className="ml-auto text-xs text-gray-500">Ctrl+V</span>
          </button>
        </>
      )}

      {/* Background Actions (only when no objects are selected) */}
      {!hasSelection && onClearScene && (
        <>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to clear all objects from the scene? This cannot be undone.')) {
                onClearScene()
                onClose()
              }
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2 text-red-400 hover:text-red-300"
          >
            🗑️ Clear Scene
            <span className="ml-auto text-xs text-gray-500">Remove All</span>
          </button>
        </>
      )}

      {/* Disabled items show as grayed out */}
      <style jsx>{`
        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        button:disabled:hover {
          background-color: transparent !important;
        }
      `}</style>
    </div>
  )
} 