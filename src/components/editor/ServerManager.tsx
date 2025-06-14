'use client'

import { useState, useEffect } from 'react'

interface ServerStatus {
  status: 'running' | 'stopped' | 'unknown'
  message: string
  port?: number
  pid?: number
}

export default function ServerManager() {
  const [serverStatus, setServerStatus] = useState<ServerStatus>({
    status: 'unknown',
    message: 'Checking server status...'
  })
  const [isLoading, setIsLoading] = useState(false)

  // Check server status on component mount and periodically
  useEffect(() => {
    checkServerStatus()
    const interval = setInterval(checkServerStatus, 5000) // Check every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const checkServerStatus = async () => {
    try {
      const response = await fetch('/api/server')
      const data = await response.json()
      setServerStatus(data)
    } catch (error) {
      setServerStatus({
        status: 'unknown',
        message: 'Failed to check server status'
      })
    }
  }

  const handleServerAction = async (action: 'start' | 'stop') => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/server', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      })
      
      const data = await response.json()
      setServerStatus(data)
      
      // Refresh status after a moment
      setTimeout(checkServerStatus, 1000)
    } catch (error) {
      setServerStatus({
        status: 'unknown',
        message: 'Failed to manage server'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = () => {
    switch (serverStatus.status) {
      case 'running': return 'text-green-600'
      case 'stopped': return 'text-red-600'
      default: return 'text-yellow-600'
    }
  }

  const getStatusIcon = () => {
    switch (serverStatus.status) {
      case 'running': return '🟢'
      case 'stopped': return '🔴'
      default: return '🟡'
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">Game Server</h3>
        <div className="flex items-center space-x-2">
          <span className="text-xs">{getStatusIcon()}</span>
          <span className={`text-xs font-medium ${getStatusColor()}`}>
            {serverStatus.status.toUpperCase()}
          </span>
        </div>
      </div>
      
      <div className="text-xs text-gray-600 mb-3">
        {serverStatus.message}
        {serverStatus.port && (
          <div className="mt-1">
            Port: <span className="font-mono">{serverStatus.port}</span>
          </div>
        )}
      </div>

      <div className="flex space-x-2">
        <button
          onClick={() => handleServerAction('start')}
          disabled={isLoading || serverStatus.status === 'running'}
          className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '⏳' : '▶️'} Start
        </button>
        
        <button
          onClick={() => handleServerAction('stop')}
          disabled={isLoading || serverStatus.status === 'stopped'}
          className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '⏳' : '⏹️'} Stop
        </button>
      </div>

      <div className="mt-2 text-xs text-gray-500">
        Live preview needs this server running on port 3001
      </div>
    </div>
  )
} 