import { useEffect, useImperativeHandle, useRef } from 'react'
import type { ReactNode, Ref } from 'react'
import gsap from 'gsap'
import type { CameraHandle } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// INFINITE CANVAS: pan and zoom, like Figma.
//
// HOW IT WORKS: there's a fixed "viewport" (the visible area) and a "world" inside it
// that holds all the frames. We never scroll. Instead we move and scale the world with
// one CSS transform: translate(x, y) scale(scale). That trio is the "camera".
//
// The camera lives in a ref (not React state) and is written straight to the DOM.
// Panning fires dozens of events per second, and re-rendering every component on the
// canvas for each one would be slow. Only the zoom % is reported to React (once per frame).
//
// Controls:
//   wheel / two-finger scroll        → pan
//   ctrl/⌘ + wheel, trackpad pinch   → zoom around the cursor (pinch sends ctrlKey)
//   space + drag, middle-mouse drag  → pan
// ─────────────────────────────────────────────────────────────────────────────

// TWEAK: minZoom / maxZoom — how far you can zoom out / in (1 = 100%) (try 0.05 to 0.25 / 2 to 8)
const minZoom = 0.1
const maxZoom = 4
// TWEAK: zoomWheelSpeed — how strongly pinch / ctrl+wheel zooms (try 0.005 to 0.02)
const zoomWheelSpeed = 0.01
// TWEAK: fitPadding — empty space (screen px) kept around the content by "zoom to fit" (try 24 to 120)
const fitPadding = 64
// TWEAK: focusMaxZoom — "focus a component" never zooms in past this (try 1 to 2)
const focusMaxZoom = 1.25
// TWEAK: cameraTweenSeconds — length of the smooth camera moves (try 0.3 to 1)
const cameraTweenSeconds = 0.55
// TWEAK: frameTitleAllowance — screen px kept free above the frames for their titles
// when fitting (titles stay the same size on screen at every zoom) (try 24 to 48)
const frameTitleAllowance = 32
// TWEAK: dotSpacing — distance between the background dots at 100% zoom (try 16 to 32)
const dotSpacing = 20
// TWEAK: minDotSpacing — when zoomed out, dots thin out so they never get closer than this (screen px)
const minDotSpacing = 10

type Camera = { x: number; y: number; scale: number }

type InfiniteCanvasProps = {
  stageDocument: Document // the iframe's document (the canvas lives inside it)
  cameraRef: Ref<CameraHandle>
  onZoomChange: (scale: number) => void
  children: ReactNode
}

function clampZoom(scale: number) {
  return Math.min(maxZoom, Math.max(minZoom, scale))
}

// Is the user typing somewhere? Then the space bar must type a space, not pan.
function isTypingTarget(target: EventTarget | null) {
  if (!target || !('closest' in target)) return false
  return Boolean((target as Element).closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])'))
}

