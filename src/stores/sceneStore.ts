// Scene Store - Zustand with Immer for Scene Objects and State
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { Scene, SceneObject, SceneStoreState, ObjectGroup } from '@/types'
import { dbOperations } from '@/lib/database'
import { generateId } from '@/lib/fileUtils'
import { produce } from 'immer'

interface SceneStoreActions {
  // Scene loading and management
  loadScenes: () => Promise<void>
  setCurrentScene: (scene: Scene | null) => void
  createNewScene: (name: string, width?: number, height?: number) => Promise<Scene>
  updateScene: (id: string, updates: Partial<Scene>) => Promise<void>
  deleteScene: (id: string) => Promise<void>
  duplicateScene: (id: string) => Promise<Scene | null>
  
  // Scene object management
  addObjectToScene: (sceneObject: Omit<SceneObject, 'id'>) => void
  updateSceneObject: (objectId: string, updates: Partial<SceneObject>) => void
  deleteSceneObject: (objectId: string) => void
  duplicateSceneObject: (objectId: string) => void
  clearScene: () => void
  
  // Selection and clipboard
  selectObjects: (objectIds: string[]) => void
  selectObject: (objectId: string) => void
  clearSelection: () => void
  copySelected: () => void
  pasteObjects: (x?: number, y?: number) => void
  
  // Layer management
  bringToFront: (objectId: string) => void
  sendToBack: (objectId: string) => void
  moveUp: (objectId: string) => void
  moveDown: (objectId: string) => void
  
  // Grouping system
  createGroup: (objectIds: string[], groupName?: string) => void
  ungroupObjects: (groupId: string) => void
  getObjectGroup: (objectId: string) => ObjectGroup | null
  
  // Position locking
  toggleObjectLock: (objectId: string) => void
  lockObjects: (objectIds: string[]) => void
  unlockObjects: (objectIds: string[]) => void
  snapObjectToPosition: (objectId: string, x?: number, y?: number) => void
  
  // Utility
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  getObjectById: (objectId: string) => SceneObject | undefined
}

type SceneStore = SceneStoreState & SceneStoreActions

