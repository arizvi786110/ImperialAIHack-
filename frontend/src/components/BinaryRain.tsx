import { useEffect, useRef } from 'react'

type Digit = { x:number; y:number; speed:number; opacity:number; char:string; hue:number; drift:number; length:number }
export function BinaryRain({ converge = false, subtle = false }: { converge?:boolean; subtle?:boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointer = useRef({ x: -1000, y: -1000 })
  const convergeRef = useRef(converge)
  useEffect(() => { convergeRef.current = converge }, [converge])
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    let width = 0, height = 0, frame = 0, raf = 0
    let dots: Digit[] = []
    const resize = () => {
      const box = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = box.width; height = box.height
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.min(subtle ? 85 : 180, Math.max(24, Math.floor(width * height / (subtle ? 16000 : 9000))))
      dots = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: .2 + Math.random() * .65,
        opacity: .08 + Math.random() * (subtle ? .14 : .27),
        char: Math.random() > .5 ? '1' : '0',
        hue: i % 13 === 0 ? 1 : i % 4 === 0 ? 2 : 0,
        drift: Math.random() * Math.PI * 2,
        length: 8 + Math.floor(Math.random() * 12),
      }))
    }
    const onMouse = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect()
      pointer.current = { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
    }
    const paint = () => {
      ctx.clearRect(0, 0, width, height)
      ctx.font = '11px "JetBrains Mono", monospace'
      const isConverging = convergeRef.current
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i]
        if (!reduce.matches && !isConverging) {
          d.y += d.speed
          if (d.y > height + 20) { d.y = -15 - Math.random()*height*.2; d.x = Math.random()*width }
        }
        const dx = d.x - pointer.current.x
        const dy = d.y - pointer.current.y
        const distance = Math.hypot(dx, dy)
        const repel = !reduce.matches && distance < 110 && distance > 0 ? ((110-distance)/110) * 11 : 0
        const x = d.x + (distance ? dx/distance * repel : 0) + Math.sin(frame*.007+d.drift)*1.5
        let xx = x, yy = d.y
        if (isConverging && !reduce.matches) {
          const t = Math.min(1, frameConverge++ / Math.max(1, dots.length * 26))
          const node = i % 21, layer = Math.floor(node / 7), column = node % 7
          xx = x*(1-t) + (width*(.38+layer*.12)) * t
          yy = d.y*(1-t) + (height*(.2+column*.10))*t
        }
        const tint = d.hue === 1 ? '89,199,181' : d.hue === 2 ? '161,165,176' : '139,124,246'
        ctx.fillStyle = 'rgba('+tint+','+d.opacity+')'
        ctx.fillText(d.char, xx, yy)
      }
      frame++
      if (!reduce.matches) raf = requestAnimationFrame(paint)
    }
    let frameConverge = 0
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()
    window.addEventListener('pointermove', onMouse, { passive: true })
    paint()
    const onPref = () => { cancelAnimationFrame(raf); paint() }
    reduce.addEventListener('change', onPref)
    return () => {
      observer.disconnect(); window.removeEventListener('pointermove', onMouse)
      reduce.removeEventListener('change', onPref); cancelAnimationFrame(raf)
    }
  }, [subtle])
  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />
}
