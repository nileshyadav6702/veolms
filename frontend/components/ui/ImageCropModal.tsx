'use client'

import React, { useState, useEffect, useRef } from 'react'
import { X, Minus, Plus, RefreshCw } from 'lucide-react'
import Button from './Button'
import Card from './Card'

interface ImageCropModalProps {
  isOpen: boolean
  imageSrc: string
  onCrop: (croppedBlob: Blob) => void
  onClose: () => void
  targetWidth?: number
  targetHeight?: number
}

export default function ImageCropModal({
  isOpen,
  imageSrc,
  onCrop,
  onClose,
  targetWidth = 1280,
  targetHeight = 720,
}: ImageCropModalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)

  // Layout fitted size inside the client container
  const [fittedWidth, setFittedWidth] = useState(0)
  const [fittedHeight, setFittedHeight] = useState(0)
  const [containerWidth, setContainerWidth] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)

  // Refs for tracking mouse/touch dragging
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const panStart = useRef({ x: 0, y: 0 })

  // Initialize and compute fitted image size
  const initDimensions = () => {
    const container = containerRef.current
    const img = imgRef.current
    if (!container || !img) return

    const W_c = container.clientWidth
    const H_c = container.clientHeight
    const W_n = img.naturalWidth
    const H_n = img.naturalHeight

    if (!W_n || !H_n) return

    setContainerWidth(W_c)
    setContainerHeight(H_c)

    const AR_c = W_c / H_c
    const AR_i = W_n / H_n

    let W_f = 0
    let H_f = 0

    if (AR_i > AR_c) {
      // Image is wider than crop box: match height, overflow width
      H_f = H_c
      W_f = H_c * AR_i
    } else {
      // Image is taller than crop box: match width, overflow height
      W_f = W_c
      H_f = W_c / AR_i
    }

    setFittedWidth(W_f)
    setFittedHeight(H_f)
    setZoom(1)
    setPanX(0)
    setPanY(0)
    setIsLoaded(true)
  }

  // Handle image loading trigger
  useEffect(() => {
    if (isOpen && imageSrc) {
      setIsLoaded(false)
      // Small timeout to allow modal animation / DOM mounting to complete
      const t = setTimeout(() => {
        if (imgRef.current && imgRef.current.complete) {
          initDimensions()
        }
      }, 150)
      return () => clearTimeout(t)
    }
  }, [isOpen, imageSrc])

  // Recalculate if window resizes (keeps the cropper responsive)
  useEffect(() => {
    if (!isOpen) return
    window.addEventListener('resize', initDimensions)
    return () => window.removeEventListener('resize', initDimensions)
  }, [isOpen, isLoaded])

  // Constrain pan offset helper to keep image covering the crop box
  const getConstrainedPan = (x: number, y: number, currentZoom: number) => {
    const W_s = fittedWidth * currentZoom
    const H_s = fittedHeight * currentZoom

    const limitX = Math.max(0, (W_s - containerWidth) / 2)
    const limitY = Math.max(0, (H_s - containerHeight) / 2)

    return {
      x: Math.max(-limitX, Math.min(limitX, x)),
      y: Math.max(-limitY, Math.min(limitY, y)),
    }
  }

  // Handle Zoom state change with constraint recalculation
  const handleZoomChange = (newZoom: number) => {
    const clampedZoom = Math.max(1, Math.min(3, newZoom))
    setZoom(clampedZoom)

    const constrained = getConstrainedPan(panX, panY, clampedZoom)
    setPanX(constrained.x)
    setPanY(constrained.y)
  }

  // Handle Mouse Drag Start
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!isLoaded) return
    isDragging.current = true
    dragStart.current = { x: e.clientX, y: e.clientY }
    panStart.current = { x: panX, y: panY }
  }

  // Handle Mouse Drag Move
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y

    const newX = panStart.current.x + dx
    const newY = panStart.current.y + dy

    const constrained = getConstrainedPan(newX, newY, zoom)
    setPanX(constrained.x)
    setPanY(constrained.y)
  }

  const handleMouseUp = () => {
    isDragging.current = false
  }

  // Handle Touch/Mobile Drag Start
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isLoaded || e.touches.length !== 1) return
    isDragging.current = true
    const touch = e.touches[0]
    dragStart.current = { x: touch.clientX, y: touch.clientY }
    panStart.current = { x: panX, y: panY }
  }

  // Handle Touch/Mobile Drag Move
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || e.touches.length !== 1) return
    const touch = e.touches[0]
    const dx = touch.clientX - dragStart.current.x
    const dy = touch.clientY - dragStart.current.y

    const newX = panStart.current.x + dx
    const newY = panStart.current.y + dy

    const constrained = getConstrainedPan(newX, newY, zoom)
    setPanX(constrained.x)
    setPanY(constrained.y)
  }

  // Mouse wheel zooming support
  const handleWheel = (e: React.WheelEvent) => {
    if (!isLoaded) return
    e.preventDefault()
    const zoomFactor = -e.deltaY * 0.001
    handleZoomChange(zoom + zoomFactor)
  }

  // Reset helper
  const handleReset = () => {
    setZoom(1)
    setPanX(0)
    setPanY(0)
  }

  // Apply Crop Action
  const handleSaveCrop = () => {
    const img = imgRef.current
    if (!img || !isLoaded) return

    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Fill background with black (prevents transparent artifact rendering issues)
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, targetWidth, targetHeight)

    // Calculate layout mappings
    const W_s = fittedWidth * zoom
    const H_s = fittedHeight * zoom
    const X_0 = (containerWidth - W_s) / 2
    const Y_0 = (containerHeight - H_s) / 2

    const X_t = X_0 + panX
    const Y_t = Y_0 + panY

    // Scaling ratio from responsive container to output resolution
    const scaleCanvas = targetWidth / containerWidth

    ctx.drawImage(
      img,
      X_t * scaleCanvas,
      Y_t * scaleCanvas,
      W_s * scaleCanvas,
      H_s * scaleCanvas
    )

    canvas.toBlob((blob) => {
      if (blob) {
        onCrop(blob)
      }
    }, 'image/jpeg', 0.9)
  }

  if (!isOpen) return null

  // Calculate centered transforms for the UI preview
  const W_s = fittedWidth * zoom
  const H_s = fittedHeight * zoom
  const X_0 = (containerWidth - W_s) / 2
  const Y_0 = (containerHeight - H_s) / 2
  const leftPos = X_0 + panX
  const topPos = Y_0 + panY

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-fade-in">
      <Card
        className="w-full max-w-lg bg-zinc-900 border border-zinc-800 text-white rounded-2xl shadow-2xl overflow-hidden relative z-10"
        padding="none"
      >
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div>
              <span className="font-mono text-[9px] text-indigo-400 font-bold uppercase tracking-wider">
                Image Processing
              </span>
              <h3 className="font-bold text-zinc-100 text-base mt-0.5">
                Crop Thumbnail Image
              </h3>
            </div>
            <span className="text-[10px] bg-zinc-800 text-zinc-300 font-mono font-bold px-2 py-0.5 rounded border border-zinc-700">
              {targetWidth}x{targetHeight} (16:9)
            </span>
          </div>

          {/* Crop Container */}
          <div className="space-y-2">
            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUp}
              onWheel={handleWheel}
              className="w-full aspect-video bg-zinc-950 relative overflow-hidden rounded-xl border border-zinc-850 cursor-grab active:cursor-grabbing select-none"
            >
              {/* Image Preview */}
              {imageSrc && (
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt="Source Crop Preview"
                  onLoad={initDimensions}
                  className="absolute pointer-events-none max-w-none"
                  style={{
                    width: isLoaded ? `${W_s}px` : 'auto',
                    height: isLoaded ? `${H_s}px` : 'auto',
                    left: `${leftPos}px`,
                    top: `${topPos}px`,
                    opacity: isLoaded ? 1 : 0,
                    transition: isLoaded ? 'opacity 0.2s ease-in-out' : 'none',
                  }}
                />
              )}

              {/* Crop Grid Overlay */}
              <div className="absolute inset-0 pointer-events-none border border-white/20">
                {/* Horizontal lines */}
                <div className="absolute top-1/3 left-0 right-0 border-b border-dashed border-white/20" />
                <div className="absolute top-2/3 left-0 right-0 border-b border-dashed border-white/20" />
                {/* Vertical lines */}
                <div className="absolute left-1/3 top-0 bottom-0 border-r border-dashed border-white/20" />
                <div className="absolute left-2/3 top-0 bottom-0 border-r border-dashed border-white/20" />
              </div>

              {/* Loading indicator */}
              {!isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            <p className="text-[10px] text-zinc-400 text-center">
              Drag image to reposition • Scroll or use slider below to zoom
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between gap-4 bg-zinc-950/40 p-3 rounded-lg border border-zinc-850">
            <button
              onClick={handleReset}
              className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-750 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title="Reset Crop Position"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            <div className="flex items-center gap-2 flex-1 max-w-xs">
              <Minus className="w-3.5 h-3.5 text-zinc-500" />
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={zoom}
                onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 bg-zinc-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
              <Plus className="w-3.5 h-3.5 text-zinc-500" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-zinc-750 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs px-4"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveCrop}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-5 border-none"
            >
              Apply Crop
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
