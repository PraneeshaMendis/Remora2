import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import modelUrl from '../models/Mohan_walking.glb?url'

interface SidebarLogoSceneProps {
  className?: string
}

const SidebarLogoScene: React.FC<SidebarLogoSceneProps> = ({ className }) => {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let width = container.clientWidth || 220
    let height = container.clientHeight || 96

    const scene = new THREE.Scene()
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    renderer.setClearColor(0x000000, 0)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.6
    renderer.outputColorSpace = THREE.SRGBColorSpace
    container.appendChild(renderer.domElement)

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 20)
    camera.position.set(0, 1.35, 3.1)
    camera.lookAt(0, 1, 0)

    const ambient = new THREE.AmbientLight(0xffffff, 1.2)
    const keyLight = new THREE.DirectionalLight(0x9fd4ff, 1.6)
    keyLight.position.set(3, 6, 3)
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.8)
    fillLight.position.set(-3, 4, 2)
    scene.add(ambient, keyLight, fillLight)

    const modelGroup = new THREE.Group()
    scene.add(modelGroup)

    let mixer: THREE.AnimationMixer | null = null
    const loader = new GLTFLoader()
    loader.load(
      modelUrl,
      (gltf: GLTF) => {
        const root = gltf.scene
        root.scale.set(1.35, 1.35, 1.35)
        root.position.set(0, -1.1, 0)
        modelGroup.add(root)
        if (gltf.animations.length) {
          mixer = new THREE.AnimationMixer(root)
          mixer.clipAction(gltf.animations[0]).play()
        }
      },
      undefined,
      () => {
        // Ignore loader errors to keep the sidebar usable.
      },
    )

    const clock = new THREE.Clock()
    let raf = 0

    const animate = () => {
      const delta = clock.getDelta()
      if (mixer) mixer.update(delta)
      renderer.render(scene, camera)
      raf = requestAnimationFrame(animate)
    }
    animate()

    const resizeObserver = new ResizeObserver(() => {
      if (!container) return
      width = container.clientWidth || width
      height = container.clientHeight || height
      renderer.setSize(width, height)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      cancelAnimationFrame(raf)
      renderer.dispose()
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement)
      }
    }
  }, [])

  return <div ref={containerRef} className={className} />
}

export default SidebarLogoScene
