'use client'

import React, { useRef, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { sceneSelectors, useSceneStore } from '@/stores/sceneStore'
import { uiSelectors } from '@/stores/uiStore'
import { useAssetStore } from '@/stores/assetStore'
import { ContextMenu } from './ContextMenu'

// Dynamically import KonvaCanvas to prevent SSR issues
const KonvaCanvas = dynamic(() => import('./KonvaCanvas').then(mod => ({ default: mod.KonvaCanvas })), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-gray-400">
      <div className="text-center">
        <div className="text-4xl mb-2">🎨</div>
        <p>Loading canvas...</p>
      </div>
    </div>
  )
})

export function SceneCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const konvaCanvasRef = useRef<any>(null) // Will be typed properly when KonvaCanvas loads
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 })
  const currentScene = sceneSelectors.useCurrentScene()
  const sceneObjects = sceneSelectors.useSceneObjects()
  const zoom = uiSelectors.useZoom()
  const canvasSize = uiSelectors.useCanvasSize() // Get viewport size from store
  const isLiveViewport = uiSelectors.useIsLiveViewport()
  const zoomPercentage = Math.round(zoom * 100)
  
  // Context menu state (moved from KonvaCanvas to avoid scaling issues)
  const [contextMenu, setContextMenu] = useState({
    isVisible: false,
    x: 0,
    y: 0,
    selectedObjectCount: 0
  })
  
  // Debug log to check selector stability (disabled for performance)
  // useEffect(() => {
  //   console.log('SceneCanvas render - objects count:', sceneObjects.length)
  //   console.log('Canvas size:', canvasSize)
  // }, [sceneObjects, canvasSize])

  // Add this after the existing state declarations around line 40
  const [isLiveMode, setIsLiveMode] = useState(false)

  // Update container dimensions when it resizes (for centering the viewport)
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect()
        setContainerSize({ width, height })
      }
    }

    // Initial measurement
    updateDimensions()

    // Listen for resize
    const resizeObserver = new ResizeObserver(updateDimensions)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  // Calculate scaling to fit viewport in container while maintaining aspect ratio
  const baseScale = Math.min(
    (containerSize.width - 40) / canvasSize.width,  // 40px padding
    (containerSize.height - 40) / canvasSize.height,
    1 // Don't scale up beyond 100%
  )

  // Apply user zoom on top of base scale
  const finalScale = baseScale * zoom
  const scaledWidth = canvasSize.width * finalScale
  const scaledHeight = canvasSize.height * finalScale

  // Context menu handlers
  const { 
    deleteSceneObject, 
    bringToFront, 
    sendToBack, 
    duplicateSceneObject, 
    clearScene,
    createGroup,
    ungroupObjects,
    getObjectGroup,
    clearSelection,
    toggleObjectLock,
    snapObjectToPosition
  } = useSceneStore()
  const { getAssetById, addAsset } = useAssetStore()
  const selectedObjects = sceneSelectors.useSelectedObjects()

  const handleContextMenu = (e: React.MouseEvent, objectCount: number) => {
    e.preventDefault()
    
    // Get the viewport container position
    const viewportRect = containerRef.current?.querySelector('.bg-white')?.getBoundingClientRect()
    if (!viewportRect) return
    
    setContextMenu({
      isVisible: true,
      x: e.clientX,
      y: e.clientY,
      selectedObjectCount: objectCount
    })
  }

  const closeContextMenu = () => {
    setContextMenu(prev => ({ ...prev, isVisible: false }))
  }

  const handleContextDelete = () => {
    selectedObjects.forEach(objectId => {
      deleteSceneObject(objectId)
    })
    closeContextMenu()
  }

  const handleContextBringToFront = () => {
    selectedObjects.forEach(objectId => {
      bringToFront(objectId)
    })
    closeContextMenu()
  }

  const handleContextSendToBack = () => {
    selectedObjects.forEach(objectId => {
      sendToBack(objectId)
    })
    closeContextMenu()
  }

  const handleContextDuplicate = () => {
    selectedObjects.forEach(objectId => {
      duplicateSceneObject(objectId)
    })
    closeContextMenu()
  }

  const handleClearScene = () => {
    if (window.confirm('Clear all objects from the scene?')) {
      clearScene()
    }
    closeContextMenu()
  }

  const handleToggleLock = () => {
    selectedObjects.forEach(objectId => {
      toggleObjectLock(objectId)
    })
    closeContextMenu()
  }

  const handleSnapInPlace = () => {
    selectedObjects.forEach(objectId => {
      snapObjectToPosition(objectId)
    })
    closeContextMenu()
  }

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.isVisible) {
        closeContextMenu()
      }
    }
    
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [contextMenu.isVisible])

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden bg-gray-900 flex items-center justify-center">
      {/* Mode Toggle Button */}
      <div className="absolute top-2 right-2 z-10">
        <button
          onClick={() => setIsLiveMode(!isLiveMode)}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            isLiveMode 
              ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {isLiveMode ? '🎮 LIVE MODE' : '✏️ EDIT MODE'}
        </button>
      </div>

      {/* Viewport Frame */}
      <div 
        className={`${isLiveMode ? 'bg-gray-900' : 'bg-white'} border-2 ${isLiveMode ? 'border-red-500 shadow-red-500/50' : 'border-gray-600'} shadow-2xl relative transition-all duration-300`}
        style={{ 
          width: scaledWidth, 
          height: scaledHeight,
          overflow: 'hidden'
        }}
      >
        {/* Viewport Size Label */}
        <div className="absolute -top-6 left-0 text-xs text-gray-400">
          {canvasSize.width} × {canvasSize.height}px {isLiveMode ? '(Live Game Mode - Click & Drag Objects!)' : '(Edit Mode)'} • Scale: {Math.round(finalScale * 100)}% (Base: {Math.round(baseScale * 100)}% × Zoom: {zoomPercentage}%)
        </div>
        
        {/* Single KonvaCanvas with Mode Toggle */}
        <div style={{ transform: `scale(${finalScale})`, transformOrigin: 'top left', width: canvasSize.width, height: canvasSize.height }}>
          <KonvaCanvas 
            ref={konvaCanvasRef}
            width={canvasSize.width} 
            height={canvasSize.height}
            isLiveMode={isLiveMode}
            onContextMenu={handleContextMenu}
          />
        </div>
      </div>

      {/* Context Menu (outside scaled area) */}
      <ContextMenu
        isVisible={contextMenu.isVisible}
        x={contextMenu.x}
        y={contextMenu.y}
        selectedObjectCount={contextMenu.selectedObjectCount}
        selectedObjectIds={selectedObjects}
        onClose={closeContextMenu}
        onDelete={handleContextDelete}
        onBringToFront={handleContextBringToFront}
        onSendToBack={handleContextSendToBack}
        onDuplicate={handleContextDuplicate}
        onClearScene={handleClearScene}
        onToggleLock={handleToggleLock}
        onSnapInPlace={handleSnapInPlace}
        onGroup={(objectIds) => createGroup(objectIds)}
        onUngroup={(objectId) => {
          const group = getObjectGroup(objectId)
          if (group) ungroupObjects(group.id)
        }}
        getObjectGroup={getObjectGroup}
        onSaveAsAsset={async (objectIds) => {
          await konvaCanvasRef.current?.handleSaveAsAsset?.(objectIds)
        }}
        getOverlappingObjects={(objectId) => {
          return konvaCanvasRef.current?.getOverlappingObjects?.(objectId) || []
        }}
        onAttachObjects={async (topId, bottomId) => {
          await konvaCanvasRef.current?.handleAttachObjects?.(topId, bottomId)
        }}
        onDetachObject={async (objectId) => {
          await konvaCanvasRef.current?.detachObject?.(objectId)
        }}
        getAssetById={getAssetById}
        sceneObjects={sceneObjects}
      />
    </div>
  )
} 