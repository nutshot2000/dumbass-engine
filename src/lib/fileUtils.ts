// File Processing Utilities for Game Engine V2
import { Asset, FileUploadResult } from '@/types'

// Generate unique ID for assets
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Create thumbnail from image file
export const createThumbnail = (file: File, maxSize = 200): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      // Calculate thumbnail dimensions
      const { width, height } = calculateThumbnailSize(img.width, img.height, maxSize)
      
      canvas.width = width
      canvas.height = height

      // Draw resized image
      ctx?.drawImage(img, 0, 0, width, height)
      
      // Convert to base64 - use PNG to preserve transparency
      const thumbnail = canvas.toDataURL('image/png')
      resolve(thumbnail)
    }

    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

// Create high-quality canvas data URL from image file or blob (for editing)
export const createHighQualityDataURL = (fileOrBlob: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      // Use original dimensions for full quality
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight

      // Ensure high-quality rendering
      if (ctx) {
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        
        // Draw at original size for maximum quality
        ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight)
        
        // Convert to high-quality PNG data URL
        const dataURL = canvas.toDataURL('image/png', 1.0) // Maximum quality
        resolve(dataURL)
      } else {
        reject(new Error('Failed to get canvas context'))
      }
    }

    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(fileOrBlob)
  })
}

// Calculate thumbnail dimensions maintaining aspect ratio
const calculateThumbnailSize = (originalWidth: number, originalHeight: number, maxSize: number) => {
  const aspectRatio = originalWidth / originalHeight
  
  if (originalWidth > originalHeight) {
    return {
      width: maxSize,
      height: Math.round(maxSize / aspectRatio)
    }
  } else {
    return {
      width: Math.round(maxSize * aspectRatio),
      height: maxSize
    }
  }
}

// Get image dimensions
export const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      })
    }
    
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

// Validate file type
export const validateFileType = (file: File): boolean => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg'
  ]
  
  return allowedTypes.includes(file.type)
}

// Validate file size (default 10MB)
export const validateFileSize = (file: File, maxSizeInMB = 10): boolean => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024
  return file.size <= maxSizeInBytes
}

// Determine asset type from file
export const getAssetType = (file: File): Asset['type'] => {
  if (file.type.startsWith('image/')) {
    const filename = file.name.toLowerCase()
    if (filename.includes('background') || filename.includes('bg')) {
      return 'background'
    } else if (filename.includes('character') || filename.includes('char')) {
      return 'character'
    } else {
      return 'object'
    }
  } else if (file.type.startsWith('audio/')) {
    return 'audio'
  }
  
  return 'object' // default
}

// Process uploaded file into Asset
export const processFile = async (file: File, generateHighQuality = false): Promise<FileUploadResult> => {
  try {
    // Validate file
    if (!validateFileType(file)) {
      return {
        success: false,
        error: `File type ${file.type} is not supported`
      }
    }

    if (!validateFileSize(file)) {
      return {
        success: false,
        error: 'File size exceeds 10MB limit'
      }
    }

    // Generate thumbnail and get dimensions for images
    let thumbnail = ''
    let highQualityDataURL: string | undefined
    let dimensions = { width: 0, height: 0 }

    if (file.type.startsWith('image/')) {
      try {
        const promises = [
          createThumbnail(file),
          getImageDimensions(file)
        ]
        
        // Optionally generate high-quality data URL for immediate use
        if (generateHighQuality) {
          promises.push(createHighQualityDataURL(file))
        }
        
        const results = await Promise.all(promises)
        thumbnail = results[0] as string
        dimensions = results[1] as { width: number; height: number }
        
        if (generateHighQuality && results[2]) {
          highQualityDataURL = results[2] as string
          console.log(`🎨 Generated high-quality data URL for ${file.name}`)
        }
      } catch (error) {
        return {
          success: false,
          error: 'Failed to process image'
        }
      }
    } else {
      // For audio files, create a simple thumbnail
      thumbnail = 'data:image/svg+xml;base64,' + btoa(`
        <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
          <rect width="200" height="200" fill="#f3f4f6"/>
          <text x="100" y="100" text-anchor="middle" fill="#6b7280" font-family="Arial" font-size="14">Audio</text>
        </svg>
      `)
    }

    // Create Asset object
    const asset: Asset = {
      id: generateId(),
      name: file.name,
      type: getAssetType(file),
      blob: file,
      thumbnail,
      highQualityDataURL,
      metadata: {
        width: dimensions.width,
        height: dimensions.height,
        fileSize: file.size,
        uploadDate: new Date()
      }
    }

    return {
      success: true,
      asset
    }
  } catch (error) {
    console.error('Error processing file:', error)
    return {
      success: false,
      error: 'Failed to process file'
    }
  }
}

