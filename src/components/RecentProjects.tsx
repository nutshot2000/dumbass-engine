'use client'

import React from 'react'
import { useSceneStore } from '@/stores/sceneStore'
import { useAssetStore } from '@/stores/assetStore'
import { dbOperations } from '@/lib/database'

interface RecentProjectsProps {
  onClose: () => void
}

export function RecentProjects({ onClose }: RecentProjectsProps) {
  const { scenes, setCurrentScene, loadScenes } = useSceneStore()
  const { assets, loadAssets } = useAssetStore()

  const handleSelectScene = (scene: any) => {
    setCurrentScene(scene)
    onClose()
  }

  const formatDate = (date: Date | string) => {
    const d = new Date(date)
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const handleDeleteAllProjects = async () => {
    const confirmMessage = `⚠️ DELETE ALL PROJECTS ⚠️

This will permanently delete:
• ${scenes.length} scenes
• ${assets.length} assets
• All your work and progress

This action CANNOT be undone!

Type "DELETE EVERYTHING" to confirm:`

    const confirmation = prompt(confirmMessage)
    
    if (confirmation === "DELETE EVERYTHING") {
      try {
        console.log('🗑️ Deleting all projects and data...')
        
        // Clear all data from database
        await dbOperations.clearAllData()
        
        // Clear localStorage
        localStorage.removeItem('gameEngine_hasSeenWizard')
        
        // Reload stores to reflect empty state
        await loadScenes()
        await loadAssets()
        
        console.log('✅ All projects deleted successfully')
        alert('🗑️ All projects deleted! Starting fresh...')
        
        // Close the panel and let the app show the wizard
        onClose()
        
        // Force page reload to ensure clean state
        window.location.reload()
        
      } catch (error) {
        console.error('Failed to delete all projects:', error)
        alert('❌ Failed to delete projects. Please try again.')
      }
    } else if (confirmation !== null) {
      alert('❌ Deletion cancelled - confirmation text did not match.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Welcome Back! 👋</h2>
              <p className="text-blue-100 mt-1">Continue working on your projects</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{scenes.length}</div>
              <div className="text-gray-300 text-sm">Scenes</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{assets.length}</div>
              <div className="text-gray-300 text-sm">Assets</div>
            </div>
          </div>

          {/* Recent Scenes */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">📂 Your Scenes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto">
              {scenes.map((scene) => (
                <div
                  key={scene.id}
                  onClick={() => handleSelectScene(scene)}
                  className="bg-gray-700 hover:bg-gray-600 rounded-lg p-4 cursor-pointer transition-colors border border-gray-600 hover:border-blue-500"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-white truncate">{scene.name}</h4>
                    <span className="text-xs text-gray-400">{scene.objects?.length || 0} objects</span>
                  </div>
                  <div className="text-sm text-gray-300 mb-2">
                    {scene.width} × {scene.height}px
                  </div>
                  <div className="text-xs text-gray-400">
                    Modified: {formatDate(scene.metadata?.lastModified || scene.metadata?.createdDate || new Date())}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                // Select the most recent scene
                if (scenes.length > 0) {
                  const mostRecent = scenes.sort((a, b) => 
                    new Date(b.metadata?.lastModified || b.metadata?.createdDate || 0).getTime() - 
                    new Date(a.metadata?.lastModified || a.metadata?.createdDate || 0).getTime()
                  )[0]
                  handleSelectScene(mostRecent)
                }
              }}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
            >
              🚀 Continue Last Project
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium transition-colors"
            >
              Browse All
            </button>
          </div>

          {/* Danger Zone */}
          <div className="mt-6 pt-4 border-t border-gray-600">
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-3">⚠️ Danger Zone</p>
              <button
                onClick={handleDeleteAllProjects}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg font-medium transition-colors"
              >
                🗑️ Delete All Projects
              </button>
              <p className="text-xs text-gray-500 mt-2">This will permanently delete everything</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 