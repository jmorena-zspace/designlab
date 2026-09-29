import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { Button } from '@/components/ui/button'
import { ThreeCube } from '@/experiments/three-cube'

export default function App() {
  const root = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      gsap.from('.reveal', { y: 24, opacity: 0, stagger: 0.1, duration: 0.6, ease: 'power3.out' })
    },
    { scope: root },
  )

  return (
    <div ref={root} className="mx-auto flex min-h-svh max-w-2xl flex-col items-center justify-center gap-6 p-8">
      <h1 className="reveal text-3xl font-semibold tracking-tight">DesignLab</h1>
      <p className="reveal text-muted-foreground">React · Tailwind · shadcn/ui · GSAP · Three.js</p>
      <div className="reveal h-64 w-full overflow-hidden rounded-xl border">
        <ThreeCube />
      </div>
      <Button className="reveal">Start experimenting</Button>
    </div>
  )
}