// Convert blob to object URL for display (FULL QUALITY for canvas)
export const createObjectURL = (blob: Blob): string => {
  return URL.createObjectURL(blob)
}

// Create optimized image for canvas rendering with high quality settings
export const createCanvasOptimizedImage = (blob: Blob, highQualityDataURL?: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    
    // Enable high-quality rendering
    img.style.imageRendering = 'high-quality'
    img.style.imageRendering = '-webkit-optimize-contrast'
    img.style.imageRendering = 'crisp-edges'
    img.style.imageRendering = 'pixelated'
    
    img.onload = () => {
      console.log(`🖼️ Loaded FULL QUALITY image: ${img.naturalWidth}x${img.naturalHeight} (Original resolution preserved)`)
      resolve(img)
    }
    
    img.onerror = () => reject(new Error('Failed to load image'))
    
    // Use high-quality data URL if available, otherwise use original blob
    if (highQualityDataURL) {
      console.log(`🎨 Using pre-generated high-quality data URL`)
      img.src = highQualityDataURL
    } else {
      console.log(`🎨 Using original blob for high-quality rendering`)
      img.src = URL.createObjectURL(blob)
    }
  })
}

// Generate high-quality data URL for existing asset
export const generateHighQualityDataURLForAsset = async (asset: Asset): Promise<string> => {
  if (asset.highQualityDataURL) {
    return asset.highQualityDataURL
  }
  
  if (asset.type === 'audio') {
    throw new Error('Cannot generate high-quality data URL for audio assets')
  }
  
  return createHighQualityDataURL(asset.blob)
}

// Cleanup object URL
export const revokeObjectURL = (url: string): void => {
  URL.revokeObjectURL(url)
}

// Create optimized version for game export (smaller file size)
export const createOptimizedForExport = (blob: Blob, maxWidth = 1920, quality = 0.8): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      // Calculate optimized dimensions
      const { width, height } = calculateOptimizedSize(img.naturalWidth, img.naturalHeight, maxWidth)
      
      canvas.width = width
      canvas.height = height

      if (ctx) {
        // Use good quality but not maximum for export optimization
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        
        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height)
        
        // Convert to optimized blob
        canvas.toBlob((optimizedBlob) => {
          if (optimizedBlob) {
            console.log(`📦 Optimized for export: ${img.naturalWidth}x${img.naturalHeight} → ${width}x${height}`)
            resolve(optimizedBlob)
          } else {
            reject(new Error('Failed to create optimized blob'))
          }
        }, 'image/jpeg', quality) // Use JPEG with quality setting for smaller files
      } else {
        reject(new Error('Failed to get canvas context'))
      }
    }

    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(blob)
  })
}

// Calculate optimized dimensions for export
const calculateOptimizedSize = (originalWidth: number, originalHeight: number, maxWidth: number) => {
  if (originalWidth <= maxWidth) {
    return { width: originalWidth, height: originalHeight }
  }
  
  const aspectRatio = originalWidth / originalHeight
  return {
    width: maxWidth,
    height: Math.round(maxWidth / aspectRatio)
  }
}

// Format file size for display
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Regenerate thumbnail for existing asset (to fix transparency issues)
export const regenerateThumbnail = (asset: Asset): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!asset.blob || !asset.blob.type.startsWith('image/')) {
      reject(new Error('Asset is not an image'))
      return
    }

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      // Calculate thumbnail dimensions
      const { width, height } = calculateThumbnailSize(img.width, img.height, 200)
      
      canvas.width = width
      canvas.height = height

      // Clear canvas with transparent background
      ctx?.clearRect(0, 0, width, height)
      
      // Draw resized image
      ctx?.drawImage(img, 0, 0, width, height)
      
      // Convert to base64 - use PNG to preserve transparency
      const thumbnail = canvas.toDataURL('image/png')
      resolve(thumbnail)
    }

    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(asset.blob)
  })
}

// Export utility functions
export const fileUtils = {
  generateId,
  createThumbnail,
  getImageDimensions,
  validateFileType,
  validateFileSize,
  getAssetType,
  processFile,
  createObjectURL,
  revokeObjectURL,
  formatFileSize,
  regenerateThumbnail
} 