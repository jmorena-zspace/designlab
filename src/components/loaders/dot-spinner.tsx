// A loading spinner made of a ring of dots that rotates. Being separate dots (not
// one icon) is what lets them "disassemble": another file can animate every dot
// flying outward. Each dot is tagged `data-spinner-dot` and carries
// its angle in `data-angle` (in radians) so that animation knows which way is out.
//
// TWEAK: the look of the spinner.
const dotCount = 8 // how many dots in the ring
const ringSize = 36 // width and height of the whole spinner, in pixels
const dotSize = 6 // diameter of each dot, in pixels
const spinSeconds = 0.9 // time for one full turn. Smaller = faster

export function DotSpinner() {
  const center = ringSize / 2
  const ringRadius = center - dotSize / 2 // how far from the center each dot sits

  return (
    <div role="status" aria-label="Searching" className="relative" style={{ width: ringSize, height: ringSize }}>
      {/* This layer turns forever (the `animate-spin` class rotates it). */}
      <div className="absolute inset-0 animate-spin" style={{ animationDuration: `${spinSeconds}s` }}>
        {Array.from({ length: dotCount }, (_, index) => {
          // Spread the dots evenly around the circle: dot 0 at the top, then clockwise.
          const angle = (index / dotCount) * Math.PI * 2 - Math.PI / 2
          return (
            // The OUTER span is what gets moved around by the disassemble animation.
            <span
              key={index}
              data-spinner-dot
              data-angle={angle}
              className="absolute"
              style={{
                width: dotSize,
                height: dotSize,
                left: center + Math.cos(angle) * ringRadius - dotSize / 2,
                top: center + Math.sin(angle) * ringRadius - dotSize / 2,
              }}
            >
              {/* The INNER span is the visible dot. Later dots are fainter, which
                  gives the spinner its "comet tail" look. */}
              <span
                className="block size-full rounded-full bg-foreground"
                style={{ opacity: 0.15 + (index / dotCount) * 0.85 }}
              />
            </span>
          )
        })}
      </div>
    </div>
  )
}
