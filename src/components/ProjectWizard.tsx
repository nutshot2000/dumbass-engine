'use client'

import React, { useState } from 'react'
import { useUIStore } from '@/stores/uiStore'
import { useSceneStore } from '@/stores/sceneStore'

interface ProjectTemplate {
  id: string
  name: string
  description: string
  viewport: {
    width: number
    height: number
    type: 'regular' | 'live'
  }
  icon: string
  category: 'social' | 'game' | 'web' | 'print'
}

const PROJECT_TEMPLATES: ProjectTemplate[] = [
  // Social Media
  {
    id: 'instagram-post',
    name: 'Instagram Post',
    description: 'Square format for Instagram posts',
    viewport: { width: 1080, height: 1080, type: 'regular' },
    icon: '📸',
    category: 'social'
  },
  {
    id: 'instagram-story',
    name: 'Instagram Story',
    description: 'Vertical format for Instagram stories',
    viewport: { width: 1080, height: 1920, type: 'regular' },
    icon: '📱',
    category: 'social'
  },
  {
    id: 'tiktok-video',
    name: 'TikTok Video',
    description: 'Vertical format for TikTok content',
    viewport: { width: 1080, height: 1920, type: 'regular' },
    icon: '🎵',
    category: 'social'
  },
  {
    id: 'youtube-thumbnail',
    name: 'YouTube Thumbnail',
    description: 'Widescreen format for YouTube thumbnails',
    viewport: { width: 1280, height: 720, type: 'regular' },
    icon: '🎬',
    category: 'social'
  },
  
  // Live Games
  {
    id: 'live-game-mobile',
    name: 'Live Game Mobile',
    description: 'Interactive mobile game with smooth controls',
    viewport: { width: 375, height: 667, type: 'live' },
    icon: '📱',
    category: 'game'
  },
  {
    id: 'live-game-tablet',
    name: 'Live Game Tablet',
    description: 'Interactive tablet game with touch controls',
    viewport: { width: 768, height: 1024, type: 'live' },
    icon: '📱',
    category: 'game'
  },
  {
    id: 'live-game-desktop',
    name: 'Live Game Desktop',
    description: 'Interactive desktop game with full controls',
    viewport: { width: 1280, height: 720, type: 'live' },
    icon: '🖥️',
    category: 'game'
  },
  {
    id: 'live-game-fullhd',
    name: 'Live Game Full HD',
    description: 'High-resolution interactive game',
    viewport: { width: 1920, height: 1080, type: 'live' },
    icon: '🖥️',
    category: 'game'
  },
  
  // Web & Print
  {
    id: 'web-banner',
    name: 'Web Banner',
    description: 'Standard web banner format',
    viewport: { width: 728, height: 90, type: 'regular' },
    icon: '🌐',
    category: 'web'
  },
  {
    id: 'poster-a4',
    name: 'A4 Poster',
    description: 'Standard A4 print format',
    viewport: { width: 2480, height: 3508, type: 'regular' },
    icon: '📄',
    category: 'print'
  }
]

const CATEGORIES = [
  { id: 'social', name: 'Social Media', icon: '📱' },
  { id: 'game', name: 'Live Games', icon: '🎮' },
  { id: 'web', name: 'Web Graphics', icon: '🌐' },
  { id: 'print', name: 'Print Media', icon: '🖨️' }
]

interface ProjectWizardProps {
  onClose?: () => void
}

export function ProjectWizard({ onClose }: ProjectWizardProps) {
  const [step, setStep] = useState<'welcome' | 'category' | 'template' | 'name'>('welcome')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null)
  const [projectName, setProjectName] = useState('')
  
  const { setCanvasSize, setLiveViewport } = useUIStore()
  const { createNewScene, setCurrentScene } = useSceneStore()

  const handleCreateProject = async () => {
    if (!selectedTemplate) return
    
    try {
      // Set up the viewport
      setCanvasSize(selectedTemplate.viewport.width, selectedTemplate.viewport.height)
      setLiveViewport(selectedTemplate.viewport.type === 'live')
      
      // Create new scene
      const newScene = await createNewScene(
        projectName || selectedTemplate.name, 
        selectedTemplate.viewport.width, 
        selectedTemplate.viewport.height
      )
      setCurrentScene(newScene)
      
      console.log('🎉 Project created:', {
        name: projectName || selectedTemplate.name,
        template: selectedTemplate.id,
        viewport: selectedTemplate.viewport
      })
      
      // Close wizard
      onClose?.()
    } catch (error) {
      console.error('Failed to create project:', error)
    }
  }

  const filteredTemplates = selectedCategory 
    ? PROJECT_TEMPLATES.filter(t => t.category === selectedCategory)
    : PROJECT_TEMPLATES

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
          title="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        {/* Welcome Step */}
        {step === 'welcome' && (
          <div className="p-8 text-center">
            <div className="text-6xl mb-4">🎮</div>
            <h1 className="text-3xl font-bold mb-4">Welcome to Game Engine</h1>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              Create amazing interactive content with our powerful visual editor. 
              Choose from templates for social media, live games, web graphics, and more.
            </p>
            <button
              onClick={() => setStep('category')}
              className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-medium text-lg"
            >
              Create New Project
            </button>
          </div>
        )}

        {/* Category Selection */}
        {step === 'category' && (
          <div className="p-8">
            <h2 className="text-2xl font-bold mb-6">Choose Project Type</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {CATEGORIES.map(category => (
                <button
                  key={category.id}
                  onClick={() => {
                    setSelectedCategory(category.id)
                    setStep('template')
                  }}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center"
                >
                  <div className="text-4xl mb-2">{category.icon}</div>
                  <div className="font-medium">{category.name}</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep('welcome')}
              className="text-gray-500 hover:text-gray-700"
            >
              ← Back
            </button>
          </div>
        )}

        {/* Template Selection */}
        {step === 'template' && (
          <div className="p-8">
            <h2 className="text-2xl font-bold mb-6">
              Choose Template
              {selectedCategory && (
                <span className="text-blue-500 ml-2">
                  ({CATEGORIES.find(c => c.id === selectedCategory)?.name})
                </span>
              )}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 max-h-96 overflow-y-auto">
              {filteredTemplates.map(template => (
                <button
                  key={template.id}
                  onClick={() => {
                    setSelectedTemplate(template)
                    setStep('name')
                  }}
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{template.icon}</div>
                    <div className="flex-1">
                      <div className="font-medium mb-1">{template.name}</div>
                      <div className="text-sm text-gray-600 mb-2">{template.description}</div>
                      <div className="text-xs text-gray-500">
                        {template.viewport.width} × {template.viewport.height}
                        {template.viewport.type === 'live' && (
                          <span className="ml-2 bg-green-100 text-green-800 px-2 py-1 rounded">
                            🎮 Live Interactive
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep('category')}
              className="text-gray-500 hover:text-gray-700"
            >
              ← Back
            </button>
          </div>
        )}

        {/* Project Name */}
        {step === 'name' && selectedTemplate && (
          <div className="p-8">
            <h2 className="text-2xl font-bold mb-6">Name Your Project</h2>
            <div className="mb-6">
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{selectedTemplate.icon}</span>
                  <span className="font-medium">{selectedTemplate.name}</span>
                </div>
                <div className="text-sm text-gray-600">
                  {selectedTemplate.viewport.width} × {selectedTemplate.viewport.height}
                  {selectedTemplate.viewport.type === 'live' && (
                    <span className="ml-2 text-green-600">🎮 Interactive Game</span>
                  )}
                </div>
              </div>
              
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Name
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder={selectedTemplate.name}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 selection:bg-blue-500 selection:text-white"
                autoFocus
              />
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={() => setStep('template')}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Back
              </button>
              <button
                onClick={handleCreateProject}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium ml-auto"
              >
                Create Project
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 