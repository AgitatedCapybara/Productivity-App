import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useCelebrationStore } from '../store/useCelebrationStore'

interface ConfettiParticle {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  w: number
  h: number
  rotation: number
  rotationSpeed: number
  gravity: number
  drag: number
  opacity: number
}

interface BalloonParticle {
  x: number
  baseX: number
  y: number
  vy: number
  color: string
  radiusX: number
  radiusY: number
  swayAmp: number
  swaySpeed: number
  swayPhase: number
  stringLength: number
  opacity: number
}

const PASTEL_COLORS = [
  '#f43f5e', // rose
  '#ec4899', // pink
  '#a855f7', // purple
  '#6366f1', // indigo
  '#3b82f6', // blue
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#84cc16', // lime
  '#eab308', // yellow
  '#f97316'  // orange
]

export function CelebrationOverlay() {
  const activeEffect = useCelebrationStore((state) => state.activeEffect)
  const clearCelebration = useCelebrationStore((state) => state.clearCelebration)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!activeEffect) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    const confettiParticles: ConfettiParticle[] = []
    const balloonParticles: BalloonParticle[] = []

    // Adjust canvas to fill the entire viewport
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Initialize Particles
    if (activeEffect === 'confetti') {
      const particleCount = 120
      
      // Fountain Burst from corners & top cascade
      for (let i = 0; i < particleCount; i++) {
        const isLeft = i % 2 === 0
        const isCenter = i % 3 === 0
        
        let x = 0
        let y = 0
        let vx = 0
        let vy = 0

        if (isCenter) {
          // Cascade from top
          x = Math.random() * canvas.width
          y = -20 - Math.random() * 100
          vx = (Math.random() - 0.5) * 4
          vy = Math.random() * 3 + 2
        } else if (isLeft) {
          // Shoot from bottom-left corner
          x = -10
          y = canvas.height + 10
          vx = Math.random() * 14 + 8
          vy = -(Math.random() * 16 + 12)
        } else {
          // Shoot from bottom-right corner
          x = canvas.width + 10
          y = canvas.height + 10
          vx = -(Math.random() * 14 + 8)
          vy = -(Math.random() * 16 + 12)
        }

        confettiParticles.push({
          x,
          y,
          vx,
          vy,
          color: PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)],
          w: Math.random() * 6 + 6,
          h: Math.random() * 8 + 8,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.3,
          gravity: Math.random() * 0.15 + 0.22,
          drag: Math.random() * 0.02 + 0.965,
          opacity: 1
        })
      }
    } else if (activeEffect === 'balloons') {
      const balloonCount = 18
      for (let i = 0; i < balloonCount; i++) {
        // Distribute nicely across bottom screen
        const baseX = (canvas.width / (balloonCount + 1)) * (i + 1) + (Math.random() - 0.5) * 40
        const y = canvas.height + 50 + Math.random() * 250
        const radius = Math.random() * 8 + 22 // 22px to 30px width

        balloonParticles.push({
          x: baseX,
          baseX,
          y,
          vy: -(Math.random() * 1.5 + 1.2), // float upwards
          color: PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)],
          radiusX: radius,
          radiusY: radius * 1.22, // slightly elongated
          swayAmp: Math.random() * 25 + 15,
          swaySpeed: Math.random() * 0.015 + 0.012,
          swayPhase: Math.random() * Math.PI * 2,
          stringLength: Math.random() * 20 + 50,
          opacity: 1
        })
      }
    }

    // Main animation loop
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      let activeParticlesCount = 0

      if (activeEffect === 'confetti') {
        confettiParticles.forEach((p) => {
          if (p.opacity <= 0) return

          // Update physics
          p.vy += p.gravity
          p.vx *= p.drag
          p.vy *= p.drag
          p.x += p.vx
          p.y += p.vy
          p.rotation += p.rotationSpeed

          // Slowly fade out when falling below middle
          if (p.y > canvas.height * 0.6) {
            p.opacity -= 0.015
          }

          if (p.opacity > 0 && p.y < canvas.height + 20 && p.x > -50 && p.x < canvas.width + 50) {
            activeParticlesCount++

            ctx.save()
            ctx.translate(p.x, p.y)
            ctx.rotate(p.rotation)
            ctx.globalAlpha = p.opacity
            ctx.fillStyle = p.color
            
            // Draw standard rectangle/parallelogram particle
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
            ctx.restore()
          }
        })
      } else if (activeEffect === 'balloons') {
        const time = Date.now()

        balloonParticles.forEach((p) => {
          if (p.y + p.radiusY + p.stringLength + 20 < 0) return // completely off screen

          activeParticlesCount++

          // Float physics & sinusoidal sways
          p.y += p.vy
          const phase = p.swayPhase + time * p.swaySpeed
          p.x = p.baseX + Math.sin(phase) * p.swayAmp

          ctx.save()
          ctx.globalAlpha = p.opacity

          // Draw balloon string
          ctx.beginPath()
          ctx.moveTo(p.x, p.y + p.radiusY)
          const ctrlX = p.x + Math.sin(phase + 1) * 12
          const ctrlY = p.y + p.radiusY + p.stringLength / 2
          ctx.quadraticCurveTo(ctrlX, ctrlY, p.x + Math.sin(phase) * 5, p.y + p.radiusY + p.stringLength)
          ctx.strokeStyle = 'rgba(180, 180, 180, 0.55)'
          ctx.lineWidth = 1.2
          ctx.stroke()

          // Draw balloon body (ellipse)
          ctx.beginPath()
          ctx.ellipse(p.x, p.y, p.radiusX, p.radiusY, 0, 0, Math.PI * 2)
          ctx.fillStyle = p.color
          ctx.fill()

          // Draw the small tie/triangle at the bottom knot
          ctx.beginPath()
          ctx.moveTo(p.x, p.y + p.radiusY)
          ctx.lineTo(p.x - 5, p.y + p.radiusY + 8)
          ctx.lineTo(p.x + 5, p.y + p.radiusY + 8)
          ctx.closePath()
          ctx.fillStyle = p.color
          ctx.fill()

          // Highlight / Gloss reflection
          ctx.beginPath()
          ctx.ellipse(
            p.x - p.radiusX * 0.35, 
            p.y - p.radiusY * 0.35, 
            p.radiusX * 0.22, 
            p.radiusY * 0.22, 
            -Math.PI / 4, 
            0, 
            Math.PI * 2
          )
          ctx.fillStyle = 'rgba(255, 255, 255, 0.32)'
          ctx.fill()

          ctx.restore()
        })
      }

      // If there are still active particles, schedule next frame
      if (activeParticlesCount > 0) {
        animationFrameId = requestAnimationFrame(tick)
      } else {
        // Automatically clear celebration if all particles are off-screen/dead
        clearCelebration()
      }
    }

    // Start tick
    animationFrameId = requestAnimationFrame(tick)

    // Force clear after 5.5 seconds maximum as a fail-safe
    const failSafeTimeout = setTimeout(() => {
      clearCelebration()
    }, 5500)

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', resizeCanvas)
      clearTimeout(failSafeTimeout)
    }
  }, [activeEffect, clearCelebration])

  return (
    <AnimatePresence>
      {activeEffect && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden"
          id="celebration-overlay-container"
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full block bg-transparent"
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
