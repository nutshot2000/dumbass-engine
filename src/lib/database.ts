// IndexedDB Database Setup with Dexie.js
import Dexie, { Table } from 'dexie'
import { Asset, Scene, Project } from '@/types'

export class GameEngineDatabase extends Dexie {
  assets!: Table<Asset>
  scenes!: Table<Scene>
  projects!: Table<Project>

  constructor() {
    super('GameEngineDB')
    
    this.version(1).stores({
      assets: 'id, name, type, metadata.uploadDate',
      scenes: 'id, name, metadata.createdDate, metadata.lastModified',
      projects: 'id, name, metadata.createdDate, metadata.lastModified'
    })
  }
}

// Create database instance
export const db = new GameEngineDatabase()

// Database operations
export const dbOperations = {
  // Asset operations
  async addAsset(asset: Asset): Promise<string> {
    try {
      return await db.assets.add(asset)
    } catch (error) {
      console.error('Failed to add asset:', error)
      throw new Error('Failed to save asset to database')
    }
  },

  async getAsset(id: string): Promise<Asset | undefined> {
    try {
      return await db.assets.get(id)
    } catch (error) {
      console.error('Failed to get asset:', error)
      return undefined
    }
  },

  async getAllAssets(): Promise<Asset[]> {
    try {
      return await db.assets.orderBy('metadata.uploadDate').reverse().toArray()
    } catch (error) {
      console.error('Failed to get assets:', error)
      return []
    }
  },

  async updateAsset(id: string, updates: Partial<Asset>): Promise<void> {
    try {
      await db.assets.update(id, updates)
    } catch (error) {
      console.error('Failed to update asset:', error)
      throw new Error('Failed to update asset')
    }
  },

  async deleteAsset(id: string): Promise<void> {
    try {
      await db.assets.delete(id)
    } catch (error) {
      console.error('Failed to delete asset:', error)
      throw new Error('Failed to delete asset')
    }
  },

  // Scene operations
  async addScene(scene: Scene): Promise<string> {
    try {
      return await db.scenes.add(scene)
    } catch (error) {
      console.error('Failed to add scene:', error)
      throw new Error('Failed to save scene to database')
    }
  },

  async getScene(id: string): Promise<Scene | undefined> {
    try {
      return await db.scenes.get(id)
    } catch (error) {
      console.error('Failed to get scene:', error)
      return undefined
    }
  },

  async getAllScenes(): Promise<Scene[]> {
    try {
      return await db.scenes.orderBy('metadata.lastModified').reverse().toArray()
    } catch (error) {
      console.error('Failed to get scenes:', error)
      return []
    }
  },

  async updateScene(id: string, updates: Partial<Scene>): Promise<void> {
    try {
      const updateData: any = { ...updates }
      if (updates.metadata) {
        updateData.metadata = {
          ...updates.metadata,
          lastModified: new Date()
        }
      } else {
        updateData['metadata.lastModified'] = new Date()
      }
      await db.scenes.update(id, updateData)
    } catch (error) {
      console.error('Failed to update scene:', error)
      throw new Error('Failed to update scene')
    }
  },

  async deleteScene(id: string): Promise<void> {
    try {
      await db.scenes.delete(id)
    } catch (error) {
      console.error('Failed to delete scene:', error)
      throw new Error('Failed to delete scene')
    }
  },

  // Project operations
  async addProject(project: Project): Promise<string> {
    try {
      return await db.projects.add(project)
    } catch (error) {
      console.error('Failed to add project:', error)
      throw new Error('Failed to save project to database')
    }
  },

  async getProject(id: string): Promise<Project | undefined> {
    try {
      return await db.projects.get(id)
    } catch (error) {
      console.error('Failed to get project:', error)
      return undefined
    }
  },

  async getAllProjects(): Promise<Project[]> {
    try {
      return await db.projects.orderBy('metadata.lastModified').reverse().toArray()
    } catch (error) {
      console.error('Failed to get projects:', error)
      return []
    }
  },

  async updateProject(id: string, updates: Partial<Project>): Promise<void> {
    try {
      const updateData: any = { ...updates }
      if (updates.metadata) {
        updateData.metadata = {
          ...updates.metadata,
          lastModified: new Date()
        }
      } else {
        updateData['metadata.lastModified'] = new Date()
      }
      await db.projects.update(id, updateData)
    } catch (error) {
      console.error('Failed to update project:', error)
      throw new Error('Failed to update project')
    }
  },

  async deleteProject(id: string): Promise<void> {
    try {
      await db.projects.delete(id)
    } catch (error) {
      console.error('Failed to delete project:', error)
      throw new Error('Failed to delete project')
    }
  },

  // Utility operations
  async clearAllData(): Promise<void> {
    try {
      await db.assets.clear()
      await db.scenes.clear()
      await db.projects.clear()
    } catch (error) {
      console.error('Failed to clear database:', error)
      throw new Error('Failed to clear database')
    }
  },

  async exportData(): Promise<{ assets: Asset[], scenes: Scene[], projects: Project[] }> {
    try {
      const [assets, scenes, projects] = await Promise.all([
        db.assets.toArray(),
        db.scenes.toArray(),
        db.projects.toArray()
      ])
      return { assets, scenes, projects }
    } catch (error) {
      console.error('Failed to export data:', error)
      throw new Error('Failed to export data')
    }
  }
}

// Initialize database connection
export const initializeDatabase = async (): Promise<boolean> => {
  try {
    await db.open()
    console.log('Database initialized successfully')
    return true
  } catch (error) {
    console.error('Failed to initialize database:', error)
    return false
  }
} 