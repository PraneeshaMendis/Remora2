import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import modelUrl from '../models/Mohan_walking.glb?url'

const LoginScene: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(0x050505, 8, 26)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setClearColor(0x000000, 0)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.75
    container.appendChild(renderer.domElement)

    const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 100)
    camera.position.set(0, 2.2, 9)
    camera.lookAt(0, 1, 0)

    const ambient = new THREE.AmbientLight(0xffffff, 1.45)
    const hemi = new THREE.HemisphereLight(0xffffff, 0x4c4c4c, 1.1)
    const keyLight = new THREE.DirectionalLight(0x9fd4ff, 2.2)
    keyLight.position.set(6, 10, 6)
    const fillLight = new THREE.DirectionalLight(0xffffff, 1.2)
    fillLight.position.set(-6, 5, 5)
    const rimLight = new THREE.DirectionalLight(0xffc79a, 0.8)
    rimLight.position.set(-6, 5, -6)
    const followLight = new THREE.PointLight(0xffffff, 1.4, 18)
    followLight.position.set(0, 3, 2)
    scene.add(ambient, hemi, keyLight, fillLight, rimLight, followLight)

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshStandardMaterial({ color: 0x060606, roughness: 1, metalness: 0 }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -1.15
    scene.add(ground)

    const modelGroup = new THREE.Group()
    scene.add(modelGroup)

    let mixer: THREE.AnimationMixer | null = null
    const loader = new GLTFLoader()
    loader.load(
      modelUrl,
      (gltf: GLTF) => {
        const root = gltf.scene
        root.scale.set(2.35, 2.35, 2.35)
        root.position.set(0, -1.1, 0)
        root.traverse((child: THREE.Object3D) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh
            mesh.castShadow = false
          }
        })
        modelGroup.add(root)
        if (gltf.animations.length) {
          mixer = new THREE.AnimationMixer(root)
          mixer.clipAction(gltf.animations[0]).play()
        }
      },
      undefined,
      () => {
        // Ignore loader errors to avoid breaking login screen rendering.
      },
    )

    const clock = new THREE.Clock()
    const lookTarget = new THREE.Vector3()
    let raf = 0

    const animate = () => {
      const delta = clock.getDelta()
      if (mixer) mixer.update(delta)

      const t = clock.elapsedTime
      const x = Math.sin(t * 0.22) * 3.6
      const z = Math.cos(t * 0.18) * 2.8 - 1.2
      modelGroup.position.set(x, 0, z)
      followLight.position.set(x, 2.8, z + 1.6)
      lookTarget.set(
        Math.sin((t + 0.25) * 0.22) * 3.6,
        0,
        Math.cos((t + 0.25) * 0.18) * 2.8 - 1.2,
      )
      modelGroup.lookAt(lookTarget)

      renderer.render(scene, camera)
      raf = requestAnimationFrame(animate)
    }
    animate()

    const handleResize = () => {
      if (!container) return
      const width = container.clientWidth
      const height = container.clientHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(raf)
      renderer.dispose()
      ground.geometry.dispose()
      ;(ground.material as THREE.Material).dispose()
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement)
      }
    }
  }, [])

  return <div ref={containerRef} className="absolute inset-0 pointer-events-none" />
}

export default LoginScene
