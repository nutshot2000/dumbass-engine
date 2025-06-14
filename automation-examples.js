// 🤖 Game Engine Automation Examples
// These scripts can be run in the browser console or by Cursor/AI tools

// Wait for the API to be ready
const waitForAPI = () => {
  return new Promise((resolve) => {
    const check = () => {
      if (window.gameEngineAPI) {
        resolve(window.gameEngineAPI)
      } else {
        setTimeout(check, 100)
      }
    }
    check()
  })
}

// Example 1: Create a TikTok meme automatically
async function createTikTokMeme() {
  const api = await waitForAPI()
  
  console.log('🎬 Creating TikTok meme...')
  
  // Set TikTok viewport
  await api.setViewport('tiktok')
  
  // Example meme creation (you'd need actual asset IDs)
  await api.createMeme({
    template: 'tiktok',
    characters: [
      { assetId: 'biden-asset-id', x: 100, y: 200, scale: 1.2 },
      { assetId: 'trump-asset-id', x: 600, y: 300, scale: 1.0 }
    ]
  })
  
  console.log('✅ TikTok meme created!')
}

// Example 2: Batch upload and organize assets
async function organizeAssets() {
  const api = await waitForAPI()
  
  console.log('📁 Organizing assets...')
  
  // Rename assets to be more descriptive
  const assetRenames = [
    { id: 'asset1', name: 'Biden Pointing' },
    { id: 'asset2', name: 'Trump Thumbs Up' },
    { id: 'asset3', name: 'AOC Surprised' }
  ]
  
  for (const asset of assetRenames) {
    await api.renameAsset(asset.id, asset.name)
  }
  
  console.log('✅ Assets organized!')
}

// Example 3: Create multiple memes for different platforms
async function createMultiPlatformMemes() {
  const api = await waitForAPI()
  
  const platforms = [
    { name: 'TikTok', template: 'tiktok' },
    { name: 'Instagram', template: 'instagram' },
    { name: 'YouTube', template: 'youtube' }
  ]
  
  for (const platform of platforms) {
    console.log(`📱 Creating ${platform.name} meme...`)
    
    await api.createMeme({
      template: platform.template,
      characters: [
        { assetId: 'main-character', x: 200, y: 300, scale: 1.0 }
      ]
    })
    
    // Save the scene
    await api.saveScene()
    
    // Create new scene for next platform
    await api.createScene(`${platform.name} Meme ${Date.now()}`)
  }
  
  console.log('✅ Multi-platform memes created!')
}

// Example 4: Puppeteer automation script (for external control)
const puppeteerExample = `
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  // Navigate to your game engine
  await page.goto('http://localhost:3000');
  
  // Wait for the automation API to be ready
  await page.waitForFunction(() => window.gameEngineAPI);
  
  // Execute automation commands
  await page.evaluate(async () => {
    const api = window.gameEngineAPI;
    
    // Set viewport to TikTok
    await api.setViewport('tiktok');
    
    // Create a meme
    await api.createMeme({
      template: 'tiktok',
      characters: [
        { assetId: 'your-asset-id', x: 100, y: 200 }
      ]
    });
    
    console.log('Meme created via Puppeteer!');
  });
  
  await browser.close();
})();
`

// Example 5: Cursor AI prompt templates
const cursorPrompts = {
  createMeme: `
    Use the game engine API to create a meme:
    1. Set viewport to TikTok format
    2. Add Biden asset at position (200, 300)
    3. Add Trump asset at position (600, 400)
    4. Save the scene
    
    Code: window.gameEngineAPI.setViewport('tiktok')
  `,
  
  batchProcess: `
    Automate multiple operations:
    1. Upload 5 political meme images
    2. Rename them with descriptive names
    3. Create scenes for each social platform
    4. Position assets optimally for each format
    
    Use: window.gameEngineAPI.batchProcess([...operations])
  `,
  
  organizeLibrary: `
    Clean up the asset library:
    1. Rename all assets with proper names
    2. Delete unused assets
    3. Categorize by type (politicians, backgrounds, etc.)
    
    Use the renameAsset and deleteAsset functions
  `
}

// 🎬 ANIMATION EXAMPLES
// Make objects move, bounce, spin, and create viewport effects!

