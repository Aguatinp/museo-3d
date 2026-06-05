import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, Environment } from '@react-three/drei'
import * as THREE from 'three'
import MuseumModel from './components/MuseumModel.jsx'
import './App.css'

const CAMERA_VIEWS = {
  initialView: {
    position: [0.033, -0.1294, 2.4864],
    target: [0, -0.15, 0],
    fov: 57,
  },
  leftVitrineView: {
    position: [-5.516143719134195, -0.5925308477772486, -1.1021954543764796],
    target: [-5.025789011914751, -0.650036455640188, -2.0318613121819977],
    fov: 58,
  },
  // Vista para la vitrina del escudo, a la derecha de la vitrina izquierda.
  shieldVitrine: {
    position: [-1.9224958014808187, -0.5633400970839046, 0.3107306015115585],
    target: [-1.9235075942834043, -0.6241847185166299, -0.6874161353553377],
    fov: 36.000000000000114,
  },
  // Vista permanente para la vitrina del libro del medio.
  bookVitrine: {
    position: [-0.006674662869920136, -0.552357910377903, 0.3081191407558974],
    target: [-0.007686455672505815, -0.6132025318106283, -0.6900275961109988],
    fov: 36.000000000000114,
  },
  // Vista permanente para la vitrina de pelotas.
  ballsVitrine: {
    position: [2.3674133770988393, -0.5162081227706626, 0.3031340134898728],
    target: [2.3929341053785547, -0.5836879050341108, -0.6942601770956501],
    fov: 36.000000000000114,
  },
  // Vista permanente para la vitrina de deporte.
  sportVitrine: {
    position: [5.782650162369396, -0.4767497561436925, 0.11350846581076635],
    target: [5.4127502538980465, -0.5508617166007003, -0.8126024751839429],
    fov: 36.000000000000114,
  },
}

const CAMERA_ANIMATION_SPEED = 3.2
const CAMERA_LOCK_RETURN_SPEED = 9

const baseHotspots = [
  {
    id: 'left-cap-vitrine',
    label: 'Birrete',
    viewId: 'leftVitrineView',
    folderName: 'Vitrina izquierda',
    position: [-2.3, -0.7, -0.6],
  },
  {
    id: 'shield-vitrine',
    label: 'Escudo',
    viewId: 'shieldVitrine',
    folderName: 'Vitrina escudo',
    position: [-0.85, -0.6, 0],
  },
  {
    id: 'book-vitrine',
    label: 'Libro',
    viewId: 'bookVitrine',
    folderName: 'Vitrina libro',
    position: [0, -0.6, 0],
  },
  {
    id: 'balls-vitrine',
    label: 'Esferas',
    viewId: 'ballsVitrine',
    folderName: 'Pelotas',
    position: [1.45, -0.85, -1.1],
  },
  {
    id: 'right-vitrine',
    label: 'Objeto derecho',
    viewId: 'sportVitrine',
    folderName: 'Deporte',
    position: [2.7, -0.85, -0.95],
  },
]

function resolveCameraView(viewName) {
  return CAMERA_VIEWS[viewName]
}

function LoaderFallback() {
  return (
    <Html center>
      <div className="model-loader">Cargando museo 3D...</div>
    </Html>
  )
}

function applyInitialCameraState(camera, controls, initialView = resolveCameraView('initialView')) {
  camera.position.set(...initialView.position)
  camera.fov = initialView.fov
  camera.updateProjectionMatrix()

  controls.target.set(...initialView.target)
  controls.update()
}

