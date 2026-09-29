import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export function ThreeCube() {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = host.current!
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
    camera.position.z = 3
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshNormalMaterial(),
    )
    scene.add(mesh)

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(el)

    renderer.setAnimationLoop((t) => {
      mesh.rotation.set(t / 1500, t / 1000, 0)
      renderer.render(scene, camera)
    })

    return () => {
      ro.disconnect()
      renderer.setAnimationLoop(null)
      renderer.dispose()
      mesh.geometry.dispose()
      mesh.material.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div ref={host} className="size-full" />
}
