'use client'

import { useEffect, useRef } from 'react'
import { MediaPlayer, MediaProvider, type MediaPlayerInstance } from '@vidstack/react'
import { defaultLayoutIcons, DefaultVideoLayout } from '@vidstack/react/player/layouts/default'

// Import Vidstack default styles
import '@vidstack/react/player/styles/default/theme.css'
import '@vidstack/react/player/styles/default/layouts/video.css'

interface VideoPlayerProps {
  src: string
  onProgress?: (currentTime: number, duration: number) => void
  onEnded?: () => void
  initialTime?: number
  className?: string
  autoPlay?: boolean
}

export default function VideoPlayer({
  src,
  onProgress,
  onEnded,
  initialTime = 0,
  className = '',
  autoPlay = false,
}: VideoPlayerProps) {
  const playerRef = useRef<MediaPlayerInstance>(null)
  const initialTimeSetRef = useRef(false)

  // Reset tracking ref when source changes
  useEffect(() => {
    initialTimeSetRef.current = false
  }, [src])

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
  const playerSource = isHls
    ? { src: resolvedSrc, type: 'application/x-mpegurl' as const }
    : resolvedSrc

  return (
    <div className={`relative w-full aspect-video bg-zinc-950 select-none overflow-hidden group ${className}`}>
      <MediaPlayer
        ref={playerRef}
        src={playerSource}
        onCanPlay={handleCanPlay}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        className="w-full h-full object-contain"
        playsInline
        autoplay={autoPlay}
      >
        <MediaProvider className="w-full h-full object-contain" />
        <DefaultVideoLayout icons={defaultLayoutIcons} noAudioGain />
      </MediaPlayer>
    </div>
  )
}


