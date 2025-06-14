// 🎬 Animation System for AI/Cursor Control
// This allows programmatic control of object animations and viewport effects

export interface AnimationConfig {
  objectId: string
  duration: number // milliseconds
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bounce'
  loop?: boolean | number // true for infinite, number for specific count
  delay?: number // delay before starting
}

export interface MoveAnimation extends AnimationConfig {
  type: 'move'
  from: { x: number; y: number }
  to: { x: number; y: number }
}

export interface ScaleAnimation extends AnimationConfig {
  type: 'scale'
  from: { width: number; height: number }
  to: { width: number; height: number }
}

export interface RotateAnimation extends AnimationConfig {
  type: 'rotate'
  from: number // degrees
  to: number // degrees
}

export interface FadeAnimation extends AnimationConfig {
  type: 'fade'
  from: number // 0-1 opacity
  to: number // 0-1 opacity
}

export interface ShakeAnimation extends AnimationConfig {
  type: 'shake'
  intensity: number // pixels
  direction: 'horizontal' | 'vertical' | 'both'
}

export interface BounceAnimation extends AnimationConfig {
  type: 'bounce'
  height: number // bounce height in pixels
  gravity: number // bounce decay factor
}

export type Animation = MoveAnimation | ScaleAnimation | RotateAnimation | FadeAnimation | ShakeAnimation | BounceAnimation

export interface ViewportEffect {
  type: 'zoom' | 'shake' | 'flash' | 'fade' | 'slide'
  duration: number
  intensity?: number
  direction?: 'in' | 'out' | 'left' | 'right' | 'up' | 'down'
  color?: string
}

export interface AnimationSequence {
  name: string
  animations: Animation[]
  effects?: ViewportEffect[]
  onComplete?: () => void
}

// Easing functions
export const easingFunctions = {
  linear: (t: number) => t,
  'ease-in': (t: number) => t * t,
  'ease-out': (t: number) => t * (2 - t),
  'ease-in-out': (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  bounce: (t: number) => {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375
    }
  }
}

// Animation manager class
export class AnimationManager {
  private activeAnimations = new Map<string, { animation: Animation; startTime: number; currentLoop: number }>()
  private animationFrame: number | null = null
  private updateCallback: (objectId: string, updates: any) => void
  private viewportCallback: (effect: ViewportEffect) => void

  constructor(
    updateCallback: (objectId: string, updates: any) => void,
    viewportCallback: (effect: ViewportEffect) => void
  ) {
    this.updateCallback = updateCallback
    this.viewportCallback = viewportCallback
  }

  // Start an animation
  startAnimation(animation: Animation): string {
    const animationId = `${animation.objectId}-${animation.type}-${Date.now()}`
    
    this.activeAnimations.set(animationId, {
      animation,
      startTime: Date.now() + (animation.delay || 0),
      currentLoop: 0
    })

    if (!this.animationFrame) {
      this.startAnimationLoop()
    }

    console.log(`🎬 Started ${animation.type} animation for object ${animation.objectId}`)
    return animationId
  }

  // Stop an animation
  stopAnimation(animationId: string): void {
    this.activeAnimations.delete(animationId)
    if (this.activeAnimations.size === 0 && this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }
  }

  // Stop all animations for an object
  stopObjectAnimations(objectId: string): void {
    for (const [id, data] of this.activeAnimations) {
      if (data.animation.objectId === objectId) {
        this.activeAnimations.delete(id)
      }
    }
  }

  // Start animation loop
  private startAnimationLoop(): void {
    const animate = () => {
      const now = Date.now()
      const completedAnimations: string[] = []

      for (const [id, data] of this.activeAnimations) {
        const { animation, startTime, currentLoop } = data
        
        if (now < startTime) continue // Animation hasn't started yet

        const elapsed = now - startTime
        const progress = Math.min(elapsed / animation.duration, 1)
        
        // Apply easing
        const easingFn = easingFunctions[animation.easing || 'ease-out']
        const easedProgress = easingFn(progress)

        // Calculate current values based on animation type
        const updates = this.calculateAnimationFrame(animation, easedProgress)
        
        // Apply updates to object
        this.updateCallback(animation.objectId, updates)

        // Check if animation is complete
        if (progress >= 1) {
          const maxLoops = typeof animation.loop === 'number' ? animation.loop : (animation.loop ? Infinity : 1)
          
          if (currentLoop + 1 < maxLoops) {
            // Restart animation for next loop
            data.startTime = now
            data.currentLoop = currentLoop + 1
          } else {
            completedAnimations.push(id)
          }
        }
      }

      // Remove completed animations
      completedAnimations.forEach(id => this.stopAnimation(id))

      if (this.activeAnimations.size > 0) {
        this.animationFrame = requestAnimationFrame(animate)
      } else {
        this.animationFrame = null
      }
    }

    this.animationFrame = requestAnimationFrame(animate)
  }