function FixedCameraControls({ activeViewRequest }) {
  const controlsRef = useRef()
  const { camera } = useThree()
  const initialCameraView = resolveCameraView('initialView')
  const previousRequestIdRef = useRef(activeViewRequest.requestId)
  const hasInitializedCameraRef = useRef(false)
  const isAnimatingRef = useRef(false)
  const animationSpeedRef = useRef(CAMERA_ANIMATION_SPEED)
  const activeCameraViewRef = useRef(initialCameraView)
  const targetPositionRef = useRef(
    new THREE.Vector3(...initialCameraView.position),
  )
  const targetOrbitRef = useRef(new THREE.Vector3(...initialCameraView.target))

  useEffect(() => {
    const controls = controlsRef.current

    if (!controls) return undefined

    applyInitialCameraState(camera, controls, initialCameraView)
    hasInitializedCameraRef.current = true
    const returnToActiveView = () => {
      const view = activeCameraViewRef.current
      const lockedPosition = new THREE.Vector3(...view.position)
      const lockedTarget = new THREE.Vector3(...view.target)
      const hasMoved =
        camera.position.distanceTo(lockedPosition) > 0.01 ||
        controls.target.distanceTo(lockedTarget) > 0.01 ||
        Math.abs(camera.fov - view.fov) > 0.01

      if (!hasMoved || isAnimatingRef.current) return

      targetPositionRef.current.copy(lockedPosition)
      targetOrbitRef.current.copy(lockedTarget)
      animationSpeedRef.current = CAMERA_LOCK_RETURN_SPEED
      isAnimatingRef.current = true
    }

    controls.addEventListener('end', returnToActiveView)

    return () => {
      controls.removeEventListener('end', returnToActiveView)
    }
  }, [camera])

  useEffect(() => {
    if (previousRequestIdRef.current === activeViewRequest.requestId) return

    const nextView = resolveCameraView(activeViewRequest.viewName)

    if (!nextView) return

    previousRequestIdRef.current = activeViewRequest.requestId
    activeCameraViewRef.current = nextView
    targetPositionRef.current.set(...nextView.position)
    targetOrbitRef.current.set(...nextView.target)
    animationSpeedRef.current = CAMERA_ANIMATION_SPEED
    isAnimatingRef.current = true
  }, [activeViewRequest])

  useFrame((_, delta) => {
    const controls = controlsRef.current

    if (controls && !hasInitializedCameraRef.current) {
      applyInitialCameraState(camera, controls)
      hasInitializedCameraRef.current = true
    }

    if (!controls || !isAnimatingRef.current) return

    const view = activeCameraViewRef.current
    const alpha = 1 - Math.exp(-animationSpeedRef.current * delta)

    camera.position.lerp(targetPositionRef.current, alpha)
    controls.target.lerp(targetOrbitRef.current, alpha)
    camera.fov += (view.fov - camera.fov) * alpha
    camera.updateProjectionMatrix()
    controls.update()

    const isPositionReady = camera.position.distanceTo(targetPositionRef.current) < 0.01
    const isTargetReady = controls.target.distanceTo(targetOrbitRef.current) < 0.01
    const isFovReady = Math.abs(camera.fov - view.fov) < 0.01

    if (!isPositionReady || !isTargetReady || !isFovReady) return

    camera.position.copy(targetPositionRef.current)
    controls.target.copy(targetOrbitRef.current)
    camera.fov = view.fov
    camera.updateProjectionMatrix()
    controls.update()
    isAnimatingRef.current = false
  })

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={1}
      maxDistance={9}
    />
  )
}

function VitrineHotspots({
  hotspots,
  openHotspot,
  setOpenHotspot,
  onSelectHotspot,
}) {
  return (
    <>
      {hotspots.map((hotspot) => {
        const isOpen = openHotspot === hotspot.id
        const folderHref = `/vitrinas/${encodeURIComponent(hotspot.folderName)}/`

        return (
          <Html
            key={hotspot.id}
            position={hotspot.position}
            center
            zIndexRange={[20, 0]}
          >
            <div className="vitrine-hotspot">
              <button
                type="button"
                className={`vitrine-dot${isOpen ? ' is-open' : ''}`}
                aria-label={`Abrir menu de ${hotspot.label}`}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation()
                  onSelectHotspot(hotspot.viewId)
                  setOpenHotspot(isOpen ? null : hotspot.id)
                }}
              />
              {isOpen && (
                <div
                  className="vitrine-menu"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                >
                  <strong>{hotspot.label}</strong>
                  <a href={folderHref} target="_blank" rel="noreferrer">
                    Abrir carpeta
                  </a>
                </div>
              )}
            </div>
          </Html>
        )
      })}
    </>
  )
}

function ActiveScreenHotspot({
  hotspot,
  isOpen,
  setOpenHotspot,
}) {
  if (!hotspot) return null

  const folderHref = `/vitrinas/${encodeURIComponent(hotspot.folderName)}/`

  return (
    <div className="screen-hotspot-anchor">
      <div className="vitrine-hotspot">
        <button
          type="button"
          className={`vitrine-dot${isOpen ? ' is-open' : ''}`}
          aria-label={`Abrir menu de ${hotspot.label}`}
          onClick={(event) => {
            event.stopPropagation()
            setOpenHotspot(isOpen ? null : hotspot.id)
          }}
        />
        {isOpen && (
          <div
            className="vitrine-menu"
            onClick={(event) => event.stopPropagation()}
          >
            <strong>{hotspot.label}</strong>
            <a href={folderHref} target="_blank" rel="noreferrer">
              Abrir carpeta
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

function VitrineScreenNavigation({ previousHotspot, nextHotspot, onSelectHotspot }) {
  if (!previousHotspot && !nextHotspot) return null

  return (
    <div className="screen-vitrine-navigation" aria-label="Navegacion entre vitrinas">
      {previousHotspot && (
        <button
          type="button"
          className="screen-vitrine-arrow screen-vitrine-arrow-left"
          aria-label={`Ir a ${previousHotspot.label}`}
          onClick={() => onSelectHotspot(previousHotspot.viewId)}
        >
          &lt;
        </button>
      )}

      {nextHotspot && (
        <button
          type="button"
          className="screen-vitrine-arrow screen-vitrine-arrow-right"
          aria-label={`Ir a ${nextHotspot.label}`}
          onClick={() => onSelectHotspot(nextHotspot.viewId)}
        >
          &gt;
        </button>
      )}
    </div>
  )
}

function ReturnToInitialViewButton({ onSelectInitialView }) {
  return (
    <button
      type="button"
      className="return-initial-view-button"
      onClick={onSelectInitialView}
    >
      Volver a vista inicial
    </button>
  )
}

export default function App() {
  const [activeView, setActiveView] = useState('initialView')
  const [activeViewRequest, setActiveViewRequest] = useState({
    viewName: 'initialView',
    requestId: 0,
  })
  const [openHotspot, setOpenHotspot] = useState(null)

  const hotspots = baseHotspots
  const activeScreenHotspot =
    activeView === 'initialView'
      ? null
      : hotspots.find((hotspot) => hotspot.viewId === activeView)
  const activeHotspotIndex = hotspots.findIndex(
    (hotspot) => hotspot.viewId === activeView,
  )
  const previousScreenHotspot =
    activeHotspotIndex > 0 ? hotspots[activeHotspotIndex - 1] : null
  const nextScreenHotspot =
    activeHotspotIndex >= 0 && activeHotspotIndex < hotspots.length - 1
      ? hotspots[activeHotspotIndex + 1]
      : null

  const requestCameraView = (viewName) => {
    setActiveView(viewName)
    const targetHotspot = baseHotspots.find(
      (hotspot) => hotspot.viewId === viewName,
    )

    setOpenHotspot(targetHotspot?.id ?? null)
    setActiveViewRequest((currentRequest) => ({
      viewName,
      requestId: currentRequest.requestId + 1,
    }))
  }

  return (
    <main className="museum-scene">
      <Canvas>
        <color attach="background" args={['#111827']} />

        <ambientLight intensity={0.4} />
        <hemisphereLight args={['#ffffff', '#394150', 0.35]} />

        <directionalLight position={[4, 6, 5]} intensity={0.8} />
        <directionalLight position={[-4, 3, 3]} intensity={0.35} />

        <pointLight position={[0, 3, 3]} intensity={0.45} color="#f8d49a" />

        <Environment preset="warehouse" background={false} />

        <Suspense fallback={<LoaderFallback />}>
          <group position={[0, -1.5, 0]} scale={1}>
            <MuseumModel />
          </group>
        </Suspense>

        {activeView === 'initialView' && (
          <VitrineHotspots
            hotspots={hotspots}
            openHotspot={openHotspot}
            setOpenHotspot={setOpenHotspot}
            onSelectHotspot={requestCameraView}
          />
        )}

        <FixedCameraControls activeViewRequest={activeViewRequest} />
      </Canvas>

      <ActiveScreenHotspot
        hotspot={activeScreenHotspot}
        isOpen={activeScreenHotspot?.id === openHotspot}
        setOpenHotspot={setOpenHotspot}
      />

      {activeScreenHotspot && (
        <VitrineScreenNavigation
          previousHotspot={previousScreenHotspot}
          nextHotspot={nextScreenHotspot}
          onSelectHotspot={requestCameraView}
        />
      )}

      {activeScreenHotspot && (
        <ReturnToInitialViewButton
          onSelectInitialView={() => requestCameraView('initialView')}
        />
      )}
    </main>
  )
}
