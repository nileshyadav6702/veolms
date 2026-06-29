'use client'

import { useEffect, useRef, useState } from 'react'
import { MediaPlayer, MediaProvider, Track, type MediaPlayerInstance } from '@vidstack/react'
import { defaultLayoutIcons, DefaultVideoLayout } from '@vidstack/react/player/layouts/default'
import { useAuth } from '@/lib/auth-context'

// Import Vidstack default styles
import '@vidstack/react/player/styles/default/theme.css'
import '@vidstack/react/player/styles/default/layouts/video.css'

export interface SubtitleTrack {
  lang: string
  label: string
  url: string
}

interface VideoPlayerProps {
  src: string
  type?: string
  subtitles?: SubtitleTrack[]
  onProgress?: (currentTime: number, duration: number) => void
  onEnded?: () => void
  initialTime?: number
  className?: string
  autoPlay?: boolean
}

export default function VideoPlayer({
  src,
  type,
  subtitles = [],
  onProgress,
  onEnded,
  initialTime = 0,
  className = '',
  autoPlay = false,
}: VideoPlayerProps) {
  const { user } = useAuth()
  const playerRef = useRef<MediaPlayerInstance>(null)
  const initialTimeSetRef = useRef(false)
  const [watermarkPos, setWatermarkPos] = useState({ top: '15%', left: '15%' })
  const [isTabFocused, setIsTabFocused] = useState(true)
  const [isBlackout, setIsBlackout] = useState(false)

  // Capture screenshot shortcuts to trigger instant blackout
  useEffect(() => {
    let timeoutId: any;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      const isPrintScreen = e.key === 'PrintScreen'
      const isCtrlShiftS = e.ctrlKey && e.shiftKey && (e.key === 's' || e.key === 'S')
      const isMetaShiftS = e.metaKey && e.shiftKey && (e.key === 's' || e.key === 'S')

      if (isPrintScreen || isCtrlShiftS || isMetaShiftS) {
        e.preventDefault()
        setIsBlackout(true)
        if (playerRef.current && !playerRef.current.paused) {
          playerRef.current.pause()
        }

        if (timeoutId) clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
          setIsBlackout(false)
        }, 3000) // Keep screen black for 3 seconds to disrupt screenshotting
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [])

  // Reset tracking ref when source changes
  useEffect(() => {
    initialTimeSetRef.current = false
  }, [src])

  // Periodic watermark position updates to deter static screenshot crop
  useEffect(() => {
    const updatePosition = () => {
      const top = Math.floor(Math.random() * 70) + 15 // 15% to 85%
      const left = Math.floor(Math.random() * 60) + 15 // 15% to 75%
      setWatermarkPos({ top: `${top}%`, left: `${left}%` })
    }
    const interval = setInterval(updatePosition, 7000) // Change position every 7 seconds
    return () => clearInterval(interval)
  }, [])

  // Tab focus detection to block screen recording of inactive tabs/windows
  useEffect(() => {
    const handleFocus = () => {
      setIsTabFocused(true)
      if (playerRef.current && playerRef.current.paused) {
        playerRef.current.play().catch(() => {})
      }
    }
    const handleBlur = () => {
      setIsTabFocused(false)
      if (playerRef.current && !playerRef.current.paused) {
        playerRef.current.pause()
      }
    }

    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)
    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
    }
  }, [])

  const handleCanPlay = () => {
    if (playerRef.current && initialTime > 0 && !initialTimeSetRef.current) {
      playerRef.current.currentTime = Math.min(initialTime, playerRef.current.duration - 1)
      initialTimeSetRef.current = true
    }
  }

  const handleTimeUpdate = (detail: { currentTime: number }) => {
    if (onProgress && playerRef.current) {
      onProgress(detail.currentTime, playerRef.current.duration)
    }
  }

  const handleEnded = () => {
    if (onEnded) {
      onEnded()
    }
  }

  // Fallback url for development (using a multi-quality HLS stream to test quality selection)
  const resolvedSrc = src.includes('localhost:9000')
    ? 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
    : src

  // Explicitly identify HLS URLs to load the HLS provider (query parameters like ?token=... mask the file extension)
  const isHls = resolvedSrc.includes('.m3u8') || resolvedSrc.includes('/hls/')
  const isBlob = resolvedSrc.startsWith('blob:')
  const playerSource = isHls
    ? { src: resolvedSrc, type: 'application/x-mpegurl' as const }
    : type
    ? { src: resolvedSrc, type: type as any }
    : isBlob
    ? { src: resolvedSrc, type: 'video/mp4' as const }
    : resolvedSrc

  const watermarkText = user 
    ? `${user.email} | Student ID: ${user.id.slice(-6)}` 
    : 'Guest Session | Preview Video'

  return (
    <div 
      className={`relative w-full aspect-video bg-zinc-950 select-none overflow-hidden group no-print ${className}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      <MediaPlayer
        ref={playerRef}
        src={playerSource}
        onCanPlay={handleCanPlay}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        className="w-full h-full object-contain"
        playsInline
        autoplay={autoPlay}
        crossOrigin
      >
        <MediaProvider className="w-full h-full object-contain">
          {subtitles.map((track) => (
            <Track
              key={track.url}
              src={track.url}
              kind="subtitles"
              label={track.label}
              lang={track.lang}
            />
          ))}
        </MediaProvider>
        <DefaultVideoLayout icons={defaultLayoutIcons} noAudioGain />

        {/* Dynamic Security Watermark to prevent screen recording sharing */}
        <div 
          className="absolute pointer-events-none select-none text-[10px] md:text-xs font-mono text-white/35 z-40 transition-all duration-1000 ease-in-out"
          style={{
            top: watermarkPos.top,
            left: watermarkPos.left,
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
          }}
        >
          {watermarkText}
        </div>

        {/* Static Secondary Watermark in bottom-right corner to prevent cropping */}
        <div 
          className="absolute bottom-4 right-4 pointer-events-none select-none text-[9px] md:text-[11px] font-mono text-white/25 z-40"
          style={{
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
          }}
        >
          {watermarkText}
        </div>

        {/* Screenshot Blackout Security Overlay */}
        {isBlackout && (
          <div className="absolute inset-0 bg-black z-[50] flex flex-col items-center justify-center text-center p-4">
            <p className="text-red-500 text-sm md:text-base font-semibold">Screenshot / Recording Attempted</p>
            <p className="text-zinc-500 text-xs mt-1">Screen capturing is strictly prohibited. Your session is monitored.</p>
          </div>
        )}

        {/* Tab blur security overlay */}
        {!isTabFocused && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col items-center justify-center text-center p-4">
            <p className="text-zinc-200 text-sm md:text-base font-semibold">Playback Paused</p>
            <p className="text-zinc-500 text-xs mt-1">Keep this browser tab focused for security verification.</p>
          </div>
        )}
      </MediaPlayer>
    </div>
  )
}


