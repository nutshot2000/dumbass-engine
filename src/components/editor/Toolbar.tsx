'use client'

import React from 'react'
import {
  PlusIcon,
  FolderOpenIcon,
  DocumentIcon,
  ArrowDownTrayIcon,
  Cog6ToothIcon,
  CursorArrowRaysIcon,
  HandRaisedIcon,
  Square3Stack3DIcon,
  TrashIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  EyeIcon,
  EyeSlashIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  DeviceTabletIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { uiSelectors, useUIStore, VIEWPORT_PRESETS, ViewportPreset } from '@/stores/uiStore'
import { useSceneStore, sceneSelectors } from '@/stores/sceneStore'
import { assetSelectors, useAssetStore } from '@/stores/assetStore'
import { dbOperations } from '@/lib/database'

interface ToolbarProps {
  onShowRecentProjects?: () => void
}

export function Toolbar({ onShowRecentProjects }: ToolbarProps) {
  const selectedTool = uiSelectors.useSelectedTool()
  const zoom = uiSelectors.useZoom()
  const zoomPercentage = uiSelectors.useZoomPercentage()
  const showAssetLibrary = uiSelectors.useAssetLibraryVisible()
  const showPropertyPanel = uiSelectors.usePropertyPanelVisible()
  const canvasSize = uiSelectors.useCanvasSize()
  const currentViewportPreset = uiSelectors.useCurrentViewportPreset()

  const currentScene = sceneSelectors.useCurrentScene()
  const sceneCount = sceneSelectors.useSceneCount()
  const assetCount = assetSelectors.useAssetCount()

  const { 
    setSelectedTool, 
    toggleAssetLibrary, 
    togglePropertyPanel,
    zoomIn,
    zoomOut,
    resetZoom,
    setViewportSize,
    zoomToFit,
    zoomToSelection,
    resetPan
  } = useUIStore()

  const { createNewScene, setCurrentScene, loadScenes } = useSceneStore()
  const { loadAssets } = useAssetStore()

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'n':
            e.preventDefault()
            handleNewScene()
            break
          case 's':
            e.preventDefault()
            handleSaveProject()
            break
          case 'o':
            e.preventDefault()
            handleOpenProject()
            break
          case 'e':
            e.preventDefault()
            handleExportProject()
            break
          case 'Delete':
            if (e.shiftKey) {
              e.preventDefault()
              handleDeleteAllProjects()
            }
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Handle tool selection
  const handleToolSelect = (tool: typeof selectedTool) => {
    setSelectedTool(tool)
  }

  // Handle new scene creation
  const handleNewScene = async () => {
    try {
      const sceneName = prompt('Enter scene name:', 'New Scene')
      if (sceneName) {
        await createNewScene(sceneName)
      }
    } catch (error) {
      console.error('Failed to create scene:', error)
    }
  }

  // Handle save project
  const handleSaveProject = async () => {
    try {
      // Auto-save is already happening, but we can show a confirmation
      console.log('💾 Project auto-saved!')
      
      // Show a brief success message
      const button = document.querySelector('[title="Save Project (Ctrl+S)"]')
      if (button) {
        const originalTitle = button.getAttribute('title')
        button.setAttribute('title', '✅ Saved!')
        setTimeout(() => {
          button.setAttribute('title', originalTitle || 'Save Project (Ctrl+S)')
        }, 2000)
      }
    } catch (error) {
      console.error('Failed to save project:', error)
    }
  }

  // Handle export project
  const handleExportProject = async () => {
    try {
      if (!currentScene) {
        alert('No scene to export. Please create a scene first.')
        return
      }

      // Create export data
      const exportData = {
        scene: currentScene,
        assets: [], // We'd need to get the assets used in this scene
        metadata: {
          exportDate: new Date(),
          version: '1.0'
        }
      }

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${currentScene.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      console.log('📤 Project exported successfully!')
    } catch (error) {
      console.error('Failed to export project:', error)
      alert('Failed to export project. Please try again.')
    }
  }

  // Handle delete all projects
  const handleDeleteAllProjects = async () => {
    const confirmMessage = `⚠️ DELETE ALL PROJECTS ⚠️

This will permanently delete:
• ${sceneCount} scenes
• ${assetCount} assets
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

  // Handle import/open project
  const handleOpenProject = async () => {
    try {
      // Create file input
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) return

        try {
          const text = await file.text()
          const importData = JSON.parse(text)
          
          if (importData.scene) {
            // Import the scene
            const { createNewScene, setCurrentScene } = useSceneStore.getState()
            const newScene = await createNewScene(
              `${importData.scene.name} (Imported)`,
              importData.scene.width,
              importData.scene.height
            )
            
            // Update the scene with imported data
            const { updateScene } = useSceneStore.getState()
            await updateScene(newScene.id, {
              objects: importData.scene.objects || [],
              backgroundColor: importData.scene.backgroundColor || '#ffffff'
            })
            
            setCurrentScene(newScene)
            console.log('📥 Project imported successfully!')
            alert('Project imported successfully!')
          } else {
            alert('Invalid project file format.')
          }
        } catch (error) {
          console.error('Failed to import project:', error)
          alert('Failed to import project. Please check the file format.')
        }
      }
      
      input.click()
    } catch (error) {
      console.error('Failed to open project:', error)
    }
  }

  return (
    <div className="h-14 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4 text-white">
      {/* Left Section - Project & File */}
      <div className="flex items-center gap-4">
        {/* Logo/Title */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-sm font-bold text-white">GE</span>
          </div>
          <span className="font-semibold text-white">Game Engine V2</span>
        </div>

        {/* File Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleNewScene}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-white"
            title="New Scene (Ctrl+N)"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
          
          <button
            onClick={onShowRecentProjects}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-white"
            title="Recent Projects"
          >
            <ClockIcon className="w-4 h-4" />
          </button>
          
          <button
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-white"
            title="Open Project (Ctrl+O)"
            onClick={handleOpenProject}
          >
            <FolderOpenIcon className="w-4 h-4" />
          </button>
          
          <button
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-white"
            title="Save Project (Ctrl+S)"
            onClick={handleSaveProject}
          >
            <DocumentIcon className="w-4 h-4" />
          </button>
          
          <button
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-white"
            title="Export Game (Ctrl+E)"
            onClick={handleExportProject}
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-600" />

        {/* Tools */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleToolSelect('select')}
            className={`p-2 rounded-lg transition-colors ${
              selectedTool === 'select'
                ? 'bg-blue-600 text-white'
                : 'hover:bg-gray-700 text-white'
            }`}
            title="Select Tool (V)"
          >
            <CursorArrowRaysIcon className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => handleToolSelect('move')}
            className={`p-2 rounded-lg transition-colors ${
              selectedTool === 'move'
                ? 'bg-blue-600 text-white'
                : 'hover:bg-gray-700 text-white'
            }`}
            title="Move Tool (M)"
          >
            <HandRaisedIcon className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => handleToolSelect('resize')}
            className={`p-2 rounded-lg transition-colors ${
              selectedTool === 'resize'
                ? 'bg-blue-600 text-white'
                : 'hover:bg-gray-700 text-white'
            }`}
            title="Resize Tool (R)"
          >
            <Square3Stack3DIcon className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => handleToolSelect('pan')}
            className={`p-2 rounded-lg transition-colors ${
              selectedTool === 'pan'
                ? 'bg-blue-600 text-white'
                : 'hover:bg-gray-700 text-white'
            }`}
            title="Pan Tool (H) - Hold Space for temporary pan"
          >
            <HandRaisedIcon className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => handleToolSelect('delete')}
            className={`p-2 rounded-lg transition-colors ${
              selectedTool === 'delete'
                ? 'bg-red-600 text-white'
                : 'hover:bg-gray-700 text-white'
            }`}
            title="Delete Tool (D)"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center Section - Scene Info & Viewport */}
      <div className="flex items-center gap-4 text-sm text-gray-300">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Scene:</span>
          <span className="font-medium">
            {currentScene ? currentScene.name : 'No Scene'}
          </span>
        </div>
        
        {/* Viewport Controls */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Project:</span>
          <div className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-xs text-gray-300">
            {(() => {
              if (currentViewportPreset === 'custom') return 'Custom'
              const preset = VIEWPORT_PRESETS[currentViewportPreset as ViewportPreset]
              return preset?.label || 'Desktop HD'
            })()}
          </div>
          
          <span className="text-gray-400 ml-2">Preview Size:</span>
          <select
            value={currentViewportPreset}
            onChange={(e) => {
              const preset = e.target.value as ViewportPreset | 'custom'
              if (preset !== 'custom') {
                setViewportSize(preset)
              }
            }}
            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {/* Show options based on current project type */}
            {VIEWPORT_PRESETS[currentViewportPreset as ViewportPreset]?.isGame ? (
              // Live Game Project - Show different game screen sizes
              <>
                <optgroup label="🎮 Game Preview Sizes">
                  <option value="game-mobile">📱 Mobile Game (360×640)</option>
                  <option value="game-desktop">🖥️ Desktop Game (1280×720)</option>
                  <option value="game-hd">📺 Full HD Game (1920×1080)</option>
                </optgroup>
              </>
            ) : (
              // Social Media/Web Project - Show different device previews
              <>
                <optgroup label="📱 Device Preview">
                  <option value="mobile">📱 Mobile (360×640)</option>
                  <option value="tablet">📱 Tablet (768×1024)</option>
                  <option value="desktop">💻 Desktop HD (1920×1080)</option>
                </optgroup>
                <optgroup label="📱 Original Format">
                  {Object.entries(VIEWPORT_PRESETS)
                    .filter(([key, preset]) => !preset.isGame && ['mobile', 'tablet', 'desktop', 'wide', 'square'].includes(key))
                    .map(([key, preset]) => (
                      <option key={key} value={key}>
                        {preset.label} ({preset.width}×{preset.height})
                      </option>
                    ))}
                </optgroup>
              </>
            )}
            
            {currentViewportPreset === 'custom' && (
              <option value="custom">
                Custom ({canvasSize.width}×{canvasSize.height})
              </option>
            )}
          </select>
          
          <span className="text-gray-500 text-xs">
            {canvasSize.width}×{canvasSize.height}
          </span>
        </div>
        
        <div className="text-gray-400">
          {sceneCount} scenes • {assetCount} assets
        </div>
      </div>

      {/* Right Section - View & Panels */}
      <div className="flex items-center gap-4">
        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={zoomOut}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="Zoom Out (Ctrl+-)"
          >
            <MagnifyingGlassMinusIcon className="w-4 h-4" />
          </button>
          
          <button
            onClick={resetZoom}
            className="px-3 py-1 hover:bg-gray-700 rounded text-xs min-w-[50px] transition-colors"
            title="Reset Zoom (Ctrl+0)"
          >
            {zoomPercentage}%
          </button>
          
          <button
            onClick={zoomIn}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="Zoom In (Ctrl++)"
          >
            <MagnifyingGlassPlusIcon className="w-4 h-4" />
          </button>
          
          <button
            onClick={zoomToFit}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-xs"
            title="Zoom to Fit All Objects"
          >
            🔍
          </button>
          
          <button
            onClick={resetPan}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-xs"
            title="Reset Pan Position"
          >
            🎯
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-600" />

        {/* Panel Toggles */}
        <div className="flex items-center gap-1">
          <button
            onClick={toggleAssetLibrary}
            className={`p-2 rounded-lg transition-colors ${
              showAssetLibrary
                ? 'bg-blue-600 text-white'
                : 'hover:bg-gray-700'
            }`}
            title="Toggle Asset Library (Ctrl+1)"
          >
            <FolderOpenIcon className="w-4 h-4" />
          </button>
          
          <button
            onClick={togglePropertyPanel}
            className={`p-2 rounded-lg transition-colors ${
              showPropertyPanel
                ? 'bg-blue-600 text-white'
                : 'hover:bg-gray-700 text-white'
            }`}
            title={showPropertyPanel ? "Hide Inspector Panel - More Workspace (Ctrl+2)" : "Show Inspector Panel - Object Details (Ctrl+2)"}
          >
            {showPropertyPanel ? (
              <EyeSlashIcon className="w-4 h-4" />
            ) : (
              <EyeIcon className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Settings Dropdown */}
        <div className="relative group">
          <button
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="Settings & Actions"
          >
            <Cog6ToothIcon className="w-4 h-4" />
          </button>
          
          {/* Dropdown Menu */}
          <div className="absolute right-0 top-full mt-1 w-48 bg-gray-800 border border-gray-600 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
            <div className="py-1">
              <button
                onClick={() => console.log('Settings - Phase 2')}
                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                ⚙️ Settings
              </button>
              <div className="border-t border-gray-600 my-1"></div>
              <button
                onClick={handleDeleteAllProjects}
                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300"
              >
                🗑️ Delete All Projects
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 