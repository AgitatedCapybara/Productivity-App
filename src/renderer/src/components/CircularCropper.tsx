// src/renderer/src/components/CircularCropper.tsx
import React, { useState, useEffect, useRef } from 'react'

interface CircularCropperProps {
  imageSrc: string
  onSave: (croppedBase64: string) => void
  onCancel: () => void
}

export function CircularCropper({ imageSrc, onSave, onCancel }: CircularCropperProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [zoom, setZoom] = useState<number>(1.2)
  const [posX, setPosX] = useState<number>(0)
  const [posY, setPosY] = useState<number>(0)
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = imageSrc
    img.onload = () => {
      setImageObj(img)
      setPosX(0)
      setPosY(0)
      setZoom(1.2)
    }
  }, [imageSrc])

  // Clear/draw loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !imageObj) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, 160, 160)
    ctx.save()

    // Circular clip path bounds
    ctx.beginPath()
    ctx.arc(80, 80, 80, 0, Math.PI * 2)
    ctx.clip()

    // Base background fill
    ctx.fillStyle = '#141416'
    ctx.fillRect(0, 0, 160, 160)

    // Displacement translate & scale
    ctx.translate(80 + posX, 80 + posY)
    ctx.scale(zoom, zoom)

    // Fit calculations: keep ratio centered
    const w = imageObj.width
    const h = imageObj.height
    const aspect = w / h
    let dw = 120
    let dh = 120
    if (aspect > 1) {
      dh = 120 / aspect
    } else {
      dw = 120 * aspect
    }

    ctx.drawImage(imageObj, -dw / 2, -dh / 2, dw, dh)
    
    ctx.restore()
  }, [imageObj, zoom, posX, posY])

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    setPosX(prev => prev + dx)
    setPosY(prev => prev + dy)
    dragStart.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleExport = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const base64 = canvas.toDataURL('image/png')
    onSave(base64)
  }

  return (
    <div className="flex flex-col items-center p-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl w-full" id="circular-cropper-element">
      <span className="text-[10px] text-zinc-400 font-semibold mb-3 select-none">Drag image inside circles or drag zoom slider</span>
      
      <div 
        className="w-40 h-40 rounded-full overflow-hidden border-2 border-indigo-500/20 hover:border-indigo-500/50 active:cursor-grabbing cursor-grab transition-colors select-none relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <canvas 
          ref={canvasRef} 
          width={160} 
          height={160} 
          className="w-full h-full pointer-events-none"
        />
      </div>

      {/* Control Sliders */}
      <div className="w-full mt-4 space-y-3">
        <div className="flex flex-col gap-1 w-full">
          <div className="flex justify-between text-[10px] text-zinc-400 font-medium">
            <span>Zoom Scale ({Math.round(zoom * 100)}%)</span>
            <button 
              type="button" 
              onClick={() => { setZoom(1.2); setPosX(0); setPosY(0); }} 
              className="text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer font-sans"
            >
              Reset view
            </button>
          </div>
          <input 
            type="range"
            min="0.5"
            max="4.0"
            step="0.02"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-full accent-indigo-500 bg-zinc-800 rounded-lg cursor-pointer h-1"
          />
        </div>

        {/* Crops Confirmation */}
        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-900 md:gap-2">
          <button 
            type="button" 
            onClick={onCancel} 
            className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 hover:text-zinc-200 px-3.5 py-2.5 rounded-xl border border-zinc-900 hover:bg-zinc-950/40 transition-colors h-9 flex items-center justify-center cursor-pointer font-sans"
          >
            Cancel Crop
          </button>
          <button 
            type="button" 
            onClick={handleExport} 
            className="text-[10px] uppercase tracking-wider font-bold bg-indigo-650 hover:bg-indigo-600 text-indigo-50 px-3.5 py-2.5 rounded-xl transition-all h-9 flex items-center justify-center cursor-pointer font-sans"
          >
            Apply Visual Crop
          </button>
        </div>
      </div>
    </div>
  )
}