export function InfiniteCanvas({ stageDocument, cameraRef, onZoomChange, children }: InfiniteCanvasProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const cameraStateRef = useRef<Camera>({ x: 0, y: 0, scale: 1 })
  const tweenRef = useRef<gsap.core.Tween | null>(null)
  // Becomes true the first time the user pans, zooms or jumps to a component. From then
  // on the automatic "fit on load" stops, so it never fights the user's own view.
  const userMovedCameraRef = useRef(false)
  // The latest onZoomChange, so the listeners below don't need to be re-attached when it changes.
  const onZoomChangeRef = useRef(onZoomChange)
  useEffect(() => {
    onZoomChangeRef.current = onZoomChange
  }, [onZoomChange])

  // ── Writing the camera to the DOM ──────────────────────────────────────────
  // Moves the world, moves/scales the dot grid, and reports the zoom (at most once per frame).
  const reportFrameRef = useRef(0)
  const lastReportedZoomRef = useRef(0)

  function applyCamera() {
    const viewport = viewportRef.current
    const world = worldRef.current
    if (!viewport || !world) return
    const { x, y, scale } = cameraStateRef.current
    world.style.transform = `translate(${x}px, ${y}px) scale(${scale})`

    // Dots: spacing grows with zoom, doubling when zoomed out so they don't turn into noise.
    let spacing = dotSpacing * scale
    while (spacing < minDotSpacing) spacing *= 2
    viewport.style.backgroundSize = `${spacing}px ${spacing}px`
    viewport.style.backgroundPosition = `${x}px ${y}px`
    // Frame titles read this to stay the same size on screen at every zoom.
    viewport.style.setProperty('--cc-scale', String(scale))

    if (scale !== lastReportedZoomRef.current && !reportFrameRef.current) {
      const stageWindow = stageDocument.defaultView ?? window
      reportFrameRef.current = stageWindow.requestAnimationFrame(() => {
        reportFrameRef.current = 0
        lastReportedZoomRef.current = cameraStateRef.current.scale
        onZoomChangeRef.current(cameraStateRef.current.scale)
      })
    }
  }

  // Stops a running smooth move (used whenever the user takes over with the mouse).
  function stopTween() {
    tweenRef.current?.kill()
    tweenRef.current = null
  }

  // Smoothly (or instantly) moves the camera to a target with GSAP.
  function moveCameraTo(target: Camera, animate: boolean) {
    stopTween()
    if (!animate) {
      cameraStateRef.current = target
      applyCamera()
      return
    }
    // GSAP tweens the numbers inside cameraStateRef.current; we redraw on every tick.
    tweenRef.current = gsap.to(cameraStateRef.current, {
      ...target,
      duration: cameraTweenSeconds,
      ease: 'power3.inOut',
      onUpdate: applyCamera,
    })
  }

  // Zooms by `factor` while keeping the point (screenX, screenY) fixed under the cursor.
  // Math: the world point under the cursor is (screen - offset) / scale. After zooming
  // we pick the new offset so that same world point lands at the same screen spot.
  function zoomAroundPoint(factor: number, screenX: number, screenY: number, animate: boolean) {
    const camera = cameraStateRef.current
    const newScale = clampZoom(camera.scale * factor)
    const worldX = (screenX - camera.x) / camera.scale
    const worldY = (screenY - camera.y) / camera.scale
    moveCameraTo({ scale: newScale, x: screenX - worldX * newScale, y: screenY - worldY * newScale }, animate)
  }

  // A rectangle in WORLD units (canvas pixels at 100% zoom).
  type WorldBox = { left: number; top: number; width: number; height: number }

  // Measures the frame cards (`.cc-frame-body`) inside `container` and returns the box
  // around all of them, in world units. We measure the cards, not the whole frames,
  // because the frame titles change size with the zoom (they stay 11px on screen), so
  // their world size depends on the CURRENT zoom and would throw the fit off.
  // Screen position → world position: (screen - world's screen origin) / zoom.
  function measureFrameBodies(container: Element): WorldBox | null {
    const world = worldRef.current
    if (!world) return null
    const bodies = container.querySelectorAll('.cc-frame-body')
    if (bodies.length === 0) return null
    const worldOrigin = world.getBoundingClientRect()
    const scale = cameraStateRef.current.scale
    let left = Infinity
    let top = Infinity
    let right = -Infinity
    let bottom = -Infinity
    for (const body of bodies) {
      const rect = body.getBoundingClientRect()
      left = Math.min(left, (rect.left - worldOrigin.left) / scale)
      top = Math.min(top, (rect.top - worldOrigin.top) / scale)
      right = Math.max(right, (rect.right - worldOrigin.left) / scale)
      bottom = Math.max(bottom, (rect.bottom - worldOrigin.top) / scale)
    }
    return { left, top, width: right - left, height: bottom - top }
  }

  // Camera that fits a box (in world units) inside the viewport, centered, leaving
  // `frameTitleAllowance` screen pixels above it for the frame titles.
  function cameraForBox(box: WorldBox, maxScale: number): Camera | null {
    const viewport = viewportRef.current
    if (!viewport || box.width === 0 || box.height === 0) return null
    const availableWidth = Math.max(1, viewport.clientWidth - fitPadding * 2)
    const availableHeight = Math.max(1, viewport.clientHeight - fitPadding * 2 - frameTitleAllowance)
    const scale = clampZoom(Math.min(availableWidth / box.width, availableHeight / box.height, maxScale))
    return {
      scale,
      x: (viewport.clientWidth - box.width * scale) / 2 - box.left * scale,
      // Center vertically, then shift down by half the title space.
      y: (viewport.clientHeight - box.height * scale + frameTitleAllowance) / 2 - box.top * scale,
    }
  }

  function zoomToFit(animate: boolean) {
    const world = worldRef.current
    const box = world ? measureFrameBodies(world) : null
    const target = box ? cameraForBox(box, 1) : null
    if (target) moveCameraTo(target, animate)
  }

  // ── The handle the page uses (toolbar buttons, component list) ─────────────
  useImperativeHandle(cameraRef, () => ({
    focusComponent(componentName) {
      userMovedCameraRef.current = true
      const frame = worldRef.current?.querySelector(`[data-frame="${CSS.escape(componentName)}"]`)
      const box = frame ? measureFrameBodies(frame) : null
      const target = box ? cameraForBox(box, focusMaxZoom) : null
      if (target) moveCameraTo(target, true)
    },
    zoomToFit() {
      userMovedCameraRef.current = true
      zoomToFit(true)
    },
    zoomBy(factor) {
      userMovedCameraRef.current = true
      const viewport = viewportRef.current
      if (!viewport) return
      zoomAroundPoint(factor, viewport.clientWidth / 2, viewport.clientHeight / 2, true)
    },
  }))

  // ── Mouse, trackpad and keyboard listeners ─────────────────────────────────
  // Attached by hand (not as React props) because the wheel listener must be
  // non-passive to call preventDefault (React's onWheel is passive).
  useEffect(() => {
    const viewport = viewportRef.current
    const stageWindow = stageDocument.defaultView
    if (!viewport || !stageWindow) return
    const rootElement = stageDocument.documentElement

    // Wheel: pan, or zoom when ctrl/⌘ is held (trackpad pinch also reports ctrlKey).
    function handleWheel(event: WheelEvent) {
      event.preventDefault()
      stopTween()
      userMovedCameraRef.current = true
      // Some mice report "lines" or "pages" instead of pixels; convert to pixels.
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport!.clientHeight : 1
      const deltaX = event.deltaX * unit
      const deltaY = event.deltaY * unit

      if (event.ctrlKey || event.metaKey) {
        // Clamp so one notch of a mouse wheel doesn't jump too far.
        const clampedDelta = Math.max(-50, Math.min(50, deltaY))
        const bounds = viewport!.getBoundingClientRect()
        zoomAroundPoint(Math.exp(-clampedDelta * zoomWheelSpeed), event.clientX - bounds.left, event.clientY - bounds.top, false)
      } else {
        const camera = cameraStateRef.current
        moveCameraTo({ ...camera, x: camera.x - deltaX, y: camera.y - deltaY }, false)
      }
    }

    // Space bar: held = "hand tool". We mark it on the iframe's <html> so the CSS can show
    // a grab cursor and the stage's click handler knows not to select layers.
    // Keyboard events inside the iframe never reach the parent window (and the other way
    // round), so we listen on BOTH.
    function handleKeyDown(event: KeyboardEvent) {
      if (event.code !== 'Space' || isTypingTarget(event.target)) return
      // Stop the page from scrolling / a focused button from clicking. In the parent window
      // only do that when nothing in particular is focused, so panel buttons still work.
      if (event.view === stageWindow || event.target === document.body) event.preventDefault()
      rootElement.dataset.spaceHeld = 'true'
    }
    function handleKeyUp(event: KeyboardEvent) {
      if (event.code !== 'Space') return
      delete rootElement.dataset.spaceHeld
    }
    // If the window loses focus while space is down we never get keyup, so reset.
    function handleBlur() {
      delete rootElement.dataset.spaceHeld
    }

    // Dragging to pan: middle mouse button, or left button while space is held.
    let dragStart: { pointerX: number; pointerY: number; cameraX: number; cameraY: number } | null = null

    function handlePointerDown(event: PointerEvent) {
      const isMiddleButton = event.button === 1
      const isSpaceDrag = event.button === 0 && rootElement.dataset.spaceHeld === 'true'
      if (!isMiddleButton && !isSpaceDrag) return
      event.preventDefault() // no middle-click autoscroll, no text selection
      stopTween()
      userMovedCameraRef.current = true
      const camera = cameraStateRef.current
      dragStart = { pointerX: event.clientX, pointerY: event.clientY, cameraX: camera.x, cameraY: camera.y }
      viewport!.setPointerCapture(event.pointerId) // keep getting moves even outside the viewport
      rootElement.dataset.panning = 'true'
    }
    function handlePointerMove(event: PointerEvent) {
      if (!dragStart) return
      const camera = cameraStateRef.current
      moveCameraTo(
        {
          ...camera,
          x: dragStart.cameraX + (event.clientX - dragStart.pointerX),
          y: dragStart.cameraY + (event.clientY - dragStart.pointerY),
        },
        false,
      )
    }
    function handlePointerUp() {
      dragStart = null
      delete rootElement.dataset.panning
    }

    viewport.addEventListener('wheel', handleWheel, { passive: false })
    viewport.addEventListener('pointerdown', handlePointerDown)
    viewport.addEventListener('pointermove', handlePointerMove)
    viewport.addEventListener('pointerup', handlePointerUp)
    viewport.addEventListener('pointercancel', handlePointerUp)
    for (const target of [stageWindow, window]) {
      target.addEventListener('keydown', handleKeyDown)
      target.addEventListener('keyup', handleKeyUp)
      target.addEventListener('blur', handleBlur)
    }

    return () => {
      viewport.removeEventListener('wheel', handleWheel)
      viewport.removeEventListener('pointerdown', handlePointerDown)
      viewport.removeEventListener('pointermove', handlePointerMove)
      viewport.removeEventListener('pointerup', handlePointerUp)
      viewport.removeEventListener('pointercancel', handlePointerUp)
      for (const target of [stageWindow, window]) {
        target.removeEventListener('keydown', handleKeyDown)
        target.removeEventListener('keyup', handleKeyUp)
        target.removeEventListener('blur', handleBlur)
      }
      delete rootElement.dataset.spaceHeld
      delete rootElement.dataset.panning
    }
    // The helper functions only read refs, so attaching once per document is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageDocument])

  // ── First load: zoom to fit (instantly), and keep fitting while the layout settles ──
  // Right after the iframe opens, its CSS and fonts are still arriving, so the frames
  // change size a few times. A single fit on the first frame measures the wrong layout.
  // Instead, a ResizeObserver re-fits every time the content or the viewport changes size,
  // until the user moves the camera themselves (then we leave their view alone).
  // Also cleans up the GSAP tween and the pending zoom report when the canvas goes away.
  useEffect(() => {
    const stageWindow = stageDocument.defaultView ?? window
    const viewport = viewportRef.current
    const frameGrid = worldRef.current?.firstElementChild
    if (!viewport || !frameGrid) return

    const resizeObserver = new stageWindow.ResizeObserver(() => {
      if (!userMovedCameraRef.current) zoomToFit(false)
    })
    resizeObserver.observe(viewport)
    resizeObserver.observe(frameGrid)

    return () => {
      resizeObserver.disconnect()
      stageWindow.cancelAnimationFrame(reportFrameRef.current)
      reportFrameRef.current = 0
      stopTween()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageDocument])

  return (
    <div ref={viewportRef} className="cc-viewport">
      <div ref={worldRef} className="cc-world" data-canvas-world="">
        {children}
      </div>
    </div>
  )
}
