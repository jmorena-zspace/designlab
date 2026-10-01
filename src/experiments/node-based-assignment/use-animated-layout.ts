import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import type { LayoutItem } from './layout'

// Turns a layout into a smooth animation.
//
// You give it the list of boxes where everything SHOULD be. It gives back the list
// of boxes where everything IS right now, which changes many times a second while
// things animate. The rules are deliberately simple:
//   - a box that stays glides to its new position (this is what you see when you press
//     Arrange);
//   - a NEW box (a device card when you open a group) just fades in, right where it will stay;
//   - a REMOVED box just fades out where it is, then disappears.
//
// While you are dragging a group (`snap` is true) nothing is animated: the boxes follow
// the pointer instantly.

// ---------- TWEAK: animation values ----------
const moveDuration = 0.6 // seconds boxes take to glide to a new position
const fadeDuration = 0.22 // seconds for boxes to fade in or out
const moveEase = 'power3.inOut' // try 'power2.out' for a snappier glide
// ----------------------------------------------

// A layout item plus how visible it is right now (0 = invisible, 1 = fully visible).
export type AnimatedItem = LayoutItem & { opacity: number }

// One box's journey: where it starts and where it ends.
type Journey = {
  item: LayoutItem // size and identity
  from: { x: number; y: number; opacity: number; height: number }
  to: { x: number; y: number; opacity: number; height: number }
}

export function useAnimatedLayout(targetLayout: LayoutItem[], snap: boolean): AnimatedItem[] {
  const [animatedItems, setAnimatedItems] = useState<AnimatedItem[]>([])
  // What is on screen right now (kept in a ref so a new animation can start from it).
  const currentItems = useRef<AnimatedItem[]>([])

  useEffect(() => {
    // Dragging: jump straight to the target, no animation.
    if (snap) {
      const frame = targetLayout.map((item) => ({ ...item, opacity: 1 }))
      currentItems.current = frame
      // The boxes must show the new positions right now, so setting state here is intended.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnimatedItems(frame)
      return
    }

    const currentById = new Map(currentItems.current.map((item) => [item.id, item]))
    const targetIds = new Set(targetLayout.map((item) => item.id))
    const journeys: Journey[] = []

    // 1. Boxes that should be visible at the end: staying (glide) or new (fade in).
    for (const target of targetLayout) {
      const current = currentById.get(target.id)
      journeys.push({
        item: target,
        from: current
          ? { x: current.x, y: current.y, opacity: current.opacity, height: current.height }
          : { x: target.x, y: target.y, opacity: 0, height: target.height },
        to: { x: target.x, y: target.y, opacity: 1, height: target.height },
      })
    }

    // 2. Boxes on screen that are not in the new layout: fade out where they are.
    for (const current of currentItems.current) {
      if (targetIds.has(current.id)) continue
      journeys.push({
        item: current,
        from: { x: current.x, y: current.y, opacity: current.opacity, height: current.height },
        to: { x: current.x, y: current.y, opacity: 0, height: current.height },
      })
    }

    // Nothing actually changes? Then there is nothing to animate.
    const somethingChanges = journeys.some(
      ({ from, to }) => from.x !== to.x || from.y !== to.y || from.opacity !== to.opacity || from.height !== to.height,
    )
    if (!somethingChanges) return

    // 3. Play it. One GSAP tween counts `progress` from 0 to 1; every tick we work out
    //    where each box is at that moment, and show it. Boxes that only fade use the
    //    shorter fadeDuration; boxes that move use moveDuration.
    const ease = gsap.parseEase(moveEase)
    const anyBoxMoves = journeys.some(({ from, to }) => from.x !== to.x || from.y !== to.y)
    const totalDuration = anyBoxMoves ? moveDuration : fadeDuration
    const clock = { time: 0 }

    const showFrame = () => {
      const frame: AnimatedItem[] = []
      for (const journey of journeys) {
        const moves = journey.from.x !== journey.to.x || journey.from.y !== journey.to.y
        // Movement is eased and takes moveDuration; fades are linear and take fadeDuration.
        const moveProgress = Math.min(1, clock.time / moveDuration)
        const fadeProgress = Math.min(1, clock.time / fadeDuration)
        const eased = moves ? ease(moveProgress) : fadeProgress
        const opacity = journey.from.opacity + (journey.to.opacity - journey.from.opacity) * fadeProgress
        // Boxes that have finished fading out are dropped from the screen.
        if (fadeProgress === 1 && journey.to.opacity === 0) continue
        frame.push({
          ...journey.item,
          x: journey.from.x + (journey.to.x - journey.from.x) * eased,
          y: journey.from.y + (journey.to.y - journey.from.y) * eased,
          opacity,
          height: journey.from.height + (journey.to.height - journey.from.height) * eased,
        })
      }
      currentItems.current = frame
      setAnimatedItems(frame)
    }

    const tween = gsap.to(clock, {
      time: totalDuration,
      duration: totalDuration,
      ease: 'none',
      onUpdate: showFrame,
      onComplete: showFrame,
    })
    // If the layout changes again mid-animation, stop this one (the next starts from here).
    return () => {
      tween.kill()
    }
  }, [targetLayout, snap])

  return animatedItems
}
