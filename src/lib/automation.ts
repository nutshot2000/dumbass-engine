// Automation API for AI/Cursor control
// This allows external tools to programmatically control the game engine

import { 
  AnimationManager, 
  Animation, 
  ViewportEffect, 
  AnimationSequence,
  animationTemplates,
  viewportEffects
} from './animations'

export interface AutomationAPI {
  // Asset management
  uploadAsset: (file: File) => Promise<string>
  renameAsset: (assetId: string, newName: string) => Promise<void>
  deleteAsset: (assetId: string) => Promise<void>
  
  // Scene manipulation
  addObjectToScene: (assetId: string, x: number, y: number) => Promise<string>
  moveObject: (objectId: string, x: number, y: number) => Promise<void>
  resizeObject: (objectId: string, width: number, height: number) => Promise<void>
  deleteObject: (objectId: string) => Promise<void>
  
  // Viewport control
  setViewport: (preset: string) => Promise<void>
  setCustomViewport: (width: number, height: number) => Promise<void>
  
  // Scene management
  createScene: (name: string) => Promise<string>
  saveScene: () => Promise<void>
  exportScene: () => Promise<Blob>
  
  // Bulk operations
  createMeme: (config: MemeConfig) => Promise<string>
  batchProcess: (operations: Operation[]) => Promise<void>
  
  // 🎬 Animation Control
  animations: {
    // Start a single animation
    animate: (animation: Animation) => string
    
    // Stop animation by ID
    stop: (animationId: string) => void
    
    // Stop all animations for an object
    stopObject: (objectId: string) => void
    
    // Run animation sequence
    sequence: (sequence: AnimationSequence) => Promise<void>
    
    // Pre-built animation templates
    templates: {
      slideInLeft: (objectId: string, targetX: number, targetY: number) => string
      bounce: (objectId: string) => string
      shake: (objectId: string) => string
      pulse: (objectId: string) => string
      spin: (objectId: string) => string
      fadeIn: (objectId: string) => string
      moveToPosition: (objectId: string, x: number, y: number, duration?: number) => string
      scaleToSize: (objectId: string, width: number, height: number, duration?: number) => string
      rotateTo: (objectId: string, degrees: number, duration?: number) => string
    }
    
    // Viewport effects
    viewport: {
      shake: (intensity?: number, duration?: number) => void
      flash: (color?: string, duration?: number) => void
      zoom: (direction: 'in' | 'out', intensity?: number, duration?: number) => void
    }
  }
}

export interface MemeConfig {
  template: 'tiktok' | 'instagram' | 'youtube'
  background?: string
  characters: Array<{
    assetId: string
    x: number
    y: number
    scale?: number
  }>
  text?: Array<{
    content: string
    x: number
    y: number
    style?: TextStyle
  }>
}

export interface Operation {
  type: 'upload' | 'move' | 'resize' | 'delete' | 'create'
  params: Record<string, any>
}

export interface TextStyle {
  fontSize: number
  color: string
  fontFamily: string
  bold?: boolean
}

// Global automation API - accessible from browser console or external scripts
declare global {
  interface Window {
    gameEngineAPI: AutomationAPI
  }
}

// Initialize animation manager
let animationManager: AnimationManager | null = null

