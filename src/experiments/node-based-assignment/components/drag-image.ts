// The little label shown under the pointer while you drag something.
//
// WHY WE MAKE OUR OWN: if we don't, the browser takes a snapshot of the element being
// dragged to use as the preview. On Mac, for elements inside frosted-glass panels, that
// snapshot can capture the whole panel instead of just the row, so a "phantom" of the
// panel follows the pointer. A label we build ourselves always looks the same.
//
// TWEAK: the look of the label is the style text below (colors, rounding, text size).

export function setDragLabel(dataTransfer: DataTransfer, text: string) {
  const label = document.createElement('div')
  label.textContent = text
  label.style.cssText = [
    // It has to be in the page for the browser to photograph it. We tuck it at the top-left,
    // behind everything, and remove it again straight away.
    'position:fixed',
    'top:0',
    'left:0',
    'z-index:-1',
    'pointer-events:none',
    // The look of the label.
    'max-width:260px',
    'overflow:hidden',
    'text-overflow:ellipsis',
    'white-space:nowrap',
    'padding:8px 14px',
    'border-radius:12px',
    'background:#171717',
    'color:#ffffff',
    'font:500 13px system-ui, sans-serif',
    'box-shadow:0 8px 24px rgba(0,0,0,.25)',
  ].join(';')
  document.body.appendChild(label)
  // The two numbers say which point of the label sits under the pointer.
  dataTransfer.setDragImage(label, 16, 16)
  // The browser takes its photo immediately, so the label can go right away.
  setTimeout(() => label.remove(), 0)
}
