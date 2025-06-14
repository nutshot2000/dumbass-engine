/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Exclude Konva from server-side rendering
    if (isServer) {
      config.externals = [...(config.externals || []), 'konva']
    }

    // Handle canvas module for client-side
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
      fs: false,
    }

    return config
  },
}

module.exports = nextConfig 