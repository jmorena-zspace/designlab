import { useEffect, useRef, useState, type ReactNode } from 'react'
import gsap from 'gsap'
import { MaximizeIcon, MinusIcon, PlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

// An infinite, pannable and zoomable canvas. Whatever you put inside it sits on a big
// "world" that you move around, like a map.
//
// HOW YOU MOVE AROUND
//   - Drag the background to pan.
//   - Scroll (mouse wheel or two fingers on a trackpad) to pan.
//   - Pinch, or hold Ctrl / ⌘ while scrolling, to zoom toward the pointer.
//   - The buttons at the bottom zoom in, zoom out, and reset the view.
//   - The page can also ask the camera to fly to a spot (the `focusRequest` prop).
//
// HOW IT WORKS
// The "view" is three numbers: x and y (how far the world is shifted) and scale
// (the zoom). We apply them as one CSS transform on the world:
//     translate(x, y) scale(scale)
// A dot grid is drawn on the background and shifts / scales with the view so the
// canvas feels like it goes on forever.
//
// BIG CANVASES: with hundreds of nodes, drawing them all would be slow. So the children
// are given a function that receives the part of the world currently on screen
// (`visibleBounds`), and the page only draws the nodes inside it.

// ---------- TWEAK: canvas feel ----------
const minScale = 0.2 // furthest you can zoom out
const maxScale = 2 // furthest you can zoom in
const wheelZoomSpeed = 0.01 // how fast pinch / Ctrl+scroll zooms. Bigger = faster
const buttonZoomStep = 1.25 // how much each + / - button click zooms
const dotSpacing = 28 // distance between background dots, in pixels at 100% zoom
const visibleMargin = 400 // draw nodes this far (world pixels) outside the screen too, so they don't pop in
const flyDuration = 0.8 // seconds the camera takes to fly to a focused spot
// ----------------------------------------

type View = { x: number; y: number; scale: number }

// A rectangle in world coordinates (not screen pixels).
export type WorldBounds = { left: number; top: number; right: number; bottom: number }

// A request for the camera to fly so that a world point sits in the middle of the free
// space. Give each new request a different `id`, or it will be ignored as a repeat.
// Add `fit` (the size of an area, in world pixels) to also zoom so that whole area fits.
export type FocusRequest = { id: number; x: number; y: number; fit?: { width: number; height: number } }

// Zooms a view to `newScale` while keeping the point under (pointerX, pointerY)
// fixed on screen, so the zoom feels like it comes from the pointer. The
// coordinates are relative to the canvas's top-left corner.
function zoomView(view: View, newScale: number, pointerX: number, pointerY: number): View {
  const scale = Math.min(maxScale, Math.max(minScale, newScale))
  const ratio = scale / view.scale
  return {
    scale,
    x: pointerX - (pointerX - view.x) * ratio,
    y: pointerY - (pointerY - view.y) * ratio,
  }
}

export function InfiniteCanvas({
  initialView,
  focusRequest,
  toolbar,
  children,
}: {
  initialView: View // where the canvas starts (see the page for the values)
  focusRequest?: FocusRequest | null // ask the camera to fly somewhere
  toolbar?: ReactNode // extra buttons shown next to the zoom controls
  children: (visibleBounds: WorldBounds) => ReactNode
}) {
  const [view, setView] = useState<View>(initialView)
  const [size, setSize] = useState({ width: 1200, height: 800 }) // the canvas's size on screen
  const [isPanning, setIsPanning] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)
  // Remembers where a drag started, so we can work out how far the pointer moved.
  const dragStart = useRef({ pointerX: 0, pointerY: 0, viewX: 0, viewY: 0 })
  // The camera fly animation, so it can be stopped when you take control.
  const flyTween = useRef<gsap.core.Tween | null>(null)
  const lastFocusId = useRef<number | null>(null)

  // Keeps `size` up to date, including when the window is resized.
  useEffect(() => {
    const canvas = canvasRef.current!
    const updateSize = () => setSize({ width: canvas.clientWidth, height: canvas.clientHeight })
    updateSize()
    const resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(canvas)
    return () => resizeObserver.disconnect()
  }, [])

  // Zooms around the middle of the canvas (used by the + / - buttons).
  const zoomFromCenter = (factor: number) => {
    setView((current) => zoomView(current, current.scale * factor, size.width / 2, size.height / 2))
  }

  // FLYING THE CAMERA. When a new focus request arrives, tween the view so the
  // requested world point ends up in the middle of the canvas (a little above centre).
  useEffect(() => {
    if (!focusRequest || focusRequest.id === lastFocusId.current) return
    lastFocusId.current = focusRequest.id
    flyTween.current?.kill()
    // If the request has a `fit` area, zoom so the whole area fits in 70% of the canvas
    // (never zooming in past 100%). Otherwise keep the current zoom.
    const endScale = focusRequest.fit
      ? Math.min(
          1,
          Math.max(
            minScale,
            Math.min((size.width * 0.7) / focusRequest.fit.width, (size.height * 0.7) / focusRequest.fit.height),
          ),
        )
      : view.scale
    const start = { x: view.x, y: view.y, scale: view.scale }
    const end = {
      x: size.width / 2 - focusRequest.x * endScale,
      y: size.height * 0.45 - focusRequest.y * endScale,
    }
    flyTween.current = gsap.to(start, {
      x: end.x,
      y: end.y,
      scale: endScale,
      duration: flyDuration,
      ease: 'power3.inOut',
      onUpdate: () => setView({ x: start.x, y: start.y, scale: start.scale }),
    })
    // Only a NEW focus request should fly the camera, not every change to the view or size.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest])

  // Mouse wheel / trackpad. This is added by hand (not with React's onWheel) because
  // we must call preventDefault(), which browsers only allow on non-passive listeners.
  useEffect(() => {
    const canvas = canvasRef.current!
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault() // stop the whole page from scrolling or zooming
      flyTween.current?.kill() // the user took control: stop any camera flight
      if (event.ctrlKey || event.metaKey) {
        // Pinch gestures arrive as Ctrl + wheel. Zoom toward the pointer.
        const box = canvas.getBoundingClientRect()
        const factor = Math.exp(-event.deltaY * wheelZoomSpeed)
        setView((current) =>
          zoomView(current, current.scale * factor, event.clientX - box.left, event.clientY - box.top),
        )
      } else {
        // A normal scroll pans the canvas.
        setView((current) => ({ ...current, x: current.x - event.deltaX, y: current.y - event.deltaY }))
      }
    }
    canvas.addEventListener('wheel', handleWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', handleWheel)
  }, [])

  // Dragging the background pans. Pressing on a node or a control (anything marked
  // data-canvas-node / data-canvas-control) is left alone, so clicking them still works.
  const handlePointerDown = (event: React.PointerEvent) => {
    if ((event.target as HTMLElement).closest('[data-canvas-node], [data-canvas-control]')) return
    flyTween.current?.kill()
    event.currentTarget.setPointerCapture(event.pointerId) // keep getting moves even if the pointer leaves
    dragStart.current = { pointerX: event.clientX, pointerY: event.clientY, viewX: view.x, viewY: view.y }
    setIsPanning(true)
  }
  const handlePointerMove = (event: React.PointerEvent) => {
    if (!isPanning) return
    setView((current) => ({
      ...current,
      x: dragStart.current.viewX + (event.clientX - dragStart.current.pointerX),
      y: dragStart.current.viewY + (event.clientY - dragStart.current.pointerY),
    }))
  }
  const stopPanning = () => setIsPanning(false)

  const dotSize = dotSpacing * view.scale // the grid zooms with the canvas

  // The part of the world on screen right now, plus a margin. Screen position s
  // corresponds to world position (s - view.x) / scale.
  const visibleBounds: WorldBounds = {
    left: -view.x / view.scale - visibleMargin,
    top: -view.y / view.scale - visibleMargin,
    right: (size.width - view.x) / view.scale + visibleMargin,
    bottom: (size.height - view.y) / view.scale + visibleMargin,
  }

  return (
    <div
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopPanning}
      onPointerCancel={stopPanning}
      // `touch-none` stops the browser's own touch scrolling from fighting ours.
      className={`relative h-svh w-full touch-none overflow-hidden bg-muted select-none ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{
        // The dot grid: a tiny dot repeated, shifted and sized with the view.
        backgroundImage:
          'radial-gradient(circle, color-mix(in oklab, var(--foreground) 22%, transparent) 1.2px, transparent 1.2px)',
        backgroundSize: `${dotSize}px ${dotSize}px`,
        backgroundPosition: `${view.x}px ${view.y}px`,
      }}
    >
      {/* The world: everything on the canvas lives in here and moves / zooms together.
          `data-world` lets other code read the current zoom from its transform. */}
      <div
        data-world
        className="absolute top-0 left-0"
        style={{
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
          transformOrigin: '0 0',
        }}
      >
        {children(visibleBounds)}
      </div>

      {/* The zoom controls (and any `toolbar` buttons), bottom centre (the side panels take the left and right). */}
      <div
        data-canvas-control
        className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-xl bg-card p-1 shadow-lg ring-1 ring-foreground/10"
      >
        <Button size="icon-sm" variant="ghost" aria-label="Zoom out" onClick={() => zoomFromCenter(1 / buttonZoomStep)}>
          <MinusIcon />
        </Button>
        <span className="w-12 text-center text-xs text-muted-foreground tabular-nums">
          {Math.round(view.scale * 100)}%
        </span>
        <Button size="icon-sm" variant="ghost" aria-label="Zoom in" onClick={() => zoomFromCenter(buttonZoomStep)}>
          <PlusIcon />
        </Button>
        <Button size="icon-sm" variant="ghost" aria-label="Reset view" onClick={() => setView(initialView)}>
          <MaximizeIcon />
        </Button>
        {toolbar}
      </div>
    </div>
  )
}