export const useSceneStore = create<SceneStore>()(
  immer((set, get) => ({
    // Initial state
    currentScene: null,
    scenes: [],
    selectedObjects: [],
    clipboard: [],
    groups: [],
    isLoading: false,
    error: null,

    // Scene loading and management
    loadScenes: async () => {
      set({ isLoading: true })
      try {
        const scenes = await dbOperations.getAllScenes()
        console.log('Loaded scenes:', scenes.length)
        
        set(
          produce((state) => {
            state.scenes = scenes.map(scene => {
              // Handle migration from old scene format to new format
              const migratedScene: Scene = {
                id: scene.id,
                name: scene.name,
                width: scene.width || (scene.metadata as any)?.width || 1920,
                height: scene.height || (scene.metadata as any)?.height || 1080,
                backgroundColor: scene.backgroundColor || '#ffffff',
                objects: scene.objects || [],
                groups: scene.groups || [],
                metadata: {
                  createdDate: scene.metadata?.createdDate || new Date(),
                  lastModified: scene.metadata?.lastModified || new Date(),
                  version: scene.metadata?.version || '1.0'
                }
              }
              console.log(`🔄 Migrated scene "${scene.name}":`, migratedScene)
              return migratedScene
            })
            state.isLoading = false
            state.error = null
            
            // Auto-select first scene if none selected
            if (state.scenes.length > 0 && !state.currentScene) {
              state.currentScene = state.scenes[0]
              state.groups = state.scenes[0].groups || []
              console.log(`📂 Auto-selected scene "${state.scenes[0].name}" with ${state.groups.length} groups`)
            }
          })
        )
      } catch (error) {
        console.error('Failed to load scenes:', error)
        set({ isLoading: false, error: 'Failed to load scenes' })
      }
    },

    setCurrentScene: (scene: Scene | null) => {
      set(
        produce((state) => {
          if (scene) {
            // Create a new scene object with updated metadata to avoid read-only issues
            const updatedScene = {
              ...scene,
              metadata: {
                ...scene.metadata,
                lastModified: new Date()
              }
            }
            state.currentScene = updatedScene
            
            // Load groups from the scene
            state.groups = scene.groups || []
            console.log(`📂 Loaded ${state.groups.length} groups for scene "${scene.name}"`)
          } else {
            state.currentScene = null
            state.groups = []
          }
          state.selectedObjects = []
        })
      )
      
      // Save the last accessed time to database
      if (scene) {
        setTimeout(() => {
          dbOperations.updateScene(scene.id, {
            metadata: {
              ...scene.metadata,
              lastModified: new Date()
            }
          }).catch(error => {
            console.error('Failed to update last accessed time:', error)
          })
        }, 0)
      }
    },

    createNewScene: async (name: string, width: number = 1920, height: number = 1080): Promise<Scene> => {
      const newScene: Scene = {
        id: generateId(),
        name,
        width,
        height,
        backgroundColor: '#ffffff',
        objects: [],
        groups: [],  // Initialize empty groups array
        metadata: {
          createdDate: new Date(),
          lastModified: new Date(),
          version: '1.0'
        }
      }

      try {
        await dbOperations.addScene(newScene)
        
        set(
          produce((state) => {
            state.scenes.unshift(newScene)
            state.currentScene = newScene
            state.groups = []  // Reset groups for new scene
          })
        )
        
        return newScene
      } catch (error) {
        console.error('Failed to create scene:', error)
        throw new Error('Failed to create scene')
      }
    },

    updateScene: async (id: string, updates: Partial<Scene>) => {
      try {
        await dbOperations.updateScene(id, updates)
        set((state) => {
          // Update in scenes array
          const sceneIndex = state.scenes.findIndex(s => s.id === id)
          if (sceneIndex !== -1) {
            state.scenes[sceneIndex] = { ...state.scenes[sceneIndex], ...updates }
          }
          
          // Update current scene if it's the one being updated
          if (state.currentScene?.id === id) {
            state.currentScene = { ...state.currentScene, ...updates }
          }
        })
      } catch (error) {
        console.error('Failed to update scene:', error)
        set((state) => {
          state.error = 'Failed to update scene'
        })
        throw error
      }
    },

    deleteScene: async (id: string) => {
      try {
        await dbOperations.deleteScene(id)
        set((state) => {
          state.scenes = state.scenes.filter(s => s.id !== id)
          if (state.currentScene?.id === id) {
            state.currentScene = state.scenes[0] || null
          }
        })
      } catch (error) {
        console.error('Failed to delete scene:', error)
        set((state) => {
          state.error = 'Failed to delete scene'
        })
        throw error
      }
    },

    duplicateScene: async (id: string) => {
      const originalScene = get().scenes.find(s => s.id === id)
      if (!originalScene) return null

      const duplicatedScene: Scene = {
        ...originalScene,
        id: generateId(),
        name: `${originalScene.name} (Copy)`,
        objects: originalScene.objects.map(obj => ({
          ...obj,
          id: generateId()
        })),
        metadata: {
          ...originalScene.metadata,
          createdDate: new Date(),
          lastModified: new Date()
        }
      }

      try {
        await dbOperations.addScene(duplicatedScene)
        set((state) => {
          state.scenes.unshift(duplicatedScene)
        })
        return duplicatedScene
      } catch (error) {
        console.error('Failed to duplicate scene:', error)
        set((state) => {
          state.error = 'Failed to duplicate scene'
        })
        return null
      }
    },

    // Scene object management
    addObjectToScene: (sceneObject: Omit<SceneObject, 'id'>) => {
      const currentScene = get().currentScene
      if (!currentScene) return

      const newObject: SceneObject = {
        ...sceneObject,
        id: generateId()
      }

      // Update state first
      set(
        produce((state) => {
          if (state.currentScene) {
            state.currentScene.objects.push(newObject)
          }
        })
      )

      // Then save to database asynchronously (serialize to break proxy references)
      setTimeout(() => {
        const currentScene = get().currentScene
        if (currentScene) {
          // Serialize and deserialize to break proxy references
          const serializedScene = JSON.parse(JSON.stringify(currentScene))
          dbOperations.updateScene(currentScene.id, serializedScene).catch(error => {
            console.error('Failed to save scene after adding object:', error)
          })
        }
      }, 0)
    },

    updateSceneObject: (objectId: string, updates: Partial<SceneObject>) => {
      set(
        produce((state) => {
          if (!state.currentScene) return

          const objectIndex = state.currentScene.objects.findIndex((obj: SceneObject) => obj.id === objectId)
          if (objectIndex >= 0) {
            // Preserve existing group information when updating
            const existingObject = state.currentScene.objects[objectIndex]
            const preservedGroupInfo = {
              groupId: existingObject.groupId,
              isGroupParent: existingObject.isGroupParent
            }
            
            // Apply updates while preserving group info
            Object.assign(state.currentScene.objects[objectIndex], updates)
            
            // Ensure group information is preserved (don't let updates override it)
            if (preservedGroupInfo.groupId) {
              state.currentScene.objects[objectIndex].groupId = preservedGroupInfo.groupId
              state.currentScene.objects[objectIndex].isGroupParent = preservedGroupInfo.isGroupParent
            }
            
            console.log(`📝 Updated object ${objectId}:`, state.currentScene.objects[objectIndex])
          }
        })
      )

      // Auto-save to database
      setTimeout(() => {
        const currentScene = get().currentScene
        if (currentScene) {
          const serializedScene = JSON.parse(JSON.stringify(currentScene))
          dbOperations.updateScene(currentScene.id, serializedScene).catch(error => {
            console.error('Failed to save scene after updating object:', error)
          })
        }
      }, 0)
    },

    deleteSceneObject: (objectId: string) => {
      // Update state first
      set(
        produce((state) => {
          if (!state.currentScene) return
          
          // Remove from scene objects
          state.currentScene.objects = state.currentScene.objects.filter(obj => obj.id !== objectId)
          
          // Remove from selection if selected
          state.selectedObjects = state.selectedObjects.filter(id => id !== objectId)
        })
      )

      // Then save to database asynchronously (serialize to break proxy references)
      setTimeout(() => {
        const currentScene = get().currentScene
        if (currentScene) {
          // Serialize and deserialize to break proxy references
          const serializedScene = JSON.parse(JSON.stringify(currentScene))
          dbOperations.updateScene(currentScene.id, serializedScene).catch(error => {
            console.error('Failed to save scene after deleting object:', error)
          })
        }
      }, 0)
    },

    duplicateSceneObject: (objectId: string) => {
      const currentScene = get().currentScene
      if (!currentScene) return

      const originalObject = currentScene.objects.find(obj => obj.id === objectId)
      if (!originalObject) return

      const duplicatedObject: SceneObject = {
        ...originalObject,
        id: generateId(),
        x: originalObject.x + 20, // Offset slightly
        y: originalObject.y + 20
      }

      // Update state first
      set(
        produce((state) => {
          if (state.currentScene) {
            state.currentScene.objects.push(duplicatedObject)
          }
        })
      )

      // Then save to database asynchronously (serialize to break proxy references)
      setTimeout(() => {
        const currentScene = get().currentScene
        if (currentScene) {
          // Serialize and deserialize to break proxy references
          const serializedScene = JSON.parse(JSON.stringify(currentScene))
          dbOperations.updateScene(currentScene.id, serializedScene).catch(error => {
            console.error('Failed to save scene after duplicating object:', error)
          })
        }
      }, 0)
    },

    clearScene: () => {
      // Update state first
      set(
        produce((state) => {
          if (!state.currentScene) return
          
          // Clear all objects from the scene
          state.currentScene.objects = []
          
          // Clear all groups
          state.currentScene.groups = []
          state.groups = []
          
          // Clear selection
          state.selectedObjects = []
          
          console.log(`🗑️ Cleared all objects from scene "${state.currentScene.name}"`)
        })
      )

      // Then save to database asynchronously (serialize to break proxy references)
      setTimeout(() => {
        const currentScene = get().currentScene
        if (currentScene) {
          // Serialize and deserialize to break proxy references
          const serializedScene = JSON.parse(JSON.stringify(currentScene))
          dbOperations.updateScene(currentScene.id, serializedScene).catch(error => {
            console.error('Failed to save scene after clearing:', error)
          })
        }
      }, 0)
    },

    // Selection and clipboard
    selectObjects: (objectIds: string[]) => {
      set(
        produce((state) => {
          state.selectedObjects = objectIds
        })
      )
    },

    selectObject: (objectId: string) => {
      set(
        produce((state) => {
          state.selectedObjects = [objectId]
        })
      )
    },

    clearSelection: () => {
      set(
        produce((state) => {
          state.selectedObjects = []
        })
      )
    },

    copySelected: () => {
      const { currentScene, selectedObjects } = get()
      if (!currentScene || selectedObjects.length === 0) return

      const objectsToCopy = currentScene.objects.filter(obj => 
        selectedObjects.includes(obj.id)
      )

      set(
        produce((state) => {
          state.clipboard = objectsToCopy
        })
      )
    },

    pasteObjects: (x = 0, y = 0) => {
      const { clipboard } = get()
      if (clipboard.length === 0) return

      const pastedObjects = clipboard.map(obj => ({
        ...obj,
        id: generateId(),
        x: obj.x + x + 20, // Offset from original position
        y: obj.y + y + 20
      }))

      // Update state first
      set(
        produce((state) => {
          if (state.currentScene) {
            state.currentScene.objects.push(...pastedObjects)
            state.selectedObjects = pastedObjects.map(obj => obj.id)
          }
        })
      )

      // Then save to database asynchronously (serialize to break proxy references)
      setTimeout(() => {
        const currentScene = get().currentScene
        if (currentScene) {
          // Serialize and deserialize to break proxy references
          const serializedScene = JSON.parse(JSON.stringify(currentScene))
          dbOperations.updateScene(currentScene.id, serializedScene).catch(error => {
            console.error('Failed to save scene after pasting objects:', error)
          })
        }
      }, 0)
    },

    // Layer management
    bringToFront: (objectId: string) => {
      // Update state first
      set(
        produce((state) => {
          if (state.currentScene) {
            const objects = state.currentScene.objects
            if (objects.length === 0) return
            
            const maxZIndex = Math.max(...objects.map(obj => obj.zIndex))
            const objectIndex = objects.findIndex(obj => obj.id === objectId)
            
            if (objectIndex !== -1) {
              objects[objectIndex].zIndex = maxZIndex + 1
              console.log(`⬆️ Brought object ${objectId} to front with zIndex ${maxZIndex + 1}`)
            }
          }
        })
      )

      // Then save to database asynchronously (serialize to break proxy references)
      setTimeout(() => {
        const currentScene = get().currentScene
        if (currentScene) {
          // Serialize and deserialize to break proxy references
          const serializedScene = JSON.parse(JSON.stringify(currentScene))
          dbOperations.updateScene(currentScene.id, serializedScene).catch(error => {
            console.error('Failed to save scene after bringing to front:', error)
          })
        }
      }, 0)
    },

    sendToBack: (objectId: string) => {
      // Update state first
      set(
        produce((state) => {
          if (state.currentScene) {
            const objects = state.currentScene.objects
            if (objects.length === 0) return
            
            const minZIndex = Math.min(...objects.map(obj => obj.zIndex))
            const objectIndex = objects.findIndex(obj => obj.id === objectId)
            
            if (objectIndex !== -1) {
              objects[objectIndex].zIndex = minZIndex - 1
              console.log(`⬇️ Sent object ${objectId} to back with zIndex ${minZIndex - 1}`)
            }
          }
        })
      )

      // Then save to database asynchronously (serialize to break proxy references)
      setTimeout(() => {
        const currentScene = get().currentScene
        if (currentScene) {
          // Serialize and deserialize to break proxy references
          const serializedScene = JSON.parse(JSON.stringify(currentScene))
          dbOperations.updateScene(currentScene.id, serializedScene).catch(error => {
            console.error('Failed to save scene after sending to back:', error)
          })
        }
      }, 0)
    },

    moveUp: (objectId: string) => {
      // Update state first
      set(
        produce((state) => {
          if (state.currentScene) {
            const objectIndex = state.currentScene.objects.findIndex(obj => obj.id === objectId)
            if (objectIndex !== -1) {
              state.currentScene.objects[objectIndex].zIndex += 1
            }
          }
        })
      )

      // Then save to database asynchronously (serialize to break proxy references)
      setTimeout(() => {
        const currentScene = get().currentScene
        if (currentScene) {
          // Serialize and deserialize to break proxy references
          const serializedScene = JSON.parse(JSON.stringify(currentScene))
          dbOperations.updateScene(currentScene.id, serializedScene).catch(error => {
            console.error('Failed to save scene after moving up:', error)
          })
        }
      }, 0)
    },

    moveDown: (objectId: string) => {
      // Update state first
      set(
        produce((state) => {
          if (state.currentScene) {
            const objectIndex = state.currentScene.objects.findIndex(obj => obj.id === objectId)
            if (objectIndex !== -1) {
              state.currentScene.objects[objectIndex].zIndex -= 1
            }
          }
        })
      )

      // Then save to database asynchronously (serialize to break proxy references)
      setTimeout(() => {
        const currentScene = get().currentScene
        if (currentScene) {
          // Serialize and deserialize to break proxy references
          const serializedScene = JSON.parse(JSON.stringify(currentScene))
          dbOperations.updateScene(currentScene.id, serializedScene).catch(error => {
            console.error('Failed to save scene after moving down:', error)
          })
        }
      }, 0)
    },

    // Grouping system
    createGroup: (objectIds: string[], groupName?: string) => {
      console.log('🔗 createGroup called with:', objectIds)
      
      if (objectIds.length < 2) {
        console.log('❌ Cannot create group: need at least 2 objects')
        return
      }
      
      const currentScene = get().currentScene
      if (!currentScene) {
        console.log('❌ Cannot create group: no current scene')
        return
      }

      // Find the objects
      const objects = objectIds.map(id => currentScene.objects.find((obj: SceneObject) => obj.id === id)).filter(Boolean)
      console.log('📦 Found objects for grouping:', objects.length)
      
      if (objects.length < 2) {
        console.log('❌ Cannot create group: not enough valid objects found')
        return
      }

      // Create the group
      const groupId = generateId()
      const parentObject = objects[0] // First selected object becomes the parent
      const childObjects = objects.slice(1)

      const newGroup: ObjectGroup = {
        id: groupId,
        name: groupName || `Group ${get().groups.length + 1}`,
        parentObjectId: parentObject!.id,
        childObjectIds: childObjects.map((obj: any) => obj!.id),
        createdDate: new Date()
      }

      console.log('✨ Creating group:', newGroup)

      // Update state
      set(
        produce((state) => {
          if (!state.currentScene) return

          // Add group to groups array
          state.groups.push(JSON.parse(JSON.stringify(newGroup)))
          
          // Also add to scene groups for persistence
          state.currentScene.groups = state.currentScene.groups || []
          state.currentScene.groups.push(JSON.parse(JSON.stringify(newGroup)))

          // Update objects with group information
          const parentIndex = state.currentScene.objects.findIndex((obj: SceneObject) => obj.id === parentObject!.id)
          if (parentIndex >= 0) {
            state.currentScene.objects[parentIndex].groupId = groupId
            state.currentScene.objects[parentIndex].isGroupParent = true
            console.log('👑 Set parent object:', state.currentScene.objects[parentIndex])
          }

          childObjects.forEach((childObj: SceneObject | undefined) => {
            if (!childObj) return
            const childIndex = state.currentScene!.objects.findIndex((obj: SceneObject) => obj.id === childObj.id)
            if (childIndex >= 0) {
              state.currentScene!.objects[childIndex].groupId = groupId
              state.currentScene!.objects[childIndex].isGroupParent = false
              console.log('👶 Set child object:', state.currentScene!.objects[childIndex])
            }
          })
        })
      )

      console.log(`🔗 Created group "${newGroup.name}" with ${objects.length} objects`)
      console.log('📊 Current groups:', get().groups)
      
      // Save complete scene to database (including groups)
      setTimeout(() => {
        const currentScene = get().currentScene
        if (currentScene) {
          const serializedScene = JSON.parse(JSON.stringify(currentScene))
          console.log('💾 Saving scene with groups:', serializedScene.groups?.length || 0)
          dbOperations.updateScene(currentScene.id, serializedScene).catch(error => {
            console.error('Failed to save scene after creating group:', error)
          })
        }
      }, 0)
    },

    ungroupObjects: (groupId: string) => {
      const group = get().groups.find((g: ObjectGroup) => g.id === groupId)
      if (!group) return

      // Update state
      set(
        produce((state) => {
          if (!state.currentScene) return

          // Remove group from groups array
          state.groups = state.groups.filter((g: ObjectGroup) => g.id !== groupId)
          
          // Also remove from scene groups
          if (state.currentScene.groups) {
            state.currentScene.groups = state.currentScene.groups.filter((g: ObjectGroup) => g.id !== groupId)
          }

          // Remove group information from objects
          state.currentScene.objects.forEach((obj: SceneObject) => {
            if (obj.groupId === groupId) {
              delete obj.groupId
              delete obj.isGroupParent
            }
          })
        })
      )

      console.log(`🔓 Ungrouped "${group.name}"`)
      
      // Save complete scene to database
      setTimeout(() => {
        const currentScene = get().currentScene
        if (currentScene) {
          const serializedScene = JSON.parse(JSON.stringify(currentScene))
          console.log('💾 Saving scene after ungrouping, groups:', serializedScene.groups?.length || 0)
          dbOperations.updateScene(currentScene.id, serializedScene).catch(error => {
            console.error('Failed to save scene after ungrouping:', error)
          })
        }
      }, 0)
    },

    getObjectGroup: (objectId: string) => {
      const object = get().getObjectById(objectId)
      
      if (!object?.groupId) {
        return null
      }
      
      const group = get().groups.find((g: ObjectGroup) => g.id === object.groupId)
      
      return group || null
    },

    // Position locking
    toggleObjectLock: (objectId: string) => {
      const currentScene = get().currentScene
      if (!currentScene) return

      const object = currentScene.objects.find(obj => obj.id === objectId)
      if (!object) return

      const newLockedState = !object.locked

      set(
        produce((state) => {
          if (state.currentScene) {
            const objectIndex = state.currentScene.objects.findIndex(obj => obj.id === objectId)
            if (objectIndex !== -1) {
              state.currentScene.objects[objectIndex].locked = newLockedState
            }
          }
        })
      )

      console.log(`🔒 ${newLockedState ? 'Locked' : 'Unlocked'} object ${objectId}`)

      // Save to database
      setTimeout(() => {
        const currentScene = get().currentScene
        if (currentScene) {
          const serializedScene = JSON.parse(JSON.stringify(currentScene))
          dbOperations.updateScene(currentScene.id, serializedScene).catch(error => {
            console.error('Failed to save scene after toggling lock:', error)
          })
        }
      }, 0)
    },

    lockObjects: (objectIds: string[]) => {
      set(
        produce((state) => {
          if (state.currentScene) {
            objectIds.forEach(objectId => {
              const objectIndex = state.currentScene!.objects.findIndex(obj => obj.id === objectId)
              if (objectIndex !== -1) {
                state.currentScene!.objects[objectIndex].locked = true
              }
            })
          }
        })
      )

      console.log(`🔒 Locked ${objectIds.length} objects`)

      // Save to database
      setTimeout(() => {
        const currentScene = get().currentScene
        if (currentScene) {
          const serializedScene = JSON.parse(JSON.stringify(currentScene))
          dbOperations.updateScene(currentScene.id, serializedScene).catch(error => {
            console.error('Failed to save scene after locking objects:', error)
          })
        }
      }, 0)
    },

    unlockObjects: (objectIds: string[]) => {
      set(
        produce((state) => {
          if (state.currentScene) {
            objectIds.forEach(objectId => {
              const objectIndex = state.currentScene!.objects.findIndex(obj => obj.id === objectId)
              if (objectIndex !== -1) {
                state.currentScene!.objects[objectIndex].locked = false
              }
            })
          }
        })
      )

      console.log(`🔓 Unlocked ${objectIds.length} objects`)

      // Save to database
      setTimeout(() => {
        const currentScene = get().currentScene
        if (currentScene) {
          const serializedScene = JSON.parse(JSON.stringify(currentScene))
          dbOperations.updateScene(currentScene.id, serializedScene).catch(error => {
            console.error('Failed to save scene after unlocking objects:', error)
          })
        }
      }, 0)
    },

    snapObjectToPosition: (objectId: string, x?: number, y?: number) => {
      const currentScene = get().currentScene
      if (!currentScene) return

      const object = currentScene.objects.find(obj => obj.id === objectId)
      if (!object) return

      // If no position provided, snap to current position (useful for "snap in place")
      const snapX = x !== undefined ? x : object.x
      const snapY = y !== undefined ? y : object.y

      set(
        produce((state) => {
          if (state.currentScene) {
            const objectIndex = state.currentScene.objects.findIndex(obj => obj.id === objectId)
            if (objectIndex !== -1) {
              state.currentScene.objects[objectIndex].x = Math.round(snapX)
              state.currentScene.objects[objectIndex].y = Math.round(snapY)
              // Also lock it in place
              state.currentScene.objects[objectIndex].locked = true
            }
          }
        })
      )

      console.log(`📍 Snapped object ${objectId} to position (${Math.round(snapX)}, ${Math.round(snapY)}) and locked`)

      // Save to database
      setTimeout(() => {
        const currentScene = get().currentScene
        if (currentScene) {
          const serializedScene = JSON.parse(JSON.stringify(currentScene))
          dbOperations.updateScene(currentScene.id, serializedScene).catch(error => {
            console.error('Failed to save scene after snapping object:', error)
          })
        }
      }, 0)
    },

    // Utility
    setLoading: (loading: boolean) => {
      set((state) => {
        state.isLoading = loading
      })
    },

    setError: (error: string | null) => {
      set((state) => {
        state.error = error
      })
    },

    getObjectById: (objectId: string) => {
      const currentScene = get().currentScene
      return currentScene?.objects.find(obj => obj.id === objectId)
    }
  }))
)

