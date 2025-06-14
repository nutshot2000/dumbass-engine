'use client'

import React, { useEffect, useState } from 'react'
import { AssetLibrary } from '@/components/editor/AssetLibrary'
import { SceneCanvas } from '@/components/editor/SceneCanvas'
import { PropertyPanel } from '@/components/editor/PropertyPanel'
import { Toolbar } from '@/components/editor/Toolbar'
import { ProjectWizard } from '@/components/ProjectWizard'
import { RecentProjects } from '@/components/RecentProjects'
import { useAssetStore } from '@/stores/assetStore'
import { useSceneStore } from '@/stores/sceneStore'
import { useUIStore, useLoadSavedPreferences } from '@/stores/uiStore'
import { createAutomationAPI } from '@/lib/automation'

export default function GameEngine() {
  const [showWizard, setShowWizard] = useState(false)
  const [showRecentProjects, setShowRecentProjects] = useState(false)
  const { loadAssets } = useAssetStore()
  const { loadScenes, scenes, currentScene } = useSceneStore()
  const { showPropertyPanel, showAssetLibrary } = useUIStore()
  
  // Load saved preferences on client side
  useLoadSavedPreferences()

  useEffect(() => {
    // Load data on startup
    console.log('🚀 Starting app - loading assets and scenes...')
    loadAssets()
    loadScenes()
    
    // Setup automation API
    const automationAPI = createAutomationAPI({
      assetStore: useAssetStore.getState(),
      sceneStore: useSceneStore.getState(),
      uiStore: useUIStore.getState()
    })
    
    // Make it accessible globally
    ;(window as any).gameEngineAPI = automationAPI
    
    console.log('🤖 Game Engine Automation API Ready!')
    console.log('Available commands:')
    console.log('- window.gameEngineAPI.setViewport("tiktok")')
    console.log('- window.gameEngineAPI.addObjectToScene(assetId, x, y)')
    console.log('- window.gameEngineAPI.createMeme(config)')
    console.log('- window.gameEngineAPI.batchProcess(operations)')
    console.log('Full API:', Object.keys((window as any).gameEngineAPI || {}))
  }, [loadAssets, loadScenes])

  // Show appropriate startup screen
  useEffect(() => {
    console.log('🔍 Startup check:', { 
      scenesLength: scenes.length, 
      currentScene: currentScene?.name || 'none',
      hasSeenWizard: localStorage.getItem('gameEngine_hasSeenWizard')
    })
    
    if (scenes.length === 0) {
      // No scenes exist - show wizard for new project
      console.log('📝 Showing wizard - no scenes found')
      setShowWizard(true)
      setShowRecentProjects(false)
    } else if (scenes.length > 0 && !currentScene) {
      // Has scenes but no current scene - show recent projects
      console.log('📂 Showing recent projects - scenes found but none selected')
      setShowRecentProjects(true)
      setShowWizard(false)
    } else {
      // Has current scene - hide both panels
      console.log('✅ Current scene active - hiding panels')
      setShowWizard(false)
      setShowRecentProjects(false)
    }
  }, [scenes.length, currentScene])

  const handleWizardClose = () => {
    setShowWizard(false)
    localStorage.setItem('gameEngine_hasSeenWizard', 'true')
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* Show Project Wizard */}
      {showWizard && <ProjectWizard onClose={handleWizardClose} />}
      
      {/* Show Recent Projects */}
      {showRecentProjects && <RecentProjects onClose={() => setShowRecentProjects(false)} />}
      
              {/* Toolbar */}
        <Toolbar onShowRecentProjects={() => setShowRecentProjects(true)} />
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Asset Library */}
        {showAssetLibrary && (
          <div className="w-80 bg-gray-800 border-r border-gray-700 text-white">
            <AssetLibrary />
          </div>
        )}
        
        {/* Canvas Area */}
        <div className="flex-1 flex flex-col">
          <SceneCanvas />
        </div>
        
        {/* Property Panel */}
        {showPropertyPanel && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 text-white">
            <PropertyPanel />
          </div>
        )}
      </div>
      
      {/* New Project Button - Floating */}
      <button
        onClick={() => setShowWizard(true)}
        className="fixed bottom-6 right-6 bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-full shadow-lg z-40"
        title="Create New Project"
        >
        <span className="text-2xl">🎮</span>
      </button>
    </div>
  )
}