// Example 1: Make an object slide in from the left
async function slideInCharacter() {
  const api = await waitForAPI()
  const objects = await api.scene.getObjects()
  if (objects.length === 0) {
    console.log('❌ No objects in scene. Add some first!')
    return
  }
  
  const objectId = objects[0].id
  console.log('🎬 Making object slide in from left...')
  
  // Move object off-screen first
  await api.moveObject(objectId, -200, objects[0].y)
  
  // Animate slide in
  api.animations.templates.slideInLeft(objectId, 300, objects[0].y)
  
  console.log('✅ Object sliding in!')
}

// Example 2: Make an object bounce
async function bounceObject() {
  const api = await waitForAPI()
  const objects = api.scene.getObjects()
  if (objects.length === 0) {
    console.log('❌ No objects in scene')
    return
  }
  
  console.log('🦘 Making object bounce...')
  api.animations.templates.bounce(objects[0].id)
}

// Example 3: Shake an object for emphasis
async function shakeObject() {
  const api = await waitForAPI()
  const objects = api.scene.getObjects()
  if (objects.length === 0) {
    console.log('❌ No objects in scene')
    return
  }
  
  console.log('📳 Shaking object...')
  api.animations.templates.shake(objects[0].id)
}

// Example 4: Make an object pulse (grow and shrink)
async function pulseObject() {
  const api = await waitForAPI()
  const objects = api.scene.getObjects()
  if (objects.length === 0) {
    console.log('❌ No objects in scene')
    return
  }
  
  console.log('💓 Making object pulse...')
  api.animations.templates.pulse(objects[0].id)
}

// Example 5: Spin an object continuously
async function spinObject() {
  const api = await waitForAPI()
  const objects = api.scene.getObjects()
  if (objects.length === 0) {
    console.log('❌ No objects in scene')
    return
  }
  
  console.log('🌪️ Spinning object...')
  api.animations.templates.spin(objects[0].id)
}

// Example 6: Fade in an object
async function fadeInObject() {
  const api = await waitForAPI()
  const objects = api.scene.getObjects()
  if (objects.length === 0) {
    console.log('❌ No objects in scene')
    return
  }
  
  console.log('👻 Fading in object...')
  api.animations.templates.fadeIn(objects[0].id)
}

// Example 7: Move object to specific position smoothly
async function moveToPosition() {
  const api = await waitForAPI()
  const objects = api.scene.getObjects()
  if (objects.length === 0) {
    console.log('❌ No objects in scene')
    return
  }
  
  console.log('🎯 Moving object to center...')
  api.animations.templates.moveToPosition(objects[0].id, 400, 300, 1500) // 1.5 seconds
}

// Example 8: Scale object to new size
async function scaleObject() {
  const api = await waitForAPI()
  const objects = api.scene.getObjects()
  if (objects.length === 0) {
    console.log('❌ No objects in scene')
    return
  }
  
  console.log('📏 Scaling object...')
  api.animations.templates.scaleToSize(objects[0].id, 300, 300, 1000) // Make it 300x300
}

// Example 9: Rotate object to specific angle
async function rotateObject() {
  const api = await waitForAPI()
  const objects = api.scene.getObjects()
  if (objects.length === 0) {
    console.log('❌ No objects in scene')
    return
  }
  
  console.log('🔄 Rotating object...')
  api.animations.templates.rotateTo(objects[0].id, 45, 800) // Rotate to 45 degrees
}

// Example 10: Viewport effects - shake the screen
async function shakeScreen() {
  const api = await waitForAPI()
  console.log('📳 Shaking the screen...')
  api.animations.viewport.shake(20, 500) // Intensity 20, duration 500ms
}

// Example 11: Flash the screen white
async function flashScreen() {
  const api = await waitForAPI()
  console.log('⚡ Flashing screen...')
  api.animations.viewport.flash('white', 300)
}

// Example 12: Zoom in effect
async function zoomIn() {
  const api = await waitForAPI()
  console.log('🔍 Zooming in...')
  api.animations.viewport.zoom('in', 1.5, 600)
}