// Stable empty array to prevent infinite loops
const EMPTY_ARRAY: SceneObject[] = []

// Selectors for easier access
export const sceneSelectors = {
  // Get current scene
  useCurrentScene: () => useSceneStore(state => state.currentScene),
  
  // Get all scenes
  useScenes: () => useSceneStore(state => state.scenes),
  
  // Get loading state
  useIsLoading: () => useSceneStore(state => state.isLoading),
  
  // Get error state
  useError: () => useSceneStore(state => state.error),
  
  // Get selected objects
  useSelectedObjects: () => useSceneStore(state => state.selectedObjects),
  
  // Get clipboard
  useClipboard: () => useSceneStore(state => state.clipboard),
  
  // Get scene objects (stable reference)
  useSceneObjects: () => {
    return useSceneStore((state) => {
      return state.currentScene?.objects || EMPTY_ARRAY
    })
  },
  
  // Get scene count
  useSceneCount: () => useSceneStore(state => state.scenes.length),

  // Fix the selector types
  useSelectedSceneObjects: () => {
    return useSceneStore((state) => {
      if (!state.currentScene) return EMPTY_ARRAY
      
      const selectedIds = new Set(state.selectedObjects)
      return state.currentScene.objects.filter((obj: SceneObject) => selectedIds.has(obj.id))
    })
  },

  useObjectById: (objectId: string) => {
    return useSceneStore((state) => {
      if (!state.currentScene) return null
      return state.currentScene.objects.find((obj: SceneObject) => obj.id === objectId) || null
    })
  },

  useCanCopy: () => {
    return useSceneStore((state) => state.selectedObjects.length > 0)
  },

  useCanPaste: () => {
    return useSceneStore((state) => state.clipboard.length > 0)
  },

  useIsSelected: (objectId: string) => {
    return useSceneStore((state) => state.selectedObjects.includes(objectId))
  }
} 