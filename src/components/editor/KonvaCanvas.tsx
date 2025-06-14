'use client'

import React, { useRef, useEffect, useState } from 'react'
import { Stage, Layer, Image as KonvaImage, Transformer, Rect, Line, Circle } from 'react-konva'
import { KonvaEventObject } from 'konva/lib/Node'
import Konva from 'konva'
import { sceneSelectors, useSceneStore } from '@/stores/sceneStore'
import { uiSelectors, useUIStore, getToolCursor } from '@/stores/uiStore'
import { useAssetStore } from '@/stores/assetStore'
import { SceneObject, Asset } from '@/types'
import { createObjectURL, createCanvasOptimizedImage, generateHighQualityDataURLForAsset } from '@/lib/fileUtils'
import { ContextMenu } from './ContextMenu'
import { AttachmentModal } from './AttachmentModal'
import { AssetNameModal } from './AssetNameModal'

interface KonvaCanvasProps {
  width: number
  height: number
  isLiveMode?: boolean
  onContextMenu?: (e: React.MouseEvent, objectCount: number) => void
}

export interface KonvaCanvasRef {
  getOverlappingObjects: (objectId: string) => any[]
  attachObjectTo: (childId: string, parentId: string) => Promise<void>
  detachObject: (objectId: string) => Promise<void>
  handleSaveAsAsset: (objectIds: string[]) => Promise<void>
}

export const KonvaCanvas = React.forwardRef<KonvaCanvasRef, KonvaCanvasProps>(
  ({ width, height, isLiveMode = false, onContextMenu }, ref) => {
  const stageRef = useRef<Konva.Stage>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  
  const currentScene = sceneSelectors.useCurrentScene()
  const sceneObjects = sceneSelectors.useSceneObjects()
  const selectedObjects = sceneSelectors.useSelectedObjects()
  const zoom = uiSelectors.useZoom()
  const selectedTool = uiSelectors.useSelectedTool()
  const panOffset = uiSelectors.usePanOffset()
  const temporaryTool = uiSelectors.useTemporaryTool()
  
  const { selectObject, selectObjects, clearSelection, updateSceneObject, deleteSceneObject, addObjectToScene, bringToFront, sendToBack, duplicateSceneObject, createGroup, ungroupObjects, getObjectGroup, clearScene } = useSceneStore()
  const { getAssetById, addAsset } = useAssetStore()
  const { setDragging, setSelectedTool, setZoom, panBy, setTemporaryTool, resetPan } = useUIStore()

  const [images, setImages] = useState<Record<string, HTMLImageElement>>({})
  const [isPanning, setIsPanning] = useState(false)
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 })
  
  // Attachment modal state
  const [attachmentModal, setAttachmentModal] = useState({
    isVisible: false,
    topObjectId: '',
    bottomObjectId: ''
  })

  // Asset name modal state
  const [assetNameModal, setAssetNameModal] = useState({
    isVisible: false,
    defaultName: '',
    objectIds: [] as string[],
    onConfirm: null as ((name: string) => void) | null
  })

  // Configure canvas for high-quality rendering
  useEffect(() => {
    if (stageRef.current) {
      const stage = stageRef.current
      const canvas = stage.content?.querySelector('canvas')
      const context = canvas?.getContext('2d')
      if (context) {
        // Enable high-quality image rendering
        context.imageSmoothingEnabled = true
        context.imageSmoothingQuality = 'high'
        console.log('🎨 Canvas configured for high-quality rendering')
      }
    }
  }, [stageRef.current])

  // Handle mouse wheel zoom
  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    
    const stage = stageRef.current
    if (!stage) return
    
    const scaleBy = 1.1
    const pointer = stage.getPointerPosition()
    
    if (!pointer) return
    
    // Get current zoom from store (this is our source of truth)
    const currentZoom = zoom
    const direction = e.evt.deltaY > 0 ? -1 : 1
    const newZoom = direction > 0 ? currentZoom * scaleBy : currentZoom / scaleBy
    const clampedZoom = Math.max(0.1, Math.min(5, newZoom))
    
    // Calculate zoom center point relative to stage
    const stagePos = stage.position()
    const mousePointTo = {
      x: (pointer.x - stagePos.x) / currentZoom,
      y: (pointer.y - stagePos.y) / currentZoom,
    }
    
    // Update zoom in store (this will trigger a re-render with new zoom)
    setZoom(clampedZoom)
    
    // Calculate new pan offset to keep zoom centered on mouse
    const newPanX = pointer.x - mousePointTo.x * clampedZoom
    const newPanY = pointer.y - mousePointTo.y * clampedZoom
    
    // Update pan offset in store
    panBy(newPanX - stagePos.x, newPanY - stagePos.y)
  }

  // Handle pan start
  const handlePanStart = (e: KonvaEventObject<MouseEvent>) => {
    const currentTool = temporaryTool || selectedTool
    
    // Pan with: pan tool + left click, middle mouse button, or space + left click
    if (currentTool === 'pan' || e.evt.button === 1 || (e.evt.button === 0 && temporaryTool === 'pan')) {
      e.evt.preventDefault()
      setIsPanning(true)
      const stage = stageRef.current
      if (stage) {
        const pos = stage.getPointerPosition()
        if (pos) {
          setLastPanPoint({ x: pos.x, y: pos.y })
          document.body.style.cursor = 'grabbing'
        }
      }
    }
  }

  // Handle pan move
  const handlePanMove = (e: KonvaEventObject<MouseEvent>) => {
    if (!isPanning) return
    
    const stage = stageRef.current
    if (!stage) return
    
    const pos = stage.getPointerPosition()
    if (!pos) return
    
    const deltaX = pos.x - lastPanPoint.x
    const deltaY = pos.y - lastPanPoint.y
    
    // Update pan offset in store instead of directly manipulating stage
    panBy(deltaX, deltaY)
    
    setLastPanPoint({ x: pos.x, y: pos.y })
  }

  // Handle pan end
  const handlePanEnd = () => {
    setIsPanning(false)
    const currentTool = temporaryTool || selectedTool
    document.body.style.cursor = currentTool === 'pan' ? 'grab' : 'default'
  }

  // Handle spacebar key events for temporary pan tool
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && temporaryTool !== 'pan') {
        e.preventDefault()
        setTemporaryTool('pan')
        document.body.style.cursor = 'grab'
      }
    }
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && temporaryTool === 'pan') {
        e.preventDefault()
        setTemporaryTool(null)
        document.body.style.cursor = 'default'
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [temporaryTool, setTemporaryTool])

  // Sync zoom and pan from store to Konva stage
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    
    // Apply zoom and pan from store
    stage.scale({ x: zoom, y: zoom })
    stage.position({ x: panOffset.x, y: panOffset.y })
    stage.batchDraw()
  }, [zoom, panOffset])

  // Load images for scene objects with high quality
  useEffect(() => {
    const loadImages = async () => {
      const imagePromises = sceneObjects.map(async (obj) => {
        if (images[obj.assetId]) return null // Already loaded
        
        const asset = getAssetById(obj.assetId)
        if (!asset) return null

        try {
          // Use the new high-quality image loader with data URL if available
          const img = await createCanvasOptimizedImage(asset.blob, asset.highQualityDataURL)
          return { id: obj.assetId, image: img }
        } catch (error) {
          console.error(`Failed to load high-quality image for asset ${obj.assetId}:`, error)
          
          // Fallback to standard loading
          return new Promise<{ id: string; image: HTMLImageElement }>((resolve, reject) => {
            const img = new window.Image()
            img.onload = () => {
              console.log(`🖼️ Fallback loaded: ${asset.name} (${img.naturalWidth}x${img.naturalHeight})`)
              resolve({ id: obj.assetId, image: img })
            }
            img.onerror = reject
            img.src = createObjectURL(asset.blob)
          })
        }
      })

      const results = await Promise.allSettled(imagePromises.filter(Boolean))
      const newImages: Record<string, HTMLImageElement> = {}
      
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          newImages[result.value.id] = result.value.image
          console.log(`✅ High-quality image loaded for asset: ${result.value.id}`)
        }
      })

      if (Object.keys(newImages).length > 0) {
        setImages(prev => ({ ...prev, ...newImages }))
      }
    }

    loadImages()
  }, [sceneObjects, getAssetById, images])

  // Handle object selection (different behavior for Live Mode)
  const handleObjectClick = (e: KonvaEventObject<MouseEvent>, obj: SceneObject) => {
    e.cancelBubble = true

    if (isLiveMode) {
      // Live Mode: Interactive game behavior
      console.log(`🎮 Live Mode - Object clicked: ${obj.id}`)
      
      // Select the object but also allow for game interactions
      selectObject(obj.id)
      
      // Add visual feedback for live interaction
      const node = e.target
      const originalScale = node.scaleX()
      
      // Quick scale animation for feedback
      node.to({
        scaleX: originalScale * 1.1,
        scaleY: originalScale * 1.1,
        duration: 0.1,
        onFinish: () => {
          node.to({
            scaleX: originalScale,
            scaleY: originalScale,
            duration: 0.1
          })
        }
      })
      
      // Emit event for automation API
      window.dispatchEvent(new CustomEvent('gameObjectClicked', {
        detail: { objectId: obj.id, position: { x: obj.x, y: obj.y } }
      }))
      
      return
    }

    // Edit Mode: Standard selection behavior
    if (selectedTool === 'delete') {
      deleteSceneObject(obj.id)
      console.log(`🗑️ Deleted object: ${obj.id}`)
      return
    }

    if (e.evt.ctrlKey || e.evt.metaKey) {
      // Multi-select
      const newSelection = selectedObjects.includes(obj.id)
        ? selectedObjects.filter(id => id !== obj.id)
        : [...selectedObjects, obj.id]
      selectObjects(newSelection)
      console.log(`🎯 Multi-selected ${newSelection.length} object(s)`)
    } else {
      // Single select
      selectObject(obj.id)
      console.log(`🎯 Selected object: ${obj.id}`)
    }
  }

  // Handle stage click (deselect all)
  const handleStageClick = (e: KonvaEventObject<MouseEvent>) => {
    // Clear selection if clicking on stage, background rect, or grid elements
    const target = e.target
    const isStage = target === target.getStage()
    const isBackground = target.name() === 'background' || target.name() === 'grid'
    const isNotObject = !target.id().startsWith('object-')
    
    if (isStage || isBackground || isNotObject) {
      clearSelection()
      console.log('🎯 Cleared selection - clicked on background')
    }
  }

  // Handle object drag start
  const handleObjectDragStart = (e: any) => {
    const objectId = e.target.id().replace('object-', '')
    const object = sceneObjects.find(obj => obj.id === objectId)
    
    // Check if object is locked
    if (object?.locked) {
      console.log(`🔒 Cannot drag locked object ${objectId}`)
      e.target.stopDrag()
      return
    }
    
    setDragging(true)
    console.log(`🎯 Drag started for object ${objectId}`)
    
    // Store initial positions for group members
    const group = getObjectGroup(objectId)
    if (group) {
      const draggedObject = sceneObjects.find(obj => obj.id === objectId)
      if (draggedObject?.isGroupParent) {
        console.log(`🔗 Starting group drag for "${group.name}"`)
        // Store initial positions for smooth group dragging
        group.childObjectIds.forEach((childId: string) => {
          const childObject = sceneObjects.find(obj => obj.id === childId)
          if (childObject) {
            // Store relative position to parent
            const relativeX = childObject.x - draggedObject.x
            const relativeY = childObject.y - draggedObject.y
            // Store this in a way we can access during drag
            const childNode = stageRef.current?.findOne(`#object-${childId}`)
            if (childNode) {
              childNode.setAttr('initialRelativeX', relativeX)
              childNode.setAttr('initialRelativeY', relativeY)
            }
          }
        })
      }
    }
  }

  // Handle object drag move (during drag)
  const handleObjectDragMove = (e: any) => {
    const objectId = e.target.id().replace('object-', '')
    const group = getObjectGroup(objectId)
    
    if (group) {
      const draggedObject = sceneObjects.find(obj => obj.id === objectId)
      if (draggedObject?.isGroupParent) {
        const parentNode = e.target
        const parentX = parentNode.x()
        const parentY = parentNode.y()
        
        // Move all child objects in real-time
        group.childObjectIds.forEach((childId: string) => {
          const childNode = stageRef.current?.findOne(`#object-${childId}`)
          if (childNode) {
            const relativeX = childNode.getAttr('initialRelativeX') || 0
            const relativeY = childNode.getAttr('initialRelativeY') || 0
            
            childNode.x(parentX + relativeX)
            childNode.y(parentY + relativeY)
          }
        })
        
        // Redraw the layer
        stageRef.current?.batchDraw()
      }
    }
  }

  // Handle object drag (enhanced for Live Mode)
  const handleObjectDragEnd = (e: any, objectId: string) => {
    setDragging(false)
    const node = e.target
    const newX = node.x()
    const newY = node.y()
    
    console.log(`🎯 Drag ended for object ${objectId} at (${newX}, ${newY})`)
    
    const oldObject = sceneObjects.find(obj => obj.id === objectId)
    if (!oldObject) {
      console.log(`❌ Could not find object ${objectId}`)
      return
    }
    
    console.log(`📍 Old position: (${oldObject.x}, ${oldObject.y})`)
    
    // Live Mode specific behavior
    if (isLiveMode) {
      console.log(`🎮 Live Mode - Object dragged: ${objectId}`)
      
      // Emit drag event for automation API
      window.dispatchEvent(new CustomEvent('gameObjectMoved', {
        detail: { 
          objectId, 
          oldPosition: { x: oldObject.x, y: oldObject.y },
          newPosition: { x: newX, y: newY }
        }
      }))
      
      // Add smooth movement animation
      node.to({
        x: newX,
        y: newY,
        duration: 0.2,
        easing: Konva.Easings.EaseOut
      })
    }
    
    // Check if this object is part of a group
    const group = getObjectGroup(objectId)
    console.log(`🔍 Group check for ${objectId}:`, group)
    console.log(`🔍 Object groupId: ${oldObject.groupId}, isGroupParent: ${oldObject.isGroupParent}`)
    
    if (group && oldObject.isGroupParent) {
      // This is a group parent - sync all positions to state
      console.log(`🔗 Syncing group "${group.name}" positions to state`)
      console.log(`👑 Parent object: ${objectId}`)
      console.log(`👶 Child objects: ${group.childObjectIds}`)
      
      // Update parent object in state
      updateSceneObject(objectId, { x: newX, y: newY })
      
      // Handle attachment movement for groups
      moveAttachedObjects(objectId, newX, newY)
      
      // Update all child objects in state to match their visual positions
      group.childObjectIds.forEach((childId: string) => {
        const childNode = stageRef.current?.findOne(`#object-${childId}`)
        if (childNode) {
          const childX = childNode.x()
          const childY = childNode.y()
          console.log(`👶 Syncing child ${childId} position to (${childX}, ${childY})`)
          updateSceneObject(childId, { x: childX, y: childY })
        }
      })
    } else if (group && !oldObject.isGroupParent) {
      // This is a group child - don't allow individual movement in Edit Mode
      if (!isLiveMode) {
        console.log(`🔒 Cannot move child object "${objectId}" individually - it's part of group "${group.name}"`)
        
        // Snap back to original position
        node.x(oldObject.x)
        node.y(oldObject.y)
        return
      } else {
        // In Live Mode, allow child movement but update state
        updateSceneObject(objectId, { x: newX, y: newY })
      }
    } else {
      // Regular object movement
      console.log(`➡️ Regular object movement for ${objectId}`)
      updateSceneObject(objectId, { x: newX, y: newY })
      
      // Handle attachment movement for regular objects
      moveAttachedObjects(objectId, newX, newY)
    }
  }

  // Handle transform start - store initial positions for groups
  const handleTransformStart = (obj: SceneObject) => {
    const group = getObjectGroup(obj.id)
    if (group && obj.isGroupParent) {
      console.log(`🎯 Starting group transform for "${group.name}"`)
      
      // Store the original positions and transformations
      const childData: any = {}
      
      group.childObjectIds.forEach((childId: string) => {
        const childObject = sceneObjects.find(o => o.id === childId)
        if (childObject) {
          childData[childId] = {
            originalX: childObject.x,
            originalY: childObject.y,
            originalWidth: childObject.width,
            originalHeight: childObject.height,
            originalRotation: childObject.rotation,
            // Calculate offset from parent's top-left corner
            offsetX: childObject.x - obj.x,
            offsetY: childObject.y - obj.y
          }
          console.log(`📍 Stored transform data for ${childId}:`, childData[childId])
        }
      })
      
      // Store on the parent node for access during transform
      const parentNode = stageRef.current?.findOne(`#object-${obj.id}`)
      if (parentNode) {
        parentNode.setAttr('groupChildData', childData)
        parentNode.setAttr('originalParentX', obj.x)
        parentNode.setAttr('originalParentY', obj.y)
        parentNode.setAttr('originalParentWidth', obj.width)
        parentNode.setAttr('originalParentHeight', obj.height)
        parentNode.setAttr('originalParentRotation', obj.rotation)
      }
    }
  }

  // Handle object transform (resize/rotate)
  const handleObjectTransform = (obj: SceneObject) => {
    if (!transformerRef.current) return

    const node = transformerRef.current.nodes()[0]
    if (!node) return

    const scaleX = node.scaleX()
    const scaleY = node.scaleY()
    const newRotation = node.rotation()

    console.log(`🔄 Transform object ${obj.id}: scale(${scaleX}, ${scaleY}), rotation(${newRotation})`)

    // Check if this object is part of a group and is the parent
    const group = getObjectGroup(obj.id)
    
    if (group && obj.isGroupParent) {
      console.log(`🔗 Transforming group "${group.name}"`)
      
      // Get stored child data
      const childData = node.getAttr('groupChildData') || {}
      const originalParentX = node.getAttr('originalParentX') || obj.x
      const originalParentY = node.getAttr('originalParentY') || obj.y
      const originalParentWidth = node.getAttr('originalParentWidth') || obj.width
      const originalParentHeight = node.getAttr('originalParentHeight') || obj.height
      const originalParentRotation = node.getAttr('originalParentRotation') || obj.rotation
      
      // Calculate transformation parameters
      const newParentX = node.x()
      const newParentY = node.y()
      const newParentWidth = Math.max(5, node.width() * scaleX)
      const newParentHeight = Math.max(5, node.height() * scaleY)
      
      // Calculate scaling factors
      const scaleFactorX = newParentWidth / originalParentWidth
      const scaleFactorY = newParentHeight / originalParentHeight
      const rotationDelta = newRotation - originalParentRotation
      
      console.log(`📐 Transform factors: scaleX=${scaleFactorX}, scaleY=${scaleFactorY}, rotationDelta=${rotationDelta}°`)
      
      // Update parent object
      updateSceneObject(obj.id, {
        x: newParentX,
        y: newParentY,
        width: newParentWidth,
        height: newParentHeight,
        rotation: newRotation
      })

      // Transform all child objects
      group.childObjectIds.forEach((childId: string) => {
        const data = childData[childId]
        if (!data) return
        
        const childNode = stageRef.current?.findOne(`#object-${childId}`)
        if (!childNode) return
        
        // Scale the offset from parent
        let newOffsetX = data.offsetX * scaleFactorX
        let newOffsetY = data.offsetY * scaleFactorY
        
        // Apply rotation around parent's top-left corner if there's rotation
        if (Math.abs(rotationDelta) > 0.01) {
          const radians = (rotationDelta * Math.PI) / 180
          const cos = Math.cos(radians)
          const sin = Math.sin(radians)
          
          const rotatedOffsetX = newOffsetX * cos - newOffsetY * sin
          const rotatedOffsetY = newOffsetX * sin + newOffsetY * cos
          
          newOffsetX = rotatedOffsetX
          newOffsetY = rotatedOffsetY
        }
        
        // Calculate final child position
        const newChildX = newParentX + newOffsetX
        const newChildY = newParentY + newOffsetY
        const newChildWidth = Math.max(5, data.originalWidth * scaleFactorX)
        const newChildHeight = Math.max(5, data.originalHeight * scaleFactorY)
        const newChildRotation = data.originalRotation + rotationDelta
        
        console.log(`👶 Transforming child ${childId}:`, {
          originalOffset: { x: data.offsetX, y: data.offsetY },
          scaledOffset: { x: data.offsetX * scaleFactorX, y: data.offsetY * scaleFactorY },
          rotatedOffset: { x: newOffsetX, y: newOffsetY },
          finalPosition: { x: newChildX, y: newChildY },
          size: { width: newChildWidth, height: newChildHeight },
          rotation: newChildRotation
        })
        
        // Update child object in state
        updateSceneObject(childId, {
          x: newChildX,
          y: newChildY,
          width: newChildWidth,
          height: newChildHeight,
          rotation: newChildRotation
        })
        
        // Update child node visually
        childNode.x(newChildX)
        childNode.y(newChildY)
        childNode.width(newChildWidth)
        childNode.height(newChildHeight)
        childNode.rotation(newChildRotation)
        childNode.scaleX(1)
        childNode.scaleY(1)
      })
      
      // Reset parent transform to prevent double transformation
      node.scaleX(1)
      node.scaleY(1)
      
      // Redraw the stage
      stageRef.current?.batchDraw()
      
    } else if (group && !obj.isGroupParent) {
      // Child objects can't be transformed individually
      console.log(`🔒 Cannot transform child object "${obj.id}" individually`)
      
      // Reset transformation
      node.scaleX(1)
      node.scaleY(1)
      node.rotation(obj.rotation)
      return
      
    } else {
      // Regular object transformation
      console.log(`🔄 Regular transform for ${obj.id}`)
      updateSceneObject(obj.id, {
        x: node.x(),
        y: node.y(),
        width: Math.max(5, node.width() * scaleX),
        height: Math.max(5, node.height() * scaleY),
        rotation: newRotation
      })

      // Reset scale to 1 to prevent accumulation
      node.scaleX(1)
      node.scaleY(1)
    }
  }

  // Update transformer when selection changes
  useEffect(() => {
    const transformer = transformerRef.current
    if (!transformer) return

    const stage = stageRef.current
    if (!stage) return

    if (selectedObjects.length === 1 && (selectedTool === 'select' || selectedTool === 'resize')) {
      const selectedNode = stage.findOne(`#object-${selectedObjects[0]}`)
      if (selectedNode) {
        transformer.nodes([selectedNode])
        transformer.getLayer()?.batchDraw()
      }
    } else {
      transformer.nodes([])
      transformer.getLayer()?.batchDraw()
    }
  }, [selectedObjects, selectedTool])

  // Handle drop from asset library
  const handleDrop = (e: any) => {
    e.preventDefault()
    console.log('🎯 Drop event triggered!')
    
    // Check if we have a current scene
    if (!currentScene) {
      console.error('❌ No current scene - cannot drop objects')
      return
    }
    
    console.log('✅ Current scene exists:', currentScene.name)

    const dragData = e.dataTransfer?.getData('application/json')
    console.log('📦 Drag data:', dragData)

    if (!dragData) {
      console.log('❌ No drag data found')
      return
    }

    try {
      const data = JSON.parse(dragData)
      console.log('📋 Parsed data:', data)

      if (data.type === 'asset') {
        const asset = getAssetById(data.assetId)
        console.log('🖼️ Found asset:', asset?.name)

        if (!asset) {
          console.log('❌ Asset not found')
          return
        }

        // Get the stage element and calculate relative position
        const stage = stageRef.current
        if (!stage) {
          console.log('❌ Stage ref not found')
          return
        }

        // Get the canvas container (the scaled div)
        const canvasContainer = stage.container().closest('[style*="transform"]') as HTMLElement
        const stageContainer = stage.container()
        
        let dropX, dropY
        
        if (canvasContainer && canvasContainer !== stageContainer) {
          // We have a CSS transform applied - need to account for it
          const containerRect = canvasContainer.getBoundingClientRect()
          const relativeX = e.clientX - containerRect.left
          const relativeY = e.clientY - containerRect.top
          
          // Extract the scale from the transform style
          const transform = canvasContainer.style.transform
          const scaleMatch = transform.match(/scale\(([\d.]+)\)/)
          const cssScale = scaleMatch ? parseFloat(scaleMatch[1]) : 1
          
          // Convert back to canvas coordinates
          dropX = relativeX / cssScale
          dropY = relativeY / cssScale
          
          console.log('🎯 CSS Scale detected:', cssScale)
          console.log('📍 Client position:', { x: e.clientX, y: e.clientY })
          console.log('📦 Container rect:', containerRect)
          console.log('📏 Relative position:', { x: relativeX, y: relativeY })
          console.log('🎯 Adjusted position:', { x: dropX, y: dropY })
        } else {
          // Fallback to stage pointer position
          const pointer = stage.getPointerPosition()
          if (!pointer) {
            console.log('❌ Could not get pointer position')
            return
          }
          dropX = pointer.x / stage.scaleX()
          dropY = pointer.y / stage.scaleY()
          console.log('🎯 Fallback position: x=' + dropX + ', y=' + dropY)
        }

        const x = dropX
        const y = dropY

        // Create new scene object with reasonable size
        const originalWidth = (asset.metadata as any).width || 100
        const originalHeight = (asset.metadata as any).height || 100
        
        // Ensure minimum reasonable size (at least 50px, max 300px)
        const defaultSize = 150
        let objectWidth = originalWidth
        let objectHeight = originalHeight
        
        // If the original is too small, scale it up
        if (originalWidth < 50 || originalHeight < 50) {
          const scale = Math.max(50 / originalWidth, 50 / originalHeight)
          objectWidth = originalWidth * scale
          objectHeight = originalHeight * scale
        }
        
        // If it's too big, scale it down
        if (objectWidth > 300 || objectHeight > 300) {
          const scale = Math.min(300 / objectWidth, 300 / objectHeight)
          objectWidth = objectWidth * scale
          objectHeight = objectHeight * scale
        }
        
        console.log(`📏 Object size: ${originalWidth}x${originalHeight} → ${Math.round(objectWidth)}x${Math.round(objectHeight)}`)

        const newObject: Omit<SceneObject, 'id'> = {
          assetId: asset.id,
          x,
          y,
          width: Math.round(objectWidth),
          height: Math.round(objectHeight),
          rotation: 0,
          zIndex: (currentScene.objects?.length || 0) + 1,
          interactions: []
        }

        addObjectToScene(newObject)
        console.log('✅ Added object to scene from asset:', asset.id)
      }
    } catch (error) {
      console.error('❌ Failed to parse drag data:', error)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    console.log('🔄 Drag over canvas')
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    console.log('🎯 Drag enter canvas')
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault() 
    console.log('🚪 Drag leave canvas')
  }

  // Add keyboard event handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target !== document.body && !(e.target as HTMLElement).closest('.konva-container')) {
        return
      }

      switch (e.key.toLowerCase()) {
        case 'delete':
        case 'backspace':
          if (selectedObjects.length > 0) {
            selectedObjects.forEach(id => deleteSceneObject(id))
            clearSelection()
          }
          break
        case 'd':
          setSelectedTool('delete')
          break
        case 'v':
          setSelectedTool('select')
          break
        case 'm':
          setSelectedTool('move')
          break
        case 'r':
          setSelectedTool('resize')
          break
        case 'escape':
          clearSelection()
          break
        case 'g':
          if (e.ctrlKey && !e.shiftKey && selectedObjects.length > 1) {
            e.preventDefault()
            createGroup(selectedObjects)
          } else if (e.ctrlKey && e.shiftKey && selectedObjects.length === 1) {
            e.preventDefault()
            const group = getObjectGroup(selectedObjects[0])
            if (group) {
              ungroupObjects(group.id)
            }
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedObjects, deleteSceneObject, clearSelection, setSelectedTool, createGroup, ungroupObjects])

  // Handle right-click context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    
    if (onContextMenu) {
      onContextMenu(e, selectedObjects.length)
    }
    
    console.log(`🖱️ Right-click context menu at (${e.clientX}, ${e.clientY}) with ${selectedObjects.length} selected`)
  }

  const closeContextMenu = () => {
    // Context menu is now handled externally
  }

  // Context menu actions
  const handleContextDelete = () => {
    if (selectedObjects.length > 0) {
      selectedObjects.forEach(objectId => {
        deleteSceneObject(objectId)
      })
      console.log(`🗑️ Context menu deleted ${selectedObjects.length} object(s)`)
    }
  }

  const handleContextBringToFront = () => {
    if (selectedObjects.length > 0) {
      selectedObjects.forEach(objectId => {
        bringToFront(objectId)
      })
      console.log(`⬆️ Brought ${selectedObjects.length} object(s) to front`)
    }
  }

  const handleContextSendToBack = () => {
    if (selectedObjects.length > 0) {
      selectedObjects.forEach(objectId => {
        sendToBack(objectId)
      })
      console.log(`⬇️ Sent ${selectedObjects.length} object(s) to back`)
    }
  }

  const handleContextDuplicate = () => {
    if (selectedObjects.length > 0) {
      selectedObjects.forEach(objectId => {
        duplicateSceneObject(objectId)
      })
      console.log(`📋 Context menu duplicated ${selectedObjects.length} object(s)`)
    }
  }

  // Handle object right-click (Enhanced for Live Mode)
  const handleObjectContextMenu = (e: KonvaEventObject<PointerEvent>, obj: SceneObject) => {
    e.cancelBubble = true
    e.evt.preventDefault()
    
    console.log(`🖱️ ${isLiveMode ? 'Live Mode' : 'Edit Mode'} - Right-click on ${obj.id}`)
    
    // If object is not selected, select it first
    if (!selectedObjects.includes(obj.id)) {
      selectObject(obj.id)
    }
    
    // Live Mode specific right-click behavior
    if (isLiveMode) {
      console.log(`🎮 Live Mode right-click on ${obj.id}`)
      
      // Add special Live Mode visual feedback
      const node = e.target
      const originalOpacity = node.opacity()
      
      // Quick flash effect for right-click feedback
      node.to({
        opacity: 0.5,
        duration: 0.1,
        onFinish: () => {
          node.to({
            opacity: originalOpacity,
            duration: 0.1
          })
        }
      })
      
      // Emit event for automation API
      window.dispatchEvent(new CustomEvent('gameObjectRightClicked', {
        detail: { 
          objectId: obj.id, 
          position: { x: obj.x, y: obj.y },
          asset: getAssetById(obj.assetId) 
        }
      }))
    }
    
    // Get global mouse position
    const stage = stageRef.current
    if (!stage) return
    
    const pointerPosition = stage.getPointerPosition()
    if (!pointerPosition) return
    
    // Convert stage position to screen position
    const stageContainer = stage.container()
    const rect = stageContainer.getBoundingClientRect()
    
    if (onContextMenu) {
      // Create a synthetic mouse event for the external handler
      const syntheticEvent = {
        preventDefault: () => {},
        clientX: rect.left + pointerPosition.x,
        clientY: rect.top + pointerPosition.y
      } as React.MouseEvent
      
      onContextMenu(syntheticEvent, selectedObjects.includes(obj.id) ? selectedObjects.length : 1)
    }
  }

  // Handle saving selected objects as a new asset
  const handleSaveAsAsset = async (objectIds: string[], customName?: string) => {
    if (objectIds.length === 0) return

    // Get the selected objects
    const selectedObjs = sceneObjects.filter(obj => objectIds.includes(obj.id))
    if (selectedObjs.length === 0) return

    // Calculate bounding box of all selected objects
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    
    selectedObjs.forEach(obj => {
      minX = Math.min(minX, obj.x)
      minY = Math.min(minY, obj.y)
      maxX = Math.max(maxX, obj.x + obj.width)
      maxY = Math.max(maxY, obj.y + obj.height)
    })

    const boundingWidth = maxX - minX
    const boundingHeight = maxY - minY

    console.log(`📏 Bounding box: ${boundingWidth} x ${boundingHeight}`)

    // Use custom name or prompt for asset name
    let assetName: string
    if (customName) {
      assetName = customName
    } else {
      const defaultName = selectedObjs.length > 1 ? 
        `Composite_${Date.now()}` : 
        `Asset_${Date.now()}`
      
      const promptedName = prompt('Enter name for the new asset:', defaultName)
      if (!promptedName) return
      assetName = promptedName
    }

    try {
      // Create a temporary stage to render the objects
      const tempStage = new (window as any).Konva.Stage({
        container: document.createElement('div'),
        width: boundingWidth,
        height: boundingHeight
      })

      const tempLayer = new (window as any).Konva.Layer()
      tempStage.add(tempLayer)

      // Sort objects by zIndex to maintain proper layering (just like in main canvas)
      const sortedObjs = selectedObjs.slice().sort((a, b) => a.zIndex - b.zIndex)
      
      console.log(`🎨 Rendering ${sortedObjs.length} objects in z-order:`)
      sortedObjs.forEach(obj => {
        console.log(`  - Object ${obj.id.slice(-4)}: z=${obj.zIndex}, pos=(${obj.x}, ${obj.y})`)
      })

             // Add all selected objects to temporary stage (offset by bounding box)
       for (const obj of sortedObjs) {
         const asset = getAssetById(obj.assetId)
         if (!asset || !images[obj.assetId]) {
           console.log(`⚠️ Missing asset or image for object ${obj.id}`)
           continue
         }

         console.log(`🔍 Processing object ${obj.id}:`)
         console.log(`  - Asset ID: ${obj.assetId}`)
         console.log(`  - Asset Name: ${asset.name}`)
         console.log(`  - Image loaded: ${!!images[obj.assetId]}`)
         console.log(`  - Position: (${obj.x}, ${obj.y}) -> (${obj.x - minX}, ${obj.y - minY})`)
         console.log(`  - Size: ${obj.width} x ${obj.height}`)

         const tempImage = new (window as any).Konva.Image({
           image: images[obj.assetId],
           x: obj.x - minX,  // Offset to start from 0,0
           y: obj.y - minY,
           width: obj.width,
           height: obj.height,
           rotation: obj.rotation
         })

         tempLayer.add(tempImage)
         console.log(`✅ Added "${asset.name}" to composite`)
       }

      tempLayer.draw()

      // Convert to data URL
      const dataURL = tempStage.toDataURL({
        mimeType: 'image/png',
        quality: 1,
        pixelRatio: 1
      })

      // Clean up temporary stage
      tempStage.destroy()

      // Convert data URL to blob
      const response = await fetch(dataURL)
      const blob = await response.blob()

      // Create thumbnail
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      canvas.width = 150
      canvas.height = 150
      
      const img = new Image()
      img.onload = async () => {
        // Draw scaled thumbnail
        const scale = Math.min(150 / boundingWidth, 150 / boundingHeight)
        const scaledWidth = boundingWidth * scale
        const scaledHeight = boundingHeight * scale
        const offsetX = (150 - scaledWidth) / 2
        const offsetY = (150 - scaledHeight) / 2
        
        ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight)
        const thumbnail = canvas.toDataURL('image/jpeg', 0.8)

        // Create new asset with proper structure
        const newAssetData: Asset = {
          id: `composite-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: assetName,
          type: 'character' as const,
          blob: blob,
          thumbnail: thumbnail,
          metadata: {
            width: boundingWidth,
            height: boundingHeight,
            fileSize: blob.size,
            uploadDate: new Date()
          }
        }

        // Add to asset store (addAsset will generate the ID)
        await addAsset(newAssetData)
        
        console.log(`✅ Saved "${assetName}" as new asset (${boundingWidth}x${boundingHeight})`)
      }
      
      img.src = dataURL
      
      console.log(`✅ Saved "${assetName}" as new asset (${boundingWidth}x${boundingHeight})`)
      
      // Optional: Show success message
      // You could add a toast notification here

    } catch (error) {
      console.error('❌ Failed to save as asset:', error)
      alert('Failed to save as asset. Please try again.')
    }
  }

  // Detect overlapping objects
  const getOverlappingObjects = (targetObjectId: string) => {
    const targetObj = sceneObjects.find(obj => obj.id === targetObjectId)
    if (!targetObj) {
      console.log(`⚠️ Target object ${targetObjectId} not found for overlap detection`)
      return []
    }

    const overlapping = sceneObjects.filter(obj => {
      if (obj.id === targetObjectId) return false // Don't include self
      
      // Check if objects overlap using bounding box collision with a small tolerance
      const tolerance = 5 // 5 pixels tolerance for near-overlaps
      const targetLeft = targetObj.x - tolerance
      const targetRight = targetObj.x + targetObj.width + tolerance
      const targetTop = targetObj.y - tolerance
      const targetBottom = targetObj.y + targetObj.height + tolerance
      
      const objLeft = obj.x
      const objRight = obj.x + obj.width
      const objTop = obj.y
      const objBottom = obj.y + obj.height
      
      // Check for overlap (including tolerance)
      const horizontalOverlap = targetLeft < objRight && targetRight > objLeft
      const verticalOverlap = targetTop < objBottom && targetBottom > objTop
      
      const isOverlapping = horizontalOverlap && verticalOverlap
      
      if (isOverlapping) {
        console.log(`🔍 Overlap detected: ${targetObj.id.slice(-4)} with ${obj.id.slice(-4)}`)
        console.log(`  Target: (${targetObj.x}, ${targetObj.y}, ${targetObj.width}, ${targetObj.height})`)
        console.log(`  Object: (${obj.x}, ${obj.y}, ${obj.width}, ${obj.height})`)
      }
      
      return isOverlapping
    })

    // Sort by z-index to show which objects are above/below
    const sorted = overlapping.sort((a, b) => b.zIndex - a.zIndex)
    
    console.log(`🔍 Found ${sorted.length} overlapping objects for ${targetObj.id.slice(-4)}:`, 
      sorted.map(obj => `${obj.id.slice(-4)} (z:${obj.zIndex})`))
    
    return sorted
  }

  // Handle attaching objects (combining overlapping objects)
  const handleAttachObjects = async (topObjectId: string, bottomObjectId: string) => {
    const topObj = sceneObjects.find(obj => obj.id === topObjectId)
    const bottomObj = sceneObjects.find(obj => obj.id === bottomObjectId)
    
    if (!topObj || !bottomObj) {
      console.log(`⚠️ Cannot attach objects - missing objects: ${!topObj ? topObjectId : ''} ${!bottomObj ? bottomObjectId : ''}`)
      return
    }

    console.log(`🔗 Opening attachment modal for: ${topObjectId.slice(-4)} to ${bottomObjectId.slice(-4)}`)

    // Show the attachment modal instead of prompt
    setAttachmentModal({
      isVisible: true,
      topObjectId,
      bottomObjectId
    })
  }

  // Handle modal attachment choice
  const handleModalAttach = async () => {
    const { topObjectId, bottomObjectId } = attachmentModal
    await attachObjectTo(topObjectId, bottomObjectId)
    
    const topAsset = getAssetById(sceneObjects.find(obj => obj.id === topObjectId)?.assetId || '')
    const bottomAsset = getAssetById(sceneObjects.find(obj => obj.id === bottomObjectId)?.assetId || '')
    const topName = topAsset?.name || `Object ${topObjectId.slice(-4)}`
    const bottomName = bottomAsset?.name || `Object ${bottomObjectId.slice(-4)}`
    
    console.log(`✅ Attached ${topName} to ${bottomName}`)
  }

  // Handle modal create asset choice
  const handleModalCreateAsset = async () => {
    const { topObjectId, bottomObjectId } = attachmentModal
    
    const topAsset = getAssetById(sceneObjects.find(obj => obj.id === topObjectId)?.assetId || '')
    const bottomAsset = getAssetById(sceneObjects.find(obj => obj.id === bottomObjectId)?.assetId || '')
    const topName = topAsset?.name || `Object ${topObjectId.slice(-4)}`
    const bottomName = bottomAsset?.name || `Object ${bottomObjectId.slice(-4)}`
    const defaultName = `${topName}_on_${bottomName}`
    
    // Show asset name modal
    setAssetNameModal({
      isVisible: true,
      defaultName,
      objectIds: [topObjectId, bottomObjectId],
      onConfirm: async (name: string) => {
        await handleSaveAsAssetWithName([topObjectId, bottomObjectId], name)
        console.log(`✅ Created combined asset: ${name}`)
      }
    })
  }

  // Close attachment modal
  const closeAttachmentModal = () => {
    setAttachmentModal({
      isVisible: false,
      topObjectId: '',
      bottomObjectId: ''
    })
  }

  // Close asset name modal
  const closeAssetNameModal = () => {
    setAssetNameModal({
      isVisible: false,
      defaultName: '',
      objectIds: [],
      onConfirm: null
    })
  }

  // Handle saving asset with custom name
  const handleSaveAsAssetWithName = async (objectIds: string[], customName: string) => {
    // This is a wrapper around handleSaveAsAsset that uses a custom name
    // We'll modify the existing function to accept an optional name parameter
    await handleSaveAsAsset(objectIds, customName)
  }

  // Attach one object to another (new attachment system)
  const attachObjectTo = async (childId: string, parentId: string) => {
    const childObject = sceneObjects.find(obj => obj.id === childId)
    const parentObject = sceneObjects.find(obj => obj.id === parentId)
    
    if (!childObject || !parentObject) return
    
    // Calculate relative offset
    const offsetX = childObject.x - parentObject.x
    const offsetY = childObject.y - parentObject.y
    
    // Update child object
    await updateSceneObject(childId, {
      attachedToId: parentId,
      attachmentOffset: { x: offsetX, y: offsetY }
    })
    
    // Update parent object
    const currentAttached = parentObject.attachedObjects || []
    await updateSceneObject(parentId, {
      attachedObjects: [...currentAttached, childId]
    })
    
    console.log(`🔗 Attached ${childId} to ${parentId}`)
  }

  // Detach an object
  const detachObject = async (objectId: string) => {
    const object = sceneObjects.find(obj => obj.id === objectId)
    if (!object || !object.attachedToId) return
    
    const parentId = object.attachedToId
    const parentObject = sceneObjects.find(obj => obj.id === parentId)
    
    // Remove from child
    await updateSceneObject(objectId, {
      attachedToId: undefined,
      attachmentOffset: undefined
    })
    
    // Remove from parent
    if (parentObject && parentObject.attachedObjects) {
      const updatedAttached = parentObject.attachedObjects.filter(id => id !== objectId)
      await updateSceneObject(parentId, {
        attachedObjects: updatedAttached.length > 0 ? updatedAttached : undefined
      })
    }
    
    console.log(`🔓 Detached ${objectId}`)
  }

  // Move attached objects when parent moves
  const moveAttachedObjects = async (parentId: string, newX: number, newY: number) => {
    const parentObject = sceneObjects.find(obj => obj.id === parentId)
    if (!parentObject || !parentObject.attachedObjects) return
    
    for (const childId of parentObject.attachedObjects) {
      const childObject = sceneObjects.find(obj => obj.id === childId)
      if (childObject && childObject.attachmentOffset) {
        const newChildX = newX + childObject.attachmentOffset.x
        const newChildY = newY + childObject.attachmentOffset.y
        
        await updateSceneObject(childId, {
          x: newChildX,
          y: newChildY
        })
        
        // Also move the Konva node for immediate visual feedback
        const childNode = stageRef.current?.findOne(`#object-${childId}`)
        if (childNode) {
          childNode.x(newChildX)
          childNode.y(newChildY)
        }
      }
    }
  }

  // Expose functions through ref
  React.useImperativeHandle(ref, () => ({
    getOverlappingObjects,
    attachObjectTo,
    detachObject,
    handleSaveAsAsset,
    handleAttachObjects
  }), [getOverlappingObjects, attachObjectTo, detachObject, handleSaveAsAsset, handleAttachObjects])

  // Automation API - Expose game engine functionality for AI/Cursor integration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const gameEngineAPI = {
        // Core scene management
        scene: {
          getObjects: () => sceneObjects,
          getSelectedObjects: () => selectedObjects,
          clearScene: () => clearScene(),
          getCanvasSize: () => ({ width, height }),
          setViewport: (preset: string) => {
            // TikTok, Instagram, YouTube, etc.
            const presets = {
              tiktok: { width: 1080, height: 1920 },
              instagram: { width: 1080, height: 1080 },
              youtube: { width: 1920, height: 1080 },
              twitter: { width: 1200, height: 675 }
            }
            if (presets[preset as keyof typeof presets]) {
              console.log(`🎬 Setting viewport to ${preset}`)
              // TODO: Update canvas size through UI store
            }
          }
        },
        
        // Object manipulation
        addObjectToScene: (assetId: string, x: number, y: number) => {
          console.log(`🤖 API: Adding object ${assetId} at (${x}, ${y})`)
          addObjectToScene({ assetId, x, y, width: 100, height: 100, rotation: 0, zIndex: 0, interactions: [] })
        },
        
        moveObject: (objectId: string, x: number, y: number) => {
          console.log(`🤖 API: Moving object ${objectId} to (${x}, ${y})`)
          updateSceneObject(objectId, { x, y })
          
          // Also update visual position if in Live Mode
          if (isLiveMode) {
            const node = stageRef.current?.findOne(`#object-${objectId}`)
            if (node) {
              node.to({ x, y, duration: 0.3, easing: Konva.Easings.EaseInOut })
            }
          }
        },
        
        resizeObject: (objectId: string, width: number, height: number) => {
          console.log(`🤖 API: Resizing object ${objectId} to ${width}x${height}`)
          updateSceneObject(objectId, { width, height })
        },
        
        rotateObject: (objectId: string, rotation: number) => {
          console.log(`🤖 API: Rotating object ${objectId} to ${rotation}°`)
          updateSceneObject(objectId, { rotation })
        },
        
        deleteObject: (objectId: string) => {
          console.log(`🤖 API: Deleting object ${objectId}`)
          deleteSceneObject(objectId)
        },
        
        duplicateObject: (objectId: string) => {
          console.log(`🤖 API: Duplicating object ${objectId}`)
          duplicateSceneObject(objectId)
        },
        
        selectObject: (objectId: string) => {
          console.log(`🤖 API: Selecting object ${objectId}`)
          selectObject(objectId)
        },
        
        selectObjects: (objectIds: string[]) => {
          console.log(`🤖 API: Selecting objects`, objectIds)
          selectObjects(objectIds)
        },
        
        // Live Mode specific features
        isLiveMode: () => isLiveMode,
        
        // Animation helpers
        animations: {
          // Animate object to position
          moveTo: (objectId: string, x: number, y: number, duration = 1) => {
            const node = stageRef.current?.findOne(`#object-${objectId}`)
            if (node) {
              node.to({ x, y, duration, easing: Konva.Easings.EaseInOut })
              // Update state after animation
              setTimeout(() => updateSceneObject(objectId, { x, y }), duration * 1000)
            }
          },
          
          // Bounce effect
          bounce: (objectId: string) => {
            const node = stageRef.current?.findOne(`#object-${objectId}`)
            if (node) {
              const originalY = node.y()
              node.to({
                y: originalY - 50,
                duration: 0.3,
                easing: Konva.Easings.EaseOut,
                onFinish: () => {
                  node.to({
                    y: originalY,
                    duration: 0.3,
                    easing: Konva.Easings.BounceEaseOut
                  })
                }
              })
            }
          },
          
          // Shake effect
          shake: (objectId: string) => {
            const node = stageRef.current?.findOne(`#object-${objectId}`)
            if (node) {
              const originalX = node.x()
              let shakeCount = 0
              const shakeInterval = setInterval(() => {
                node.x(originalX + (Math.random() - 0.5) * 20)
                shakeCount++
                if (shakeCount > 10) {
                  clearInterval(shakeInterval)
                  node.x(originalX)
                }
              }, 50)
            }
          },
          
          // Template animations
          templates: {
            slideInLeft: (objectId: string, targetX: number, targetY: number) => {
              gameEngineAPI.moveObject(objectId, -200, targetY)
              gameEngineAPI.animations.moveTo(objectId, targetX, targetY, 1)
            },
            
            slideInRight: (objectId: string, targetX: number, targetY: number) => {
              gameEngineAPI.moveObject(objectId, width + 200, targetY)
              gameEngineAPI.animations.moveTo(objectId, targetX, targetY, 1)
            }
          }
        },
        
        // Object attachment system (from right-click menu)
        attachObject: (childId: string, parentId: string) => {
          console.log(`🤖 API: Attaching ${childId} to ${parentId}`)
          attachObjectTo(childId, parentId)
        },
        
        detachObject: (objectId: string) => {
          console.log(`🤖 API: Detaching ${objectId}`)
          detachObject(objectId)
        },
        
        getOverlappingObjects: (objectId: string) => {
          return getOverlappingObjects(objectId)
        },
        
        // Asset creation from selections
        saveAsAsset: (objectIds: string[]) => {
          console.log(`🤖 API: Saving ${objectIds.length} objects as asset`)
          handleSaveAsAsset(objectIds)
        },
        
        // Grouping functionality
        groupObjects: (objectIds: string[]) => {
          console.log(`🤖 API: Grouping ${objectIds.length} objects`)
          createGroup(objectIds)
        },
        
        ungroupObjects: (objectId: string) => {
          console.log(`🤖 API: Ungrouping object ${objectId}`)
          const group = getObjectGroup(objectId)
          if (group) ungroupObjects(group.id)
        },
        
        // Layer controls
        bringToFront: (objectId: string) => {
          console.log(`🤖 API: Bringing ${objectId} to front`)
          bringToFront(objectId)
        },
        
        sendToBack: (objectId: string) => {
          console.log(`🤖 API: Sending ${objectId} to back`)
          sendToBack(objectId)
        },
        
        // Event listeners for AI interaction
        on: (event: string, callback: Function) => {
          window.addEventListener(event, callback as EventListener)
        },
        
        off: (event: string, callback: Function) => {
          window.removeEventListener(event, callback as EventListener)
        }
      }
      
      // Expose API globally for AI/automation tools
      ;(window as any).gameEngineAPI = gameEngineAPI
      console.log('🤖 Game Engine API initialized for AI collaboration!')
      console.log('📚 Available methods:', Object.keys(gameEngineAPI))
      
      // Emit ready event
      window.dispatchEvent(new CustomEvent('gameEngineReady', { detail: gameEngineAPI }))
    }
  }, [sceneObjects, selectedObjects, isLiveMode, width, height])

  if (!currentScene) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="text-4xl mb-2">🎨</div>
          <p>No scene selected</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="w-full h-full bg-gray-100 relative overflow-hidden"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onContextMenu={handleContextMenu}
      style={{ 
        width, 
        height,
        cursor: temporaryTool ? getToolCursor(temporaryTool as any) : getToolCursor(selectedTool)
      }}
    >


      {/* Delete Mode Info */}
      {selectedTool === 'delete' && (
        <div className="absolute top-4 right-4 z-10 bg-red-900/90 backdrop-blur-sm border border-red-500 rounded-lg p-3 text-red-100 text-sm max-w-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-red-400">🗑️</span>
            <span className="font-medium">Delete Mode Active</span>
          </div>
          <p className="text-xs">
            Click any object to delete it instantly, or select objects and press Delete/Backspace key.
          </p>
        </div>
      )}

      {/* Selection Info Panel */}
      {selectedObjects.length > 0 && selectedTool !== 'delete' && (
        <div className="absolute top-4 right-4 bg-gray-800/90 text-white p-3 rounded-lg text-sm max-w-md">
          <div className="font-medium mb-1">
            {selectedObjects.length} object{selectedObjects.length > 1 ? 's' : ''} selected
          </div>
          {selectedObjects.map(id => {
            const obj = sceneObjects.find(o => o.id === id)
            const group = getObjectGroup(id)
            if (!obj) return null
            
            return (
              <div key={id} className="text-xs text-gray-300 mb-1">
                Object {id.slice(-4)} - Position: ({Math.round(obj.x)}, {Math.round(obj.y)}) - Z: {obj.zIndex}
                {group && (
                  <span className="text-blue-400 ml-2">
                    📎 {group.name} {obj.isGroupParent ? '(Parent)' : '(Child)'}
                  </span>
                )}
              </div>
            )
          })}
          <div className="text-xs text-gray-400 mt-2">
            Tools: D=Delete, V=Select, M=Move, R=Resize | Groups: Ctrl+G=Group, Ctrl+Shift+G=Ungroup
          </div>
          {selectedObjects.length > 1 && (
            <div className="text-xs text-blue-400 mt-1">
              💡 Right-click or press Ctrl+G to group these objects together!
            </div>
          )}
        </div>
      )}

      <Stage
        ref={stageRef}
        width={width}
        height={height}
        onClick={handleStageClick}
        onWheel={handleWheel}
        onMouseDown={handlePanStart}
        onMouseMove={handlePanMove}
        onMouseUp={handlePanEnd}
        draggable={false} // We handle dragging manually for better control
        // High-quality rendering settings
        pixelRatio={window.devicePixelRatio || 1}
        imageSmoothingEnabled={true}
      >
        {/* Background Layer */}
        <Layer>
          {/* Scene background */}
          <Rect
            name="background"
            x={0}
            y={0}
            width={width}
            height={height}
            fill={isLiveMode ? "#1a1a1a" : "white"}
            stroke={isLiveMode ? "#3b82f6" : "#e5e7eb"}
            strokeWidth={2}
          />
          
          {/* Grid */}
          {Array.from({ length: Math.ceil(width / 20) + 1 }).map((_, i) => (
            <Rect
              key={`grid-v-${i}`}
              name="grid"
              x={i * 20}
              y={0}
              width={1}
              height={height}
              fill="#f3f4f6"
              opacity={0.5}
            />
          ))}
          {Array.from({ length: Math.ceil(height / 20) + 1 }).map((_, i) => (
            <Rect
              key={`grid-h-${i}`}
              name="grid"
              x={0}
              y={i * 20}
              width={width}
              height={1}
              fill="#f3f4f6"
              opacity={0.5}
            />
          ))}
        </Layer>

        {/* Objects Layer */}
        <Layer>
          {/* Attachment connection lines */}
          {sceneObjects
            .filter(obj => obj.attachedToId)
            .map(childObj => {
              const parentObj = sceneObjects.find(p => p.id === childObj.attachedToId)
              if (!parentObj) return null
              
              // Draw line from parent center to child center
              const parentCenterX = parentObj.x + parentObj.width / 2
              const parentCenterY = parentObj.y + parentObj.height / 2
              const childCenterX = childObj.x + childObj.width / 2
              const childCenterY = childObj.y + childObj.height / 2
              
              return (
                <React.Fragment key={`attachment-${childObj.id}`}>
                  {/* Connection line */}
                  <Line
                    points={[parentCenterX, parentCenterY, childCenterX, childCenterY]}
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dash={[5, 5]}
                    opacity={0.7}
                  />
                  {/* Parent indicator */}
                  <Circle
                    x={parentCenterX}
                    y={parentCenterY}
                    radius={4}
                    fill="#8b5cf6"
                    opacity={0.8}
                  />
                  {/* Child indicator */}
                  <Circle
                    x={childCenterX}
                    y={childCenterY}
                    radius={3}
                    fill="#a855f7"
                    opacity={0.8}
                  />
                </React.Fragment>
              )
            })}
          
          {/* Sort objects by zIndex before rendering */}
          {sceneObjects
            .slice() // Create copy to avoid mutating read-only array
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((obj) => {
              const image = images[obj.assetId]
              if (!image) return null
              
              const isSelected = selectedObjects.includes(obj.id)
              const isInDeleteMode = selectedTool === 'delete'
              const group = getObjectGroup(obj.id)
              const isGrouped = !!group
              const isGroupParent = isGrouped && obj.isGroupParent

              return (
                <KonvaImage
                  key={obj.id}
                  id={`object-${obj.id}`}
                  image={image}
                  x={obj.x}
                  y={obj.y}
                  width={obj.width}
                  height={obj.height}
                  rotation={obj.rotation}
                  draggable={!obj.locked && (selectedTool === 'move' || selectedTool === 'select')}
                  onClick={(e) => handleObjectClick(e, obj)}
                  onContextMenu={(e) => handleObjectContextMenu(e, obj)}
                  onDragStart={handleObjectDragStart}
                  onDragMove={handleObjectDragMove}
                  onDragEnd={(e) => handleObjectDragEnd(e, obj.id)}
                  onTransformStart={() => handleTransformStart(obj)}
                  onTransformEnd={() => handleObjectTransform(obj)}
                  stroke={
                    obj.locked
                      ? '#f59e0b'  // Orange for locked objects
                      : isSelected
                      ? isInDeleteMode 
                        ? '#ef4444'  // Red for delete mode
                        : isGroupParent
                        ? '#3b82f6'  // Blue for group parent
                        : isGrouped
                        ? '#10b981'  // Green for group child
                        : '#3b82f6'  // Blue for selected
                      : undefined
                  }
                  strokeWidth={isSelected || obj.locked ? 2 : 0}
                  dash={isGrouped && !isGroupParent ? [5, 5] : undefined}  // Dashed outline for group children
                />
              )
            })}
          
          {/* Transformer for resize handles */}
          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              // Limit resize
              if (newBox.width < 5 || newBox.height < 5) {
                return oldBox
              }
              return newBox
            }}
          />
        </Layer>
      </Stage>

      {/* Attachment Modal */}
      <AttachmentModal
        isVisible={attachmentModal.isVisible}
        onClose={closeAttachmentModal}
        topObject={sceneObjects.find(obj => obj.id === attachmentModal.topObjectId) || null}
        bottomObject={sceneObjects.find(obj => obj.id === attachmentModal.bottomObjectId) || null}
        topAsset={attachmentModal.topObjectId ? getAssetById(sceneObjects.find(obj => obj.id === attachmentModal.topObjectId)?.assetId || '') || null : null}
        bottomAsset={attachmentModal.bottomObjectId ? getAssetById(sceneObjects.find(obj => obj.id === attachmentModal.bottomObjectId)?.assetId || '') || null : null}
        onAttach={handleModalAttach}
        onCreateAsset={handleModalCreateAsset}
      />

      {/* Asset Name Modal */}
      <AssetNameModal
        isVisible={assetNameModal.isVisible}
        onClose={closeAssetNameModal}
        onConfirm={(name) => {
          if (assetNameModal.onConfirm) {
            assetNameModal.onConfirm(name)
          }
          closeAssetNameModal()
        }}
        defaultName={assetNameModal.defaultName}
        title="Create Combined Asset"
        description="Enter a name for the combined asset template:"
      />
    </div>
  )
}) 