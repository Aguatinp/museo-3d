import { useEffect } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

export default function MuseumModel() {
  const MODEL_URL = 'https://pub-3083059eab134f92b35a56d0331a52c1.r2.dev'

export default function MuseumModel() {
  const { scene } = useGLTF(MODEL_URL)

  // resto del código...
}

  useEffect(() => {
    const glassMaterial = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.16,
      roughness: 0.08,
      metalness: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    })

    const frameMaterial = new THREE.MeshStandardMaterial({
      color: '#070707',
      roughness: 0.35,
      metalness: 0.45,
    })

    const lightMaterial = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      emissive: '#ffffff',
      emissiveIntensity: 0.25,
      roughness: 0.4,
      metalness: 0,
    })

    scene.traverse((object) => {
      if (!object.isMesh) return

      const materialName = object.material?.name || ''

      // Solo vidrio de vitrinas
      if (materialName === 'M_VitrineGlass') {
        object.material = glassMaterial
        object.renderOrder = 10
      }

      // Solo marcos de vitrinas
      if (materialName === 'M_VitrineFrame') {
        object.material = frameMaterial
      }

      // Solo tubos de luz, menos intensos
      if (materialName === 'M_LinearEmit') {
        object.material = lightMaterial
      }
    })
  }, [scene])

  return <primitive object={scene} />
}

useGLTF.preload(MODEL_URL)