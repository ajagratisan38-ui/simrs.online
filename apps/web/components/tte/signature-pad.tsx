'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Eraser, Undo2 } from 'lucide-react'

interface SignaturePadProps {
  onSave: (dataUrl: string) => void
  width?: number
  height?: number
  className?: string
}

interface Point {
  x: number
  y: number
}

export function SignaturePad({
  onSave,
  width = 400,
  height = 200,
  className = '',
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [history, setHistory] = useState<ImageData[]>([])
  const lastPoint = useRef<Point | null>(null)

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return null
    return canvas.getContext('2d')
  }, [])

  const saveState = useCallback(() => {
    const ctx = getCtx()
    const canvas = canvasRef.current
    if (!ctx || !canvas) return
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    setHistory((prev) => [...prev.slice(-20), imageData])
  }, [getCtx])

  const getPosition = useCallback(
    (e: React.MouseEvent | React.TouchEvent): Point => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height

      if ('touches' in e) {
        const touch = e.touches[0]
        return {
          x: (touch.clientX - rect.left) * scaleX,
          y: (touch.clientY - rect.top) * scaleY,
        }
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      }
    },
    [],
  )

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault()
      saveState()
      const pos = getPosition(e)
      lastPoint.current = pos
      setIsDrawing(true)
    },
    [getPosition, saveState],
  )

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault()
      if (!isDrawing || !lastPoint.current) return
      const ctx = getCtx()
      if (!ctx) return

      const pos = getPosition(e)

      ctx.beginPath()
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.stroke()

      lastPoint.current = pos
      setHasDrawn(true)
    },
    [isDrawing, getPosition, getCtx],
  )

  const stopDrawing = useCallback(() => {
    setIsDrawing(false)
    lastPoint.current = null

    if (hasDrawn) {
      const canvas = canvasRef.current
      if (canvas) {
        onSave(canvas.toDataURL('image/png'))
      }
    }
  }, [hasDrawn, onSave])

  const clearCanvas = useCallback(() => {
    const ctx = getCtx()
    const canvas = canvasRef.current
    if (!ctx || !canvas) return
    saveState()
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
    onSave('')
  }, [getCtx, saveState, onSave])

  const undo = useCallback(() => {
    const ctx = getCtx()
    const canvas = canvasRef.current
    if (!ctx || !canvas || history.length === 0) return

    const prev = history[history.length - 1]
    ctx.putImageData(prev, 0, 0)
    setHistory((h) => h.slice(0, -1))

    // Check if canvas is blank after undo
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const isBlank = imageData.data.every((v, i) => i % 4 === 3 ? v === 0 : true)
    if (isBlank) {
      setHasDrawn(false)
      onSave('')
    } else {
      onSave(canvas.toDataURL('image/png'))
    }
  }, [getCtx, history, onSave])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = 'transparent'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="relative rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={width * 2}
          height={height * 2}
          style={{ width: `${width}px`, height: `${height}px` }}
          className="cursor-crosshair touch-none w-full"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-400 dark:text-gray-500 text-sm">
            Tanda tangan di sini
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={undo}
          disabled={history.length === 0}
        >
          <Undo2 className="h-4 w-4 mr-1" />
          Undo
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clearCanvas}
          disabled={!hasDrawn}
        >
          <Eraser className="h-4 w-4 mr-1" />
          Hapus
        </Button>
      </div>
    </div>
  )
}
