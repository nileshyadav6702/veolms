'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  Settings,
  Loader2,
} from 'lucide-react'
interface VideoPlayerProps {
  src: string
  onProgress?: (currentTime: number, duration: number) => void
  onEnded?: () => void
  initialTime?: number
  className?: string
}

export default function VideoPlayer({
  src,
  onProgress,
  onEnded,
  initialTime = 0,
  className = '',
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const [isBuffering, setIsBuffering] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)

  // Track if initial time has been set
  const initialTimeSetRef = useRef(false)

  useEffect(() => {
    // Reset state for new src
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    initialTimeSetRef.current = false
    setHasStarted(false)
  }, [src])

  // Restore initial progress when metadata loads
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
      if (initialTime > 0 && !initialTimeSetRef.current) {
        videoRef.current.currentTime = Math.min(initialTime, videoRef.current.duration - 1)
        initialTimeSetRef.current = true
        setCurrentTime(videoRef.current.currentTime)
      }
    }
  }

  // Handle play/pause
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)
    } else {
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true)
          setHasStarted(true)
        })
        .catch(() => {})
    }
  }, [isPlaying])

  // Format time (e.g. 01:23)
  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return '00:00'
    const mins = Math.floor(timeInSeconds / 60)
    const secs = Math.floor(timeInSeconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Handle time update
  const handleTimeUpdate = () => {
    if (!videoRef.current) return
    const current = videoRef.current.currentTime
    setCurrentTime(current)
    if (onProgress) {
      onProgress(current, videoRef.current.duration)
    }
  }

  // Handle seeking
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return
    const seekTo = parseFloat(e.target.value)
    videoRef.current.currentTime = seekTo
    setCurrentTime(seekTo)
  }

  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    videoRef.current.volume = newVolume
    setIsMuted(newVolume === 0)
    videoRef.current.muted = newVolume === 0
  }

  // Toggle mute
  const toggleMute = () => {
    if (!videoRef.current) return
    const newMuted = !isMuted
    setIsMuted(newMuted)
    videoRef.current.muted = newMuted
    if (!newMuted && volume === 0) {
      setVolume(0.5)
      videoRef.current.volume = 0.5
    }
  }

  // Change speed
  const changeSpeed = (rate: number) => {
    if (!videoRef.current) return
    setPlaybackRate(rate)
    videoRef.current.playbackRate = rate
    setShowSpeedMenu(false)
  }

  // Toggle Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true)
      }).catch(() => {})
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false)
      }).catch(() => {})
    }
  }, [])

  // Auto-hide controls
  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true)
      return
    }

    const handleMouseMove = () => {
      setShowControls(true)
      resetTimeout()
    }

    let timeoutId: NodeJS.Timeout

    const resetTimeout = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        if (isPlaying) setShowControls(false)
      }, 2500)
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener('mousemove', handleMouseMove)
    }
    resetTimeout()

    return () => {
      clearTimeout(timeoutId)
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove)
      }
    }
  }, [isPlaying])

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if focusing an input fields
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return
      }

      if (!videoRef.current) return

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault()
          togglePlay()
          break
        case 'f':
          e.preventDefault()
          toggleFullscreen()
          break
        case 'm':
          e.preventDefault()
          toggleMute()
          break
        case 'arrowleft':
          e.preventDefault()
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5)
          break
        case 'arrowright':
          e.preventDefault()
          videoRef.current.currentTime = Math.min(
            videoRef.current.duration,
            videoRef.current.currentTime + 5
          )
          break
        case 'arrowup':
          e.preventDefault()
          const newVolUp = Math.min(1, videoRef.current.volume + 0.1)
          setVolume(newVolUp)
          videoRef.current.volume = newVolUp
          setIsMuted(false)
          break
        case 'arrowdown':
          e.preventDefault()
          const newVolDown = Math.max(0, videoRef.current.volume - 0.1)
          setVolume(newVolDown)
          videoRef.current.volume = newVolDown
          if (newVolDown === 0) setIsMuted(true)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [togglePlay, toggleFullscreen])

  // Handle Fullscreen state change (e.g. via Escape key)
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`relative w-full aspect-video bg-zinc-950 select-none overflow-hidden group ${
        isFullscreen ? 'fixed inset-0 w-screen h-screen z-50' : ''
      } ${className}`}
    >
      <video
        ref={videoRef}
        src={
          src.includes('localhost:9000')
            ? 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
            : src
        }
        className="w-full h-full object-contain cursor-pointer"
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onEnded={onEnded}
      />

      {/* Buffering */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm z-30 pointer-events-none">
          <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
        </div>
      )}

      {/* Play overlay — shown before first play */}
      {!hasStarted && !isBuffering && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 bg-zinc-950/50 flex flex-col items-center justify-center gap-4 z-20 cursor-pointer group/poster"
        >
          <div className="w-18 h-18 w-[72px] h-[72px] bg-indigo-600 group-hover/poster:bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.4)] transition-all duration-200 group-hover/poster:scale-105 group-hover/poster:shadow-[0_0_60px_rgba(99,102,241,0.5)]">
            <Play className="w-7 h-7 fill-white ml-1" />
          </div>
          <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">
            Click to play
          </span>
        </div>
      )}

      {/* Controls */}
      <div
        className={`absolute inset-x-0 bottom-0 z-20 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Gradient backdrop for controls */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/95 via-zinc-950/50 to-transparent pointer-events-none" />

        <div className="relative px-4 pb-4 pt-10 flex flex-col gap-2">
          {/* Seek scrubber */}
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            style={{ '--progress': `${((currentTime / (duration || 1)) * 100).toFixed(1)}%` } as React.CSSProperties}
            className="w-full h-1 rounded-full appearance-none cursor-pointer outline-none bg-zinc-700 accent-indigo-500 hover:h-[5px] transition-all duration-100"
          />

          {/* Controls row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-zinc-200">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-all"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current" />
                )}
              </button>

              {/* Skip back 10s */}
              <button
                onClick={() => {
                  if (videoRef.current)
                    videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10)
                }}
                className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-all"
                title="Back 10s"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Volume */}
              <div className="flex items-center gap-1.5 group/vol">
                <button
                  onClick={toggleMute}
                  className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-all"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-0 group-hover/vol:w-18 group-hover/vol:w-[72px] transition-all duration-200 h-1 rounded-full appearance-none cursor-pointer bg-zinc-600 accent-indigo-400 outline-none"
                />
              </div>

              {/* Timestamp */}
              <span className="text-[11px] font-mono text-zinc-400 tabular-nums">
                {formatTime(currentTime)}
                <span className="text-zinc-600 mx-0.5">/</span>
                {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2 text-zinc-200">
              {/* Speed */}
              <div className="relative">
                <button
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  className="flex items-center gap-1 text-[11px] font-bold font-mono px-2.5 py-1 bg-zinc-800/80 border border-zinc-700/60 hover:bg-zinc-700/80 hover:border-zinc-600 rounded-lg transition-all"
                >
                  <Settings className="w-3 h-3" />
                  <span>{playbackRate === 1 ? '1x' : `${playbackRate}x`}</span>
                </button>

                {showSpeedMenu && (
                  <div className="absolute right-0 bottom-full mb-2 bg-zinc-900 border border-zinc-700/60 rounded-xl shadow-2xl overflow-hidden min-w-[90px] z-30">
                    {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => changeSpeed(rate)}
                        className={`w-full text-left text-xs px-3 py-2 hover:bg-zinc-800 transition-colors font-mono ${
                          playbackRate === rate
                            ? 'text-indigo-400 font-bold bg-indigo-500/10'
                            : 'text-zinc-300'
                        }`}
                      >
                        {rate === 1 ? '1× Normal' : `${rate}×`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-all"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