  // Calculate animation frame values
  private calculateAnimationFrame(animation: Animation, progress: number): any {
    switch (animation.type) {
      case 'move':
        const moveAnim = animation as MoveAnimation
        return {
          x: moveAnim.from.x + (moveAnim.to.x - moveAnim.from.x) * progress,
          y: moveAnim.from.y + (moveAnim.to.y - moveAnim.from.y) * progress
        }

      case 'scale':
        const scaleAnim = animation as ScaleAnimation
        return {
          width: scaleAnim.from.width + (scaleAnim.to.width - scaleAnim.from.width) * progress,
          height: scaleAnim.from.height + (scaleAnim.to.height - scaleAnim.from.height) * progress
        }

      case 'rotate':
        const rotateAnim = animation as RotateAnimation
        return {
          rotation: rotateAnim.from + (rotateAnim.to - rotateAnim.from) * progress
        }

      case 'fade':
        const fadeAnim = animation as FadeAnimation
        return {
          opacity: fadeAnim.from + (fadeAnim.to - fadeAnim.from) * progress
        }

      case 'shake':
        const shakeAnim = animation as ShakeAnimation
        const intensity = shakeAnim.intensity * (1 - progress) // Decay over time
        const offsetX = shakeAnim.direction !== 'vertical' ? (Math.random() - 0.5) * intensity * 2 : 0
        const offsetY = shakeAnim.direction !== 'horizontal' ? (Math.random() - 0.5) * intensity * 2 : 0
        return {
          x: offsetX,
          y: offsetY,
          isShakeOffset: true // Flag to indicate this is a temporary offset
        }

      case 'bounce':
        const bounceAnim = animation as BounceAnimation
        const bounceHeight = bounceAnim.height * Math.abs(Math.sin(progress * Math.PI * 4)) * (1 - progress * bounceAnim.gravity)
        return {
          y: -bounceHeight,
          isBounceOffset: true
        }

      default:
        return {}
    }
  }

  // Apply viewport effect
  applyViewportEffect(effect: ViewportEffect): void {
    console.log(`🎭 Applying viewport effect: ${effect.type}`)
    this.viewportCallback(effect)
  }

  // Run animation sequence
  async runSequence(sequence: AnimationSequence): Promise<void> {
    console.log(`🎬 Running animation sequence: ${sequence.name}`)
    
    const promises: Promise<void>[] = []

    // Start all animations
    for (const animation of sequence.animations) {
      const promise = new Promise<void>((resolve) => {
        const animationId = this.startAnimation(animation)
        
        // Wait for animation to complete
        const checkComplete = () => {
          if (!this.activeAnimations.has(animationId)) {
            resolve()
          } else {
            setTimeout(checkComplete, 16) // Check every frame
          }
        }
        checkComplete()
      })
      
      promises.push(promise)
    }

    // Apply viewport effects
    if (sequence.effects) {
      for (const effect of sequence.effects) {
        setTimeout(() => this.applyViewportEffect(effect), effect.duration || 0)
      }
    }

    // Wait for all animations to complete
    await Promise.all(promises)
    
    if (sequence.onComplete) {
      sequence.onComplete()
    }
    
    console.log(`✅ Animation sequence "${sequence.name}" completed`)
  }
}

// Pre-built animation templates for common effects
export const animationTemplates = {
  // Object enters from the left
  slideInLeft: (objectId: string, targetX: number, targetY: number): MoveAnimation => ({
    type: 'move',
    objectId,
    duration: 800,
    easing: 'ease-out',
    from: { x: -200, y: targetY },
    to: { x: targetX, y: targetY }
  }),

  // Object bounces in place
  bounce: (objectId: string): BounceAnimation => ({
    type: 'bounce',
    objectId,
    duration: 1000,
    easing: 'ease-out',
    height: 50,
    gravity: 0.8
  }),

  // Object shakes (for emphasis)
  shake: (objectId: string): ShakeAnimation => ({
    type: 'shake',
    objectId,
    duration: 500,
    intensity: 10,
    direction: 'both'
  }),

  // Object grows and shrinks (pulse effect)
  pulse: (objectId: string, originalWidth: number, originalHeight: number): ScaleAnimation => ({
    type: 'scale',
    objectId,
    duration: 600,
    easing: 'ease-in-out',
    loop: true,
    from: { width: originalWidth, height: originalHeight },
    to: { width: originalWidth * 1.2, height: originalHeight * 1.2 }
  }),

  // Object spins
  spin: (objectId: string): RotateAnimation => ({
    type: 'rotate',
    objectId,
    duration: 1000,
    easing: 'linear',
    loop: true,
    from: 0,
    to: 360
  }),

  // Object fades in
  fadeIn: (objectId: string): FadeAnimation => ({
    type: 'fade',
    objectId,
    duration: 500,
    easing: 'ease-in',
    from: 0,
    to: 1
  })
}

// Viewport effect templates
export const viewportEffects = {
  screenShake: (): ViewportEffect => ({
    type: 'shake',
    duration: 300,
    intensity: 15
  }),

  flashWhite: (): ViewportEffect => ({
    type: 'flash',
    duration: 200,
    color: 'white'
  }),

  zoomIn: (): ViewportEffect => ({
    type: 'zoom',
    duration: 500,
    direction: 'in',
    intensity: 1.2
  })
} 