function initializeAnimationManager() {
  if (typeof window === 'undefined') return null
  
  // TEMPORARILY DISABLED - Animation system causing performance issues
  console.log('🎬 Animation system temporarily disabled for performance')
  return null
  
  const updateCallback = (objectId: string, updates: any) => {
    const sceneStore = (window as any).sceneStore
    if (sceneStore?.updateSceneObject) {
      sceneStore.updateSceneObject(objectId, updates)
    }
  }

  const viewportCallback = (effect: ViewportEffect) => {
    // Trigger viewport effect through DOM manipulation
    const canvas = document.querySelector('[data-testid="scene-canvas"]') as HTMLElement
    if (!canvas) return

    console.log(`🎭 Applying viewport effect: ${effect.type}`)
    
    switch (effect.type) {
      case 'shake':
        const originalTransform = canvas.style.transform
        const shakeInterval = setInterval(() => {
          const intensity = effect.intensity || 10
          const offsetX = (Math.random() - 0.5) * intensity * 2
          const offsetY = (Math.random() - 0.5) * intensity * 2
          canvas.style.transform = `${originalTransform} translate(${offsetX}px, ${offsetY}px)`
        }, 16)

        setTimeout(() => {
          clearInterval(shakeInterval)
          canvas.style.transform = originalTransform
        }, effect.duration)
        break

      case 'flash':
        const flashOverlay = document.createElement('div')
        flashOverlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: ${effect.color || 'white'};
          opacity: 0.8;
          pointer-events: none;
          z-index: 9999;
          animation: flash-effect ${effect.duration}ms ease-out;
        `
        
        const style = document.createElement('style')
        style.textContent = `
          @keyframes flash-effect {
            0% { opacity: 0.8; }
            50% { opacity: 0.9; }
            100% { opacity: 0; }
          }
        `
        document.head.appendChild(style)
        document.body.appendChild(flashOverlay)

        setTimeout(() => {
          document.body.removeChild(flashOverlay)
          document.head.removeChild(style)
        }, effect.duration)
        break

      case 'zoom':
        const originalTransformZoom = canvas.style.transform
        const targetScale = effect.direction === 'in' 
          ? (effect.intensity || 1.2)
          : 1 / (effect.intensity || 1.2)
        
        canvas.style.transition = `transform ${effect.duration}ms ease-out`
        canvas.style.transform = `${originalTransformZoom} scale(${targetScale})`
        
        setTimeout(() => {
          canvas.style.transform = originalTransformZoom
          setTimeout(() => {
            canvas.style.transition = ''
          }, 200)
        }, effect.duration)
        break
    }
  }

  animationManager = new AnimationManager(updateCallback, viewportCallback)
  return animationManager
}

// Implementation will be injected by the main app
export function createAutomationAPI(stores: any): AutomationAPI {
  const { assetStore, sceneStore, uiStore } = stores
  
  // Initialize animation manager if not already done
  if (!animationManager) {
    animationManager = initializeAnimationManager()
  }

  const api: AutomationAPI = {
    // Asset management
    uploadAsset: async (file: File) => {
      const result = await assetStore.uploadFiles([file])
      return result.uploaded > 0 ? 'success' : 'failed'
    },
    
    renameAsset: async (assetId: string, newName: string) => {
      await assetStore.updateAsset(assetId, { name: newName })
    },
    
    deleteAsset: async (assetId: string) => {
      await assetStore.deleteAsset(assetId)
    },
    
    // Scene manipulation
    addObjectToScene: async (assetId: string, x: number, y: number) => {
      const objectId = await sceneStore.addObjectToScene({
        assetId,
        x,
        y,
        width: 200,
        height: 200,
        rotation: 0
      })
      return objectId
    },
    
    moveObject: async (objectId: string, x: number, y: number) => {
      await sceneStore.updateSceneObject(objectId, { x, y })
    },
    
    resizeObject: async (objectId: string, width: number, height: number) => {
      await sceneStore.updateSceneObject(objectId, { width, height })
    },
    
    deleteObject: async (objectId: string) => {
      await sceneStore.deleteSceneObject(objectId)
    },
    
    // Viewport control
    setViewport: async (preset: string) => {
      uiStore.setViewportSize(preset as any)
    },
    
    setCustomViewport: async (width: number, height: number) => {
      uiStore.setViewportSize('custom', width, height)
    },
    
    // Scene management
    createScene: async (name: string) => {
      return await sceneStore.createNewScene(name)
    },
    
    saveScene: async () => {
      await sceneStore.saveCurrentScene()
    },
    
    exportScene: async () => {
      // Implementation for exporting scene as image/video
      return new Blob(['exported scene'], { type: 'application/json' })
    },
    
    // Bulk operations
    createMeme: async (config: MemeConfig) => {
      // Set viewport based on template
      const viewportMap = {
        tiktok: 'tiktok',
        instagram: 'instagram-post',
        youtube: 'youtube-video'
      }
      
      await uiStore.setViewportSize(viewportMap[config.template] as any)
      
      // Add background if specified
      if (config.background) {
        await sceneStore.addObjectToScene({
          assetId: config.background,
          x: 0,
          y: 0,
          width: uiStore.canvasSize.width,
          height: uiStore.canvasSize.height,
          rotation: 0
        })
      }
      
      // Add characters
      for (const char of config.characters) {
        await sceneStore.addObjectToScene({
          assetId: char.assetId,
          x: char.x,
          y: char.y,
          width: 200 * (char.scale || 1),
          height: 200 * (char.scale || 1),
          rotation: 0
        })
      }
      
      return 'meme-created'
    },
    
    batchProcess: async (operations: Operation[]) => {
      for (const op of operations) {
        switch (op.type) {
          case 'upload':
            await assetStore.uploadFiles([op.params.file])
            break
          case 'move':
            await sceneStore.updateSceneObject(op.params.objectId, {
              x: op.params.x,
              y: op.params.y
            })
            break
          // Add more operation types as needed
        }
      }
    },
    
    // 🎬 Animation Control
    animations: {
      animate: (animation: Animation): string => {
        console.log('🎬 Animation system temporarily disabled')
        return 'disabled'
      },

      stop: (animationId: string): void => {
        console.log('🎬 Animation system temporarily disabled')
      },

      stopObject: (objectId: string): void => {
        console.log('🎬 Animation system temporarily disabled')
      },

      sequence: async (sequence: AnimationSequence): Promise<void> => {
        console.log('🎬 Animation system temporarily disabled')
      },

      templates: {
        slideInLeft: (objectId: string, targetX: number, targetY: number): string => {
          const animation = animationTemplates.slideInLeft(objectId, targetX, targetY)
          return api.animations.animate(animation)
        },

        bounce: (objectId: string): string => {
          const animation = animationTemplates.bounce(objectId)
          return api.animations.animate(animation)
        },

        shake: (objectId: string): string => {
          const animation = animationTemplates.shake(objectId)
          return api.animations.animate(animation)
        },

                 pulse: (objectId: string): string => {
           // Get object from scene store directly
           const objects = sceneStore.getState().objects || []
           const obj = objects.find((o: any) => o.id === objectId)
           if (!obj) return ''
           const animation = animationTemplates.pulse(objectId, obj.width, obj.height)
           return api.animations.animate(animation)
         },

         spin: (objectId: string): string => {
           const animation = animationTemplates.spin(objectId)
           return api.animations.animate(animation)
         },

         fadeIn: (objectId: string): string => {
           const animation = animationTemplates.fadeIn(objectId)
           return api.animations.animate(animation)
         },

         moveToPosition: (objectId: string, x: number, y: number, duration = 1000): string => {
           const objects = sceneStore.getState().objects || []
           const obj = objects.find((o: any) => o.id === objectId)
           if (!obj) return ''
           
           const animation: Animation = {
             type: 'move',
             objectId,
             duration,
             easing: 'ease-out',
             from: { x: obj.x, y: obj.y },
             to: { x, y }
           }
           return api.animations.animate(animation)
         },

         scaleToSize: (objectId: string, width: number, height: number, duration = 800): string => {
           const objects = sceneStore.getState().objects || []
           const obj = objects.find((o: any) => o.id === objectId)
           if (!obj) return ''
           
           const animation: Animation = {
             type: 'scale',
             objectId,
             duration,
             easing: 'ease-out',
             from: { width: obj.width, height: obj.height },
             to: { width, height }
           }
           return api.animations.animate(animation)
         },

         rotateTo: (objectId: string, degrees: number, duration = 600): string => {
           const objects = sceneStore.getState().objects || []
           const obj = objects.find((o: any) => o.id === objectId)
           if (!obj) return ''
           
           const animation: Animation = {
             type: 'rotate',
             objectId,
             duration,
             easing: 'ease-out',
             from: obj.rotation || 0,
             to: degrees
           }
           return api.animations.animate(animation)
         }
      },

      viewport: {
        shake: (intensity = 15, duration = 300): void => {
          console.log('🎬 Animation system temporarily disabled')
        },

        flash: (color = 'white', duration = 200): void => {
          console.log('🎬 Animation system temporarily disabled')
        },

        zoom: (direction: 'in' | 'out', intensity = 1.2, duration = 500): void => {
          console.log('🎬 Animation system temporarily disabled')
        }
      }
    }
  }
  
  return api
} 