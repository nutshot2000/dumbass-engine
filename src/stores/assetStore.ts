// Asset Store - Zustand with Immer for Asset Library Management
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { Asset, AssetStoreState } from '@/types'
import { dbOperations } from '@/lib/database'
import { processFile, regenerateThumbnail } from '@/lib/fileUtils'
import { produce } from 'immer'

interface AssetStoreActions {
  // Loading and initialization
  loadAssets: () => Promise<void>
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // Asset CRUD operations
  addAsset: (asset: Asset) => Promise<void>
  uploadFiles: (files: File[]) => Promise<{ uploaded: number; errors: number }>
  updateAsset: (id: string, updates: Partial<Asset>) => Promise<void>
  deleteAsset: (id: string) => Promise<void>
  
  // Asset management
  getAssetById: (id: string) => Asset | undefined
  getAssetsByType: (type: Asset['type']) => Asset[]
  searchAssets: (query: string) => Asset[]
  clearAssets: () => void
  regenerateAssetThumbnails: () => Promise<void>
}

type AssetStore = AssetStoreState & AssetStoreActions

export const useAssetStore = create<AssetStore>()(
  immer((set, get) => ({
    // Initial state
    assets: [],
    isLoading: false,
    error: null,

    // Loading and initialization
    loadAssets: async () => {
      set((state) => {
        state.isLoading = true
        state.error = null
      })

      try {
        const assets = await dbOperations.getAllAssets()
        set((state) => {
          state.assets = assets
          state.isLoading = false
        })
      } catch (error) {
        console.error('Failed to load assets:', error)
        set((state) => {
          state.isLoading = false
          state.error = 'Failed to load assets'
        })
      }
    },

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

    // Asset CRUD operations
    addAsset: async (asset: Asset) => {
      try {
        // Save to database first
        await dbOperations.addAsset(asset)
        
        // Then update state
        set(
          produce((state) => {
            state.assets.push(asset)
            state.error = null
          })
        )
      } catch (error) {
        console.error('Failed to add asset:', error)
        set(
          produce((state) => {
            state.error = 'Failed to add asset'
          })
        )
        throw error
      }
    },

    uploadFiles: async (files: File[]) => {
      set((state) => {
        state.isLoading = true
        state.error = null
      })

             const results: Asset[] = []
       const errors: string[] = []

      for (const file of files) {
        try {
          const result = await processFile(file)
          if (result.success && result.asset) {
            await dbOperations.addAsset(result.asset)
            results.push(result.asset)
          } else {
            errors.push(`${file.name}: ${result.error}`)
          }
        } catch (error) {
          console.error(`Failed to process ${file.name}:`, error)
          errors.push(`${file.name}: Failed to process`)
        }
      }

      set((state) => {
        state.assets = [...results, ...state.assets] // Add new assets to beginning
        state.isLoading = false
        
        if (errors.length > 0) {
          state.error = `Some files failed to upload: ${errors.join(', ')}`
        }
      })

      return { uploaded: results.length, errors: errors.length }
    },

    updateAsset: async (id: string, updates: Partial<Asset>) => {
      const asset = get().assets.find((a: Asset) => a.id === id)
      if (!asset) return

      const updatedAsset = { ...asset, ...updates }
      
      try {
        // Update database first
        await dbOperations.updateAsset(id, updatedAsset)
        
        // Then update state
        set(
          produce((state) => {
            const index = state.assets.findIndex((a: Asset) => a.id === id)
            if (index !== -1) {
              state.assets[index] = updatedAsset
            }
            state.error = null
          })
        )
      } catch (error) {
        console.error('Failed to update asset:', error)
        set(
          produce((state) => {
            state.error = 'Failed to update asset'
          })
        )
        throw error
      }
    },

    deleteAsset: async (id: string) => {
      try {
        // Remove from database first
        await dbOperations.deleteAsset(id)
        
        // Then update state
        set(
          produce((state) => {
            state.assets = state.assets.filter((asset: Asset) => asset.id !== id)
            state.error = null
          })
        )
      } catch (error) {
        console.error('Failed to remove asset:', error)
        set(
          produce((state) => {
            state.error = 'Failed to remove asset'
          })
        )
        throw error
      }
    },

    // Asset management
    getAssetById: (id: string) => {
      return get().assets.find(asset => asset.id === id)
    },

    getAssetsByType: (type: Asset['type']) => {
      return get().assets.filter(asset => asset.type === type)
    },

    searchAssets: (query: string) => {
      const lowerQuery = query.toLowerCase()
      return get().assets.filter(asset =>
        asset.name.toLowerCase().includes(lowerQuery) ||
        asset.type.toLowerCase().includes(lowerQuery)
      )
    },

    clearAssets: () => {
      set((state) => {
        state.assets = []
        state.error = null
      })
    },

    regenerateAssetThumbnails: async () => {
      const assets = get().assets.filter(asset => asset.type !== 'audio')
      
      set((state) => {
        state.isLoading = true
        state.error = null
      })

      try {
        for (const asset of assets) {
          try {
            const newThumbnail = await regenerateThumbnail(asset)
            const updatedAsset = { ...asset, thumbnail: newThumbnail }
            
            // Update in database
            await dbOperations.updateAsset(asset.id, updatedAsset)
            
            // Update in state
            set(
              produce((state) => {
                const index = state.assets.findIndex((a: Asset) => a.id === asset.id)
                if (index !== -1) {
                  state.assets[index] = updatedAsset
                }
              })
            )
          } catch (error) {
            console.error(`Failed to regenerate thumbnail for ${asset.name}:`, error)
          }
        }
        
        set((state) => {
          state.isLoading = false
        })
      } catch (error) {
        console.error('Failed to regenerate thumbnails:', error)
        set((state) => {
          state.isLoading = false
          state.error = 'Failed to regenerate thumbnails'
        })
      }
    }
  }))
)

// Selectors for easier access - Using stable references
export const assetSelectors = {
  // Get all assets
  useAssets: () => useAssetStore(state => state.assets),
  
  // Get loading state
  useIsLoading: () => useAssetStore(state => state.isLoading),
  
  // Get error state
  useError: () => useAssetStore(state => state.error),
  
  // Get asset count
  useAssetCount: () => useAssetStore(state => state.assets.length),
  
  // Get asset by ID (use in components, don't use as selector)
  useAssetById: (id: string) => useAssetStore(state => state.assets.find(a => a.id === id))
} 