// Example 13: Complex animation sequence
async function dramaticEntrance() {
  const api = await waitForAPI()
  const objects = api.scene.getObjects()
  if (objects.length === 0) {
    console.log('❌ No objects in scene')
    return
  }
  
  console.log('🎭 Creating dramatic entrance...')
  
  const objectId = objects[0].id
  
  // Create animation sequence
  const sequence = {
    name: 'Dramatic Entrance',
    animations: [
      // Start off-screen and fade in
      {
        type: 'move',
        objectId,
        duration: 0,
        from: { x: -200, y: objects[0].y },
        to: { x: -200, y: objects[0].y }
      },
      {
        type: 'fade',
        objectId,
        duration: 0,
        from: 0,
        to: 0
      },
      // Slide in and fade in simultaneously
      {
        type: 'move',
        objectId,
        duration: 1000,
        easing: 'ease-out',
        from: { x: -200, y: objects[0].y },
        to: { x: 300, y: objects[0].y }
      },
      {
        type: 'fade',
        objectId,
        duration: 800,
        easing: 'ease-in',
        from: 0,
        to: 1
      },
      // Then bounce
      {
        type: 'bounce',
        objectId,
        duration: 1000,
        delay: 1000,
        height: 50,
        gravity: 0.8
      }
    ],
    effects: [
      // Flash when object appears
      {
        type: 'flash',
        duration: 200,
        color: 'yellow'
      },
      // Shake when bounce starts
      {
        type: 'shake',
        duration: 300,
        intensity: 10
      }
    ]
  }
  
  await api.animations.sequence(sequence)
  console.log('✅ Dramatic entrance complete!')
}

// Example 14: Stop all animations
async function stopAllAnimations() {
  const api = await waitForAPI()
  const objects = api.scene.getObjects()
  objects.forEach(obj => {
    api.animations.stopObject(obj.id)
  })
  console.log('⏹️ Stopped all animations')
}

// Example 15: Create a dancing character
async function danceParty() {
  const api = await waitForAPI()
  const objects = api.scene.getObjects()
  if (objects.length === 0) {
    console.log('❌ No objects in scene')
    return
  }
  
  console.log('💃 Starting dance party...')
  
  const objectId = objects[0].id
  
  // Combine multiple animations for dancing effect
  api.animations.templates.bounce(objectId)
  
  setTimeout(() => {
    api.animations.templates.spin(objectId)
  }, 500)
  
  setTimeout(() => {
    api.animations.templates.pulse(objectId)
  }, 1000)
  
  // Add screen effects
  setTimeout(() => {
    api.animations.viewport.flash('rainbow', 100)
  }, 1500)
}

// 🎮 QUICK ANIMATION COMMANDS
// Copy and paste these into the console for instant effects!

console.log(`
🎬 ANIMATION COMMANDS - Copy and paste these:

// Basic animations:
slideInCharacter()     // Slide object from left
bounceObject()         // Make object bounce
shakeObject()          // Shake object
pulseObject()          // Pulse (grow/shrink)
spinObject()           // Spin continuously
fadeInObject()         // Fade in

// Precise movements:
moveToPosition()       // Move to center smoothly
scaleObject()          // Scale to 300x300
rotateObject()         // Rotate to 45 degrees

// Viewport effects:
shakeScreen()          // Shake the screen
flashScreen()          // Flash white
zoomIn()               // Zoom in effect

// Complex sequences:
dramaticEntrance()     // Multi-step entrance
danceParty()           // Multiple animations

// Control:
stopAllAnimations()    // Stop everything

// Custom animation example:
api.animations.animate({
  type: 'move',
  objectId: api.scene.getObjects()[0]?.id,
  duration: 2000,
  easing: 'bounce',
  from: { x: 100, y: 100 },
  to: { x: 500, y: 400 }
})
`)

// Export for use
if (typeof module !== 'undefined') {
  module.exports = {
    createTikTokMeme,
    organizeAssets,
    createMultiPlatformMemes,
    puppeteerExample,
    cursorPrompts,
    waitForAPI
  }
}

// Make functions globally available for console use
window.automationExamples = {
  createTikTokMeme,
  organizeAssets,
  createMultiPlatformMemes,
  waitForAPI
}

console.log('🤖 Automation examples loaded! Try:')
console.log('- automationExamples.createTikTokMeme()')
console.log('- automationExamples.organizeAssets()')
console.log('- automationExamples.createMultiPlatformMemes()') 