// UI Store - Zustand for UI State, Selections, and Interface Controls
import React from 'react'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { UIStoreState } from '@/types'

// Simple, useful viewport presets
export type ViewportPreset = 
  | 'mobile'             // 360x640 - Mobile phone
  | 'tablet'             // 768x1024 - Tablet
  | 'desktop'            // 1920x1080 - Desktop HD
  | 'wide'               // 1280x720 - Wide screen
  | 'square'             // 800x800 - Square format
  | 'game-mobile'        // 360x640 - Mobile game
  | 'game-desktop'       // 1280x720 - Desktop game
  | 'game-hd'            // 1920x1080 - HD game

export const VIEWPORT_PRESETS: Record<ViewportPreset, { width: number; height: number; label: string; isGame?: boolean }> = {
  'mobile': { width: 360, height: 640, label: '📱 Mobile (360×640)' },
  'tablet': { width: 768, height: 1024, label: '📱 Tablet (768×1024)' },
  'desktop': { width: 1920, height: 1080, label: '💻 Desktop HD (1920×1080)' },
  'wide': { width: 1280, height: 720, label: '📺 Wide Screen (1280×720)' },
  'square': { width: 800, height: 800, label: '⬜ Square (800×800)' },
  'game-mobile': { width: 360, height: 640, label: '🎮 Mobile Game (360×640)', isGame: true },
  'game-desktop': { width: 1280, height: 720, label: '🎮 Desktop Game (1280×720)', isGame: true },
  'game-hd': { width: 1920, height: 1080, label: '🎮 HD Game (1920×1080)', isGame: true }
}

interface UIStoreActions {
  // Tool selection
  setSelectedTool: (tool: UIStoreState['selectedTool']) => void
  
  // Panel visibility
  togglePropertyPanel: () => void
  setPropertyPanelVisible: (visible: boolean) => void
  toggleAssetLibrary: () => void
  setAssetLibraryVisible: (visible: boolean) => void
  
  // Canvas controls
  setZoom: (zoom: number) => void
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
  setCanvasSize: (width: number, height: number) => void
  
  // Viewport/Camera controls
  setPanOffset: (x: number, y: number) => void
  panBy: (deltaX: number, deltaY: number) => void
  resetPan: () => void
  setTemporaryTool: (tool: string | null) => void
  zoomToFit: () => void
  zoomToSelection: () => void
  
  // Viewport controls
  setViewportSize: (preset: ViewportPreset | 'custom', width?: number, height?: number) => void
  
  // Live viewport controls
  setLiveViewport: (enabled: boolean) => void
  setGameServerUrl: (url: string | null) => void
  setGameServerPort: (port: number) => void
  
  // Drag state
  setDragging: (isDragging: boolean) => void
  
  // Grid and snapping
  toggleGrid: () => void
  setGridVisible: (visible: boolean) => void
  toggleSnap: () => void
  setSnapEnabled: (enabled: boolean) => void
  setGridSize: (size: number) => void
  
  // Keyboard shortcuts
  handleKeyDown: (event: KeyboardEvent) => void
  
  // Modal and dialog state
  setModalOpen: (modal: string | null) => void
  setDialogData: (data: any) => void
}

interface ExtendedUIState extends UIStoreState {
  // Additional UI state
  gridVisible: boolean
  snapEnabled: boolean
  gridSize: number
  modalOpen: string | null
  dialogData: any
  
  // Viewport state
  currentViewportPreset: ViewportPreset | 'custom'
  isLiveViewport: boolean
  gameServerUrl: string | null
  gameServerPort: number
}

type UIStore = ExtendedUIState & UIStoreActions

// Helper function to get initial viewport settings
const getInitialViewportSettings = () => {
  // Always return default for SSR to prevent hydration mismatch
  // Client-side preferences will be loaded after hydration
  return {
    currentViewportPreset: 'desktop' as const,
    canvasSize: { width: 1920, height: 1080 },
    isLiveViewport: false
  }
}

// Function to load saved preferences on client side
const loadSavedPreferences = (set: any) => {
  if (typeof window !== 'undefined') {
    try {
      const savedPreset = localStorage.getItem('gameEngine_lastViewportPreset')
      const savedCustomSize = localStorage.getItem('gameEngine_customViewportSize')
      
      if (savedPreset && savedPreset in VIEWPORT_PRESETS) {
        const presetData = VIEWPORT_PRESETS[savedPreset as ViewportPreset]
        set((state: any) => {
          state.currentViewportPreset = savedPreset as ViewportPreset
          state.canvasSize = { width: presetData.width, height: presetData.height }
          state.isLiveViewport = presetData.isGame || false
        })
      } else if (savedPreset === 'custom' && savedCustomSize) {
        const customSize = JSON.parse(savedCustomSize)
        set((state: any) => {
          state.currentViewportPreset = 'custom'
          state.canvasSize = customSize
          state.isLiveViewport = false
        })
      }
    } catch (error) {
      console.warn('Failed to load saved viewport preference:', error)
    }
  }
}

export const useUIStore = create<UIStore>()(
  immer((set, get) => {
    const initialViewport = getInitialViewportSettings()
    
    return {
      // Initial state
      selectedTool: 'select',
      showPropertyPanel: true,
      showAssetLibrary: true,
      zoom: 1,
      canvasSize: initialViewport.canvasSize,
      isDragging: false,
      
      // Viewport/Camera state
      panOffset: { x: 0, y: 0 },
      temporaryTool: null,
      
      // Extended state
      gridVisible: true,
      snapEnabled: true,
      gridSize: 20,
      modalOpen: null,
      dialogData: null,
      currentViewportPreset: initialViewport.currentViewportPreset,
      isLiveViewport: initialViewport.isLiveViewport,
      gameServerUrl: null,
      gameServerPort: 0,

    // Tool selection
    setSelectedTool: (tool: UIStoreState['selectedTool']) => {
      set((state) => {
        state.selectedTool = tool
      })
    },

    // Panel visibility
    togglePropertyPanel: () => {
      set((state) => {
        state.showPropertyPanel = !state.showPropertyPanel
      })
    },

    setPropertyPanelVisible: (visible: boolean) => {
      set((state) => {
        state.showPropertyPanel = visible
      })
    },

    toggleAssetLibrary: () => {
      set((state) => {
        state.showAssetLibrary = !state.showAssetLibrary
      })
    },

    setAssetLibraryVisible: (visible: boolean) => {
      set((state) => {
        state.showAssetLibrary = visible
      })
    },

    // Canvas controls
    setZoom: (zoom: number) => {
      const clampedZoom = Math.max(0.1, Math.min(5, zoom)) // Clamp between 0.1x and 5x
      set((state) => {
        state.zoom = clampedZoom
      })
    },

    zoomIn: () => {
      const currentZoom = get().zoom
      const newZoom = Math.min(5, currentZoom * 1.2)
      set((state) => {
        state.zoom = newZoom
      })
    },

    zoomOut: () => {
      const currentZoom = get().zoom
      const newZoom = Math.max(0.1, currentZoom / 1.2)
      set((state) => {
        state.zoom = newZoom
      })
    },

    resetZoom: () => {
      set((state) => {
        state.zoom = 1
        // Also reset pan to center
        state.panOffset = { x: 0, y: 0 }
      })
    },

    setCanvasSize: (width: number, height: number) => {
      set((state) => {
        state.canvasSize = { width, height }
      })
    },

    // Viewport/Camera controls
    setPanOffset: (x: number, y: number) => {
      set((state) => {
        // Apply same constraints as panBy
        const { canvasSize, zoom } = state
        const maxPan = Math.max(canvasSize.width, canvasSize.height) * zoom
        
        state.panOffset = { 
          x: Math.max(-maxPan, Math.min(maxPan, x)), 
          y: Math.max(-maxPan, Math.min(maxPan, y)) 
        }
      })
    },

    panBy: (deltaX: number, deltaY: number) => {
      set((state) => {
        const newX = state.panOffset.x + deltaX
        const newY = state.panOffset.y + deltaY
        
        // Apply some reasonable constraints to prevent going too far out
        const { canvasSize, zoom } = state
        const maxPan = Math.max(canvasSize.width, canvasSize.height) * zoom
        
        state.panOffset.x = Math.max(-maxPan, Math.min(maxPan, newX))
        state.panOffset.y = Math.max(-maxPan, Math.min(maxPan, newY))
      })
    },

    resetPan: () => {
      set((state) => {
        state.panOffset = { x: 0, y: 0 }
      })
    },

    setTemporaryTool: (tool: string | null) => {
      set((state) => {
        state.temporaryTool = tool
      })
    },

    zoomToFit: () => {
      // Import scene store dynamically to avoid circular dependency
      if (typeof window !== 'undefined') {
        import('@/stores/sceneStore').then(({ useSceneStore }) => {
          const sceneStore = useSceneStore.getState()
          const objects = sceneStore.currentScene?.objects || []
          const { canvasSize } = get()
          
          if (objects.length === 0) {
            // No objects, just reset
            set((state) => {
              state.zoom = 1
              state.panOffset = { x: 0, y: 0 }
            })
            return
          }
          
          // Calculate bounding box of all objects
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
          
          objects.forEach(obj => {
            minX = Math.min(minX, obj.x)
            minY = Math.min(minY, obj.y)
            maxX = Math.max(maxX, obj.x + obj.width)
            maxY = Math.max(maxY, obj.y + obj.height)
          })
          
          const objectsWidth = maxX - minX
          const objectsHeight = maxY - minY
          const objectsCenterX = minX + objectsWidth / 2
          const objectsCenterY = minY + objectsHeight / 2
          
          // Calculate zoom to fit with some padding
          const padding = 50
          const zoomX = (canvasSize.width - padding * 2) / objectsWidth
          const zoomY = (canvasSize.height - padding * 2) / objectsHeight
          const newZoom = Math.min(zoomX, zoomY, 2) // Cap at 2x zoom
          
          // Calculate pan to center the objects
          const canvasCenterX = canvasSize.width / 2
          const canvasCenterY = canvasSize.height / 2
          const panX = canvasCenterX - objectsCenterX * newZoom
          const panY = canvasCenterY - objectsCenterY * newZoom
          
          set((state) => {
            state.zoom = newZoom
            state.panOffset = { x: panX, y: panY }
          })
        })
      }
    },

    zoomToSelection: () => {
      // This will be implemented to zoom to selected objects
      // For now, just zoom in a bit
      const currentZoom = get().zoom
      const newZoom = Math.min(5, currentZoom * 1.5)
      set((state) => {
        state.zoom = newZoom
      })
    },

    // Viewport controls
    setViewportSize: (preset: ViewportPreset | 'custom', width?: number, height?: number) => {
      let newWidth: number, newHeight: number
      
      set((state) => {
        if (preset === 'custom' && width && height) {
          state.canvasSize = { width, height }
          state.currentViewportPreset = 'custom'
          state.isLiveViewport = false
          newWidth = width
          newHeight = height
        } else if (preset !== 'custom') {
          const presetData = VIEWPORT_PRESETS[preset]
          state.canvasSize = { width: presetData.width, height: presetData.height }
          state.currentViewportPreset = preset
          state.isLiveViewport = presetData.isGame || false
          newWidth = presetData.width
          newHeight = presetData.height
          
          // Set default game server URL for game viewports
          if (presetData.isGame && !state.gameServerUrl) {
            state.gameServerUrl = 'http://localhost:3001'
            state.gameServerPort = 3001
          }
        }
        
        // Save viewport preference to localStorage (only in browser)
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('gameEngine_lastViewportPreset', preset)
            if (preset === 'custom' && width && height) {
              localStorage.setItem('gameEngine_customViewportSize', JSON.stringify({ width, height }))
            }
          } catch (error) {
            console.warn('Failed to save viewport preference:', error)
          }
        }
      })
      
      // Sync current scene dimensions with viewport (if there's a scene loaded)
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          try {
            // Import scene store dynamically to avoid circular dependency
            import('@/stores/sceneStore').then(({ useSceneStore }) => {
              const sceneStore = useSceneStore.getState()
              if (sceneStore.currentScene && newWidth && newHeight) {
                sceneStore.updateScene(sceneStore.currentScene.id, {
                  width: newWidth,
                  height: newHeight
                }).catch(error => {
                  console.warn('Failed to sync scene dimensions with viewport:', error)
                })
              }
            })
          } catch (error) {
            console.warn('Failed to sync scene dimensions:', error)
          }
        }, 0)
      }
    },

    // Live viewport controls
    setLiveViewport: (enabled: boolean) => {
      set((state) => {
        state.isLiveViewport = enabled
      })
    },

    setGameServerUrl: (url: string | null) => {
      set((state) => {
        state.gameServerUrl = url
      })
    },

    setGameServerPort: (port: number) => {
      set((state) => {
        state.gameServerPort = port
      })
    },

    // Drag state
    setDragging: (isDragging: boolean) => {
      set((state) => {
        state.isDragging = isDragging
      })
    },

    // Grid and snapping
    toggleGrid: () => {
      set((state) => {
        state.gridVisible = !state.gridVisible
      })
    },

    setGridVisible: (visible: boolean) => {
      set((state) => {
        state.gridVisible = visible
      })
    },

    toggleSnap: () => {
      set((state) => {
        state.snapEnabled = !state.snapEnabled
      })
    },

    setSnapEnabled: (enabled: boolean) => {
      set((state) => {
        state.snapEnabled = enabled
      })
    },

    setGridSize: (size: number) => {
      const clampedSize = Math.max(5, Math.min(100, size)) // Clamp between 5 and 100
      set((state) => {
        state.gridSize = clampedSize
      })
    },

    // Keyboard shortcuts
    handleKeyDown: (event: KeyboardEvent) => {
      const { selectedTool } = get()

      // Prevent default for our shortcuts
      const shortcuts = ['v', 'm', 'r', 'd', 'Escape', ' ', '+', '-', '=']
      if (shortcuts.includes(event.key) || event.metaKey || event.ctrlKey) {
        // Tool shortcuts
        switch (event.key.toLowerCase()) {
          case 'v':
            if (!event.metaKey && !event.ctrlKey) {
              event.preventDefault()
              get().setSelectedTool('select')
            }
            break
          case 'm':
            if (!event.metaKey && !event.ctrlKey) {
              event.preventDefault()
              get().setSelectedTool('move')
            }
            break
          case 'r':
            if (!event.metaKey && !event.ctrlKey) {
              event.preventDefault()
              get().setSelectedTool('resize')
            }
            break
          case 'd':
            if (!event.metaKey && !event.ctrlKey) {
              event.preventDefault()
              get().setSelectedTool('delete')
            }
            break
          case 'escape':
            event.preventDefault()
            get().setSelectedTool('select')
            break
          case ' ':
            // Spacebar for hand tool (temporary)
            if (!event.repeat) {
              event.preventDefault()
              get().setTemporaryTool('pan')
            }
            break
          case '+':
          case '=':
            if (event.metaKey || event.ctrlKey) {
              event.preventDefault()
              get().zoomIn()
            }
            break
          case '-':
            if (event.metaKey || event.ctrlKey) {
              event.preventDefault()
              get().zoomOut()
            }
            break
          case '0':
            if (event.metaKey || event.ctrlKey) {
              event.preventDefault()
              get().resetZoom()
            }
            break
          case 'g':
            if (!event.metaKey && !event.ctrlKey) {
              event.preventDefault()
              get().toggleGrid()
            }
            break
          case 'h':
            if (!event.metaKey && !event.ctrlKey) {
              event.preventDefault()
              get().setSelectedTool('pan')
            }
            break
        }

        // Panel shortcuts
        if (event.metaKey || event.ctrlKey) {
          switch (event.key.toLowerCase()) {
            case '1':
              event.preventDefault()
              get().toggleAssetLibrary()
              break
            case '2':
              event.preventDefault()
              get().togglePropertyPanel()
              break
          }
        }
      }
    },

    // Modal and dialog state
    setModalOpen: (modal: string | null) => {
      set((state) => {
        state.modalOpen = modal
      })
    },

    setDialogData: (data: any) => {
      set((state) => {
        state.dialogData = data
      })
    }
  }})
)

// Selectors for easier access
export const uiSelectors = {
  // Get tool state
  useSelectedTool: () => useUIStore(state => state.selectedTool),
  
  // Get panel visibility
  usePropertyPanelVisible: () => useUIStore(state => state.showPropertyPanel),
  useAssetLibraryVisible: () => useUIStore(state => state.showAssetLibrary),
  
  // Get canvas state
  useZoom: () => useUIStore(state => state.zoom),
  useCanvasSize: () => useUIStore(state => state.canvasSize),
  useIsDragging: () => useUIStore(state => state.isDragging),
  
  // Get viewport/camera state
  usePanOffset: () => useUIStore(state => state.panOffset),
  useTemporaryTool: () => useUIStore(state => state.temporaryTool),
  
  // Get viewport state
  useCurrentViewportPreset: () => useUIStore(state => state.currentViewportPreset),
  useIsLiveViewport: () => useUIStore(state => state.isLiveViewport),
  useGameServerUrl: () => useUIStore(state => state.gameServerUrl),
  useGameServerPort: () => useUIStore(state => state.gameServerPort),
  
  // Get grid state
  useGridVisible: () => useUIStore(state => state.gridVisible),
  useSnapEnabled: () => useUIStore(state => state.snapEnabled),
  useGridSize: () => useUIStore(state => state.gridSize),
  
  // Get modal state
  useModalOpen: () => useUIStore(state => state.modalOpen),
  useDialogData: () => useUIStore(state => state.dialogData),
  
  // Get formatted zoom percentage
  useZoomPercentage: () => useUIStore(state => Math.round(state.zoom * 100))
}

// Hook to load saved preferences on client side
export const useLoadSavedPreferences = () => {
  React.useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      const set = useUIStore.setState
      loadSavedPreferences(set)
    }
  }, [])
}

// Keyboard shortcut hook
export const useKeyboardShortcuts = () => {
  const handleKeyDown = useUIStore(state => state.handleKeyDown)
  
  // Set up keyboard event listener
  React.useEffect(() => {
    const listener = (event: KeyboardEvent) => handleKeyDown(event)
    document.addEventListener('keydown', listener)
    return () => document.removeEventListener('keydown', listener)
  }, [handleKeyDown])
}

// Helper functions
export const snapToGrid = (value: number, gridSize: number, snapEnabled: boolean): number => {
  if (!snapEnabled) return value
  return Math.round(value / gridSize) * gridSize
}

export const getToolCursor = (tool: UIStoreState['selectedTool']): string => {
  switch (tool) {
    case 'select': return 'default'
    case 'move': return 'move'
    case 'resize': return 'nw-resize'
    case 'delete': return 'crosshair'
    case 'pan': return 'grab'
    default: return 'default'
  }
} 