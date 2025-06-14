// Core Type Definitions for Game Engine V2

export interface Asset {
  id: string
  name: string
  type: 'character' | 'background' | 'object' | 'audio'
  blob: Blob          // Original file (FULL QUALITY)
  thumbnail: string   // Base64 thumbnail (for library preview)
  highQualityDataURL?: string  // High-quality data URL (for canvas editing)
  metadata: {
    width: number
    height: number
    fileSize: number
    uploadDate: Date
  }
}

export interface SceneObject {
  id: string
  assetId: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  zIndex: number
  interactions: Interaction[]
  
  // Grouping support
  groupId?: string  // ID of the group this object belongs to
  isGroupParent?: boolean  // Whether this object is the parent/anchor of a group
  
  // Attachment support
  attachedToId?: string  // ID of the object this is attached to
  attachedObjects?: string[]  // IDs of objects attached to this one
  attachmentOffset?: { x: number; y: number }  // Relative position to parent
  
  // Position locking
  locked?: boolean  // Whether this object is locked in place (prevents dragging)
}

export interface Interaction {
  id: string
  type: 'click' | 'hover' | 'collision'
  action: 'navigate' | 'show_text' | 'play_sound' | 'animate'
  target?: string
  parameters?: Record<string, any>
}

export interface Scene {
  id: string
  name: string
  width: number
  height: number
  backgroundColor: string
  objects: SceneObject[]
  groups: ObjectGroup[]  // Add groups to scene
  metadata: {
    createdDate: Date
    lastModified: Date
    version: string
  }
}

export interface Project {
  id: string
  name: string
  scenes: Scene[]
  assets: Asset[]
  metadata: {
    createdDate: Date
    lastModified: Date
    version: string
  }
}

// Store Types
export interface AssetStoreState {
  assets: Asset[]
  isLoading: boolean
  error: string | null
}

export interface SceneStoreState {
  scenes: Scene[]
  currentScene: Scene | null
  selectedObjects: string[]
  clipboard: SceneObject[]
  groups: ObjectGroup[]
  isLoading: boolean
  error: string | null
}

export interface UIStoreState {
  selectedTool: 'select' | 'move' | 'resize' | 'delete' | 'pan'
  showPropertyPanel: boolean
  showAssetLibrary: boolean
  zoom: number
  canvasSize: { width: number; height: number }
  isDragging: boolean
  
  // Viewport/Camera state
  panOffset: { x: number; y: number }
  temporaryTool: string | null
}

// File Upload Types
export interface FileUploadResult {
  success: boolean
  asset?: Asset
  error?: string
}

// Export Types
export interface ExportOptions {
  format: 'html5' | 'zip'
  includeAssets: boolean
  optimize: boolean
}

export interface ObjectGroup {
  id: string
  name: string
  parentObjectId: string  // The main object that others attach to
  childObjectIds: string[]  // Objects that follow the parent
  createdDate: Date
} 