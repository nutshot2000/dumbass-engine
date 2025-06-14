// 🤖 AI Collaboration Demo Script
// This script demonstrates the embedded Live Mode features
// Run this in the browser console when the game engine is loaded

// Wait for the Game Engine API to be ready
const waitForGameEngine = () => {
  return new Promise((resolve) => {
    const check = () => {
      if (window.gameEngineAPI) {
        console.log('🎮 Game Engine API is ready!')
        resolve(window.gameEngineAPI)
      } else {
        console.log('⏳ Waiting for Game Engine API...')
        setTimeout(check, 500)
      }
    }
    check()
  })
}

// Demo: AI Creates a Simple Scene
async function createAIDemo() {
  console.log('🎬 Starting AI Collaboration Demo...')
  
  const api = await waitForGameEngine()
  
  // Clear any existing scene
  api.scene.clearScene()
  console.log('🧹 Cleared scene')
  
  // Note: This demo shows the API structure
  // In a real scenario, you'd first need to upload assets to use
  console.log('📝 Demo would create objects like this:')
  console.log('api.addObjectToScene("asset-id", 100, 200)')
  console.log('api.moveObject("object-id", 300, 400)')
  console.log('api.animations.bounce("object-id")')
  
  // Show available methods
  console.log('🔧 Available API methods:')
  console.log('- Scene management:', Object.keys(api.scene))
  console.log('- Object manipulation:', ['addObjectToScene', 'moveObject', 'resizeObject', 'rotateObject', 'deleteObject'])
  console.log('- Animations:', Object.keys(api.animations))
  console.log('- Animation templates:', Object.keys(api.animations.templates))
  
  console.log('✅ AI Collaboration Demo complete!')
  console.log('💡 Toggle to Live Mode and click objects to see interactive features!')
}

// Listen for game engine events
window.addEventListener('gameEngineReady', (event) => {
  console.log('🎊 Game Engine is ready for AI collaboration!')
  console.log('📋 Available API:', event.detail)
})

window.addEventListener('gameObjectClicked', (event) => {
  console.log('🖱️ Live Mode - Object clicked:', event.detail)
})

window.addEventListener('gameObjectMoved', (event) => {
  console.log('🏃 Live Mode - Object moved:', event.detail)
})

window.addEventListener('gameObjectRightClicked', (event) => {
  console.log('🖱️ Live Mode - Object right-clicked:', event.detail)
  console.log('💡 This shows the enhanced right-click functionality!')
})

// Auto-run demo when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createAIDemo)
} else {
  createAIDemo()
}

console.log('🤖 AI Demo Script Loaded!')
console.log('💡 Call createAIDemo() to run the demonstration') 