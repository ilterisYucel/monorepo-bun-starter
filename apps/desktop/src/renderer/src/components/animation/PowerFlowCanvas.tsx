import React, { useRef, useEffect, useCallback } from 'react'

interface PowerFlowCanvasProps {
  flowDirection: 'Charge' | 'Discharge' | 'Idle'
  width?: number
  height?: number
}

export const PowerFlowCanvas: React.FC<PowerFlowCanvasProps> = ({
  flowDirection,
  width = 650,
  height = 280
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const particlesRef = useRef<{ x: number; y: number; progress: number }[]>([])

  // Batarya grupları (sol) - 4 sıra
  const batteryRows = 4
  const batteryCols = 3
  const batteryStartX = 40
  const batteryStartY = 60
  const batteryWidth = 35
  const batteryHeight = 30
  const batteryGap = 8

  // PCS kutuları (orta)
  const pcsX = 260
  const pcsY = 80
  const pcsWidth = 70
  const pcsHeight = 100

  // Şehir akımı (sağ) - çemberler
  const gridX = 480
  const gridY = 130
  const gridRadius = 40

  // Parçacık oluştur - useCallback ile
  const createParticles = useCallback(() => {
    const count = 12
    const particles: { x: number; y: number; progress: number }[] = []
    for (let i = 0; i < count; i++) {
      particles.push({
        x: flowDirection === 'Charge' ? gridX : batteryStartX + 80,
        y: 100 + (i % 4) * 30,
        progress: i / count
      } as never)
    }
    return particles
  }, [flowDirection, gridX, batteryStartX])

  // flowDirection değiştiğinde parçacıkları yenile
  useEffect(() => {
    particlesRef.current = createParticles()
  }, [createParticles])

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, timestamp: number) => {
      ctx.clearRect(0, 0, width, height)

      // === ARKA PLAN ===
      ctx.fillStyle = '#0f0f1a'
      ctx.fillRect(0, 0, width, height)

      // === 1. BATARYA GRUPLARI (SOL) ===
      for (let row = 0; row < batteryRows; row++) {
        for (let col = 0; col < batteryCols; col++) {
          const x = batteryStartX + col * (batteryWidth + batteryGap)
          const y = batteryStartY + row * (batteryHeight + batteryGap)

          ctx.fillStyle = '#1e1e2e'
          ctx.fillRect(x, y, batteryWidth, batteryHeight)
          ctx.strokeStyle = '#3d3d5e'
          ctx.lineWidth = 1.5
          ctx.strokeRect(x, y, batteryWidth, batteryHeight)

          ctx.fillRect(x + batteryWidth, y + 8, 6, 14)
          ctx.strokeRect(x + batteryWidth, y + 8, 6, 14)

          let fillPercent = 0.5
          if (flowDirection === 'Charge') {
            fillPercent = 0.3 + ((timestamp % 2000) / 2000) * 0.6
          } else if (flowDirection === 'Discharge') {
            fillPercent = 0.7 - ((timestamp % 2000) / 2000) * 0.4
          }

          ctx.fillStyle =
            flowDirection === 'Charge'
              ? '#10b981'
              : flowDirection === 'Discharge'
                ? '#f59e0b'
                : '#6b7280'
          ctx.fillRect(x + 3, y + 3, batteryWidth - 6, (batteryHeight - 6) * fillPercent)
        }
      }

      // === 2. PCS KUTULARI (ORTA) ===
      ctx.fillStyle = '#2a2a3e'
      ctx.fillRect(pcsX, pcsY, pcsWidth, pcsHeight)
      ctx.strokeStyle = '#7c3aed'
      ctx.lineWidth = 2
      ctx.strokeRect(pcsX, pcsY, pcsWidth, pcsHeight)

      ctx.font = 'bold 12px monospace'
      ctx.fillStyle = '#c084fc'
      ctx.fillText('PCS', pcsX + 25, pcsY + 55)
      ctx.font = '10px monospace'
      ctx.fillStyle = '#a78bfa'
      ctx.fillText('INVERTER', pcsX + 15, pcsY + 75)

      const lightY = pcsY + 20
      ctx.beginPath()
      ctx.arc(pcsX + 20, lightY, 5, 0, 2 * Math.PI)
      ctx.fillStyle =
        flowDirection === 'Charge'
          ? '#10b981'
          : flowDirection === 'Discharge'
            ? '#f59e0b'
            : '#6b7280'
      ctx.fill()

      ctx.beginPath()
      ctx.arc(pcsX + 50, lightY, 5, 0, 2 * Math.PI)
      ctx.fill()

      // === 3. ŞEHİR AKIMI (SAĞ) - ÇEMBERLER ===
      ctx.beginPath()
      ctx.arc(gridX, gridY, gridRadius, 0, 2 * Math.PI)
      ctx.strokeStyle = '#fbbf24'
      ctx.lineWidth = 3
      ctx.stroke()
      ctx.fillStyle = '#fef3c7'
      ctx.font = 'bold 11px monospace'
      ctx.fillText('GRID', gridX - 18, gridY + 5)

      for (let i = 0; i < 3; i++) {
        const offset = (timestamp / 200) % (Math.PI * 2)
        const radius = gridRadius + 8 + Math.sin(offset + i * 2) * 4
        ctx.beginPath()
        ctx.arc(gridX, gridY, radius, 0, 2 * Math.PI)
        ctx.strokeStyle = '#fcd34d'
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // === 4. BAĞLANTI KABLOLARI ===
      ctx.beginPath()
      ctx.moveTo(batteryStartX + batteryCols * (batteryWidth + batteryGap) + 10, 130)
      ctx.lineTo(pcsX - 10, 130)
      ctx.strokeStyle = '#4a4a6a'
      ctx.lineWidth = 4
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(pcsX + pcsWidth + 10, 130)
      ctx.lineTo(gridX - gridRadius - 20, 130)
      ctx.stroke()

      // === 5. AKIŞ PARÇACIKLARI ===
      if (flowDirection !== 'Idle') {
        const particleCount = 8
        const duration = 2000

        for (let i = 0; i < particleCount; i++) {
          const offset = (timestamp + i * 250) % duration
          const progress = offset / duration

          let x, y
          if (flowDirection === 'Charge') {
            x = gridX - gridRadius - 5 - progress * (gridX - batteryStartX - 80)
            y = 130
          } else {
            x = batteryStartX + 80 + progress * (gridX - batteryStartX - 80)
            y = 130
          }

          ctx.beginPath()
          ctx.arc(x, y, 5, 0, 2 * Math.PI)
          ctx.fillStyle = flowDirection === 'Charge' ? '#10b981' : '#f59e0b'
          ctx.fill()
          ctx.shadowBlur = 12
          ctx.shadowColor = flowDirection === 'Charge' ? '#10b981' : '#f59e0b'
        }
        ctx.shadowBlur = 0
      }

      // === 6. AKIŞ YÖNÜ OKLARI ===
      ctx.fillStyle = '#9ca3af'
      ctx.font = '20px monospace'
      if (flowDirection === 'Charge') {
        ctx.fillText('←', gridX - 70, 125)
        ctx.fillText('←', pcsX + 35, 115)
      } else if (flowDirection === 'Discharge') {
        ctx.fillText('→', batteryStartX + 100, 115)
        ctx.fillText('→', pcsX + 35, 125)
      }
    },
    [
      width,
      height,
      flowDirection,
      batteryStartX,
      batteryStartY,
      batteryWidth,
      batteryHeight,
      batteryGap,
      batteryRows,
      batteryCols,
      pcsX,
      pcsY,
      pcsWidth,
      pcsHeight,
      gridX,
      gridY,
      gridRadius
    ]
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const startTime = performance.now()

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      draw(ctx, elapsed)
      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [draw])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width: '100%', height: 'auto', borderRadius: '12px' }}
    />
  )
}
