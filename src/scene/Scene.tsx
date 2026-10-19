import {
  Suspense,
  useMemo,
  useRef,
  useEffect,
  type MutableRefObject,
} from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import {
  EffectComposer,
  Bloom,
  DepthOfField,
  SMAA,
} from '@react-three/postprocessing'
import * as THREE from 'three'

import Env from './Env'
import { FOCUS_POINTS, FRAMES_PER_NODE } from '../data/focusPoints'

useGLTF.preload(`${import.meta.env.BASE_URL}models/me.glb`)

const POINTS = FOCUS_POINTS as readonly string[]
const M = POINTS.length
const RESUME_FRAMES = M * FRAMES_PER_NODE
const WORKS_ENTRANCE = 50
const FPS = 24
const NODE_LINE = 0.3

function GradientBackground() {
  const top = '#2f20fd'
  const bottom = '#8adbf6'
  const steep = 1.4

  const uniforms = useMemo(
    () => ({
      uTop: { value: new THREE.Color() },
      uBottom: { value: new THREE.Color() },
      uSteep: { value: 1 },
    }),
    [],
  )

  uniforms.uTop.value.set(top)
  uniforms.uBottom.value.set(bottom)
  uniforms.uSteep.value = steep

  return (
    <mesh scale={100}>
      <sphereGeometry args={[1, 32, 32]} />

      <shaderMaterial
        side={THREE.BackSide}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={/* glsl */ `
          varying vec3 vDir;

          void main() {
            vDir = normalize(position);

            gl_Position =
              projectionMatrix *
              modelViewMatrix *
              vec4(position, 1.0);
          }
        `}
        fragmentShader={/* glsl */ `
          uniform vec3 uTop;
          uniform vec3 uBottom;
          uniform float uSteep;

          varying vec3 vDir;

          void main() {
            float t = clamp(
              vDir.y * uSteep * 0.5 + 0.5,
              0.0,
              1.0
            );

            gl_FragColor = vec4(
              mix(uBottom, uTop, t),
              1.0
            );
          }
        `}
      />
    </mesh>
  )
}

function Lights() {
  const c = {
    envIntensity: 0.85,
    hemiIntensity: 1.15,
    hemiSky: '#ffffff',
    hemiGround: '#404040',
    keyIntensity: 2.35,
    keyColor: '#ffd9c6',
    keyPos: [5, 8, 5] as [number, number, number],
    fillIntensity: 2.25,
    fillColor: '#9fc6ff',
    fillPos: [-5, 4, -4] as [number, number, number],
  }

  return (
    <>
      <Env
        intensity={c.envIntensity}
        rotationX={0}
        rotationY={0}
        rotationZ={0}
        asBackground={false}
        bgIntensity={0.4}
        bgBlur={0}
      />

      <hemisphereLight
        args={[
          c.hemiSky,
          c.hemiGround,
          c.hemiIntensity,
        ]}
      />

      <directionalLight
        position={c.keyPos}
        intensity={c.keyIntensity}
        color={c.keyColor}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />

      <directionalLight
        position={c.fillPos}
        intensity={c.fillIntensity}
        color={c.fillColor}
      />
    </>
  )
}

function Man2({
  focusRef,
  frameRef,
  dofBokehRef,
  dofRangeRef,
}: {
  focusRef: MutableRefObject<THREE.Vector3>
  frameRef: MutableRefObject<number>
  dofBokehRef: MutableRefObject<number>
  dofRangeRef: MutableRefObject<number>
}) {
  const posX = 0
  const posY = 0.4
  const posZ = -0.7
  const scale = 2.25
  const rotationY = 0

  const cam = {
    damping: 0.1,
    dwell: 0.35,
    parallax: 4,
    parallaxEase: 0.1,

    mobilePullback: 1.15,
    mobileTimelineShift: 0,

    mobileOffsetX: 0,
    mobileOffsetY: 0,
  }

  const eye = {
    enabled: true,
    gain: 1.15,
    maxYaw: 11,
    maxPitch: 7,
    invertX: false,
    invertY: false,
    smooth: 0.24,
    crossEye: 8,
    crossRadius: 0.3,
  }

  const get = useThree((s) => s.get)

  const { scene, animations } = useGLTF(
    `${import.meta.env.BASE_URL}models/me.glb`,
  )

  const {
    model,
    eyes,
    points,
    startPoint,
    glbCam,
    focusNode,
    dof,
  } = useMemo(() => {
    const clone = scene.clone(true)
    const eyes: any[] = []
    const pmap: Record<string, any> = {}

    let startPoint: any = null
    let glbCam: any = null
    let focusNode: any = null

    clone.traverse((o: any) => {
      if (o.isMesh) {
        o.castShadow = true
        o.receiveShadow = true
      }

      if (o.isCamera) glbCam = o

      if (
        o.name === 'focus-start' ||
        o.name === 'focus-0'
      ) {
        startPoint = o
      }

      if (o.name === 'focus-works') {
        focusNode = o
      }

      if (POINTS.includes(o.name)) {
        pmap[o.name] = o
      }

      if (/eye/i.test(o.name)) {
        if (o.isMesh) {
          o.geometry.computeVertexNormals()

          const mats = Array.isArray(o.material)
            ? o.material
            : [o.material]

          mats.forEach((m: any) => {
            m.flatShading = false
            m.needsUpdate = true
          })
        }

        eyes.push({
          obj: o,
          base: o.quaternion.clone(),
          x: o.position.x,
        })
      }
    })

    if (eyes.length > 1) {
      const xs = eyes.map((e) => e.x)
      const min = Math.min(...xs)
      const max = Math.max(...xs)
      const mid = (min + max) / 2

      eyes.forEach((e) => {
        e.sx = e.x < mid ? -1 : 1
      })
    } else {
      eyes.forEach((e) => {
        e.sx = 0
      })
    }

    const pts = POINTS.map((n) => pmap[n] || null)

    const works =
      focusNode || pts[pts.length - 1] || null

    const start = startPoint || pts[0] || null

    const ud = (o: any): any => o?.userData ?? {}

    const hasDofParams = [...pts, start, works].some(
      (o) => ud(o).dofBokeh !== undefined,
    )

    const effBokeh = (o: any): number =>
      ud(o).dofEnabled === false
        ? 0
        : (ud(o).dofBokeh ?? 0)

    const effRange = (o: any): number =>
      ud(o).dofFocusRange ?? 0

    return {
      model: clone,
      eyes,
      points: pts,
      startPoint: start,
      glbCam,
      focusNode: works,

      dof: {
        has: hasDofParams,
        bokeh: pts.map(effBokeh),
        range: pts.map(effRange),
        startBokeh: effBokeh(start),
        startRange: effRange(start),
        worksBokeh: effBokeh(works),
        worksRange: effRange(works),
      },
    }
  }, [scene])

  const totalFrames = useMemo(() => {
    const clips: any[] = animations || []

    const camClip = clips.find(
      (c: any) => c.name === 'CameraAction',
    )

    const clip =
      camClip ||
      (clips.length
        ? clips.reduce((a, b) =>
            b.duration > a.duration ? b : a,
          )
        : null)

    return clip
      ? Math.round(clip.duration * FPS)
      : RESUME_FRAMES + 2 * WORKS_ENTRANCE
  }, [animations])

  const mixer = useMemo(
    () => new THREE.AnimationMixer(model),
    [model],
  )

  const actions = useRef<any[]>([])

  useEffect(() => {
    if (!animations || animations.length === 0) return

    mixer.stopAllAction()

    actions.current = animations.map((clip) => {
      const a = mixer.clipAction(clip)

      a.play()
      a.paused = true

      return {
        action: a,
        duration: clip.duration,
      }
    })

    return () => {
      mixer.stopAllAction()
      actions.current = []
    }
  }, [mixer, animations])

  const mouse = useRef({ x: 0, y: 0 })
  const smouse = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current.x =
        (e.clientX / window.innerWidth) * 2 - 1

      mouse.current.y =
        -((e.clientY / window.innerHeight) * 2 - 1)
    }

    window.addEventListener('mousemove', onMove)

    return () => {
      window.removeEventListener('mousemove', onMove)
    }
  }, [])

  const isMobile = useRef(
    typeof window !== 'undefined' &&
      (
        window.matchMedia?.('(pointer: coarse)').matches === true ||
        window.innerWidth <= 640
      ),
  )

  const anchorEls = useRef<any>(null)
  const galleryEl = useRef<any>(null)

  const frameSmooth = useRef(0)

  const posA = useRef(new THREE.Vector3())
  const posB = useRef(new THREE.Vector3())

  const tmpEuler = useRef(
    new THREE.Euler(0, 0, 0, 'YXZ'),
  )

  const tmpQuat = useRef(new THREE.Quaternion())
  const desiredQuat = useRef(new THREE.Quaternion())
  const tmpVec = useRef(new THREE.Vector3())

  const camPos = useRef(new THREE.Vector3())
  const camQuat = useRef(new THREE.Quaternion())
  const camScl = useRef(new THREE.Vector3())

  const paraEuler = useRef(
    new THREE.Euler(0, 0, 0, 'YXZ'),
  )

  const paraQuat = useRef(new THREE.Quaternion())

  useFrame((_, dt) => {
    const a = 1 - Math.pow(cam.damping, dt)

    if (!anchorEls.current) {
      anchorEls.current = POINTS.map((n) =>
        document.querySelector(`[data-point="${n}"]`),
      )
    }

    const els = anchorEls.current

    const d = THREE.MathUtils.clamp(
      cam.dwell,
      0,
      0.49,
    )

    const dwell = (t: number) => {
      if (d <= 0) return t
      if (t < d) return 0
      if (t > 1 - d) return 1

      return THREE.MathUtils.smoothstep(
        (t - d) / (1 - 2 * d),
        0,
        1,
      )
    }

    let sTarget = THREE.MathUtils.clamp(
      frameSmooth.current / FRAMES_PER_NODE - 1,
      -1,
      M - 1,
    )

    if (
      els &&
      els.length === M &&
      els.every(Boolean)
    ) {
      const refLine =
        window.scrollY + window.innerHeight * NODE_LINE

      const tops = els.map(
        (el: any) =>
          el.getBoundingClientRect().top + window.scrollY,
      )

      if (refLine <= tops[0]) {
        const heroScroll = Math.max(
          1,
          tops[0] - window.innerHeight * NODE_LINE,
        )

        sTarget =
          -1 +
          dwell(
            THREE.MathUtils.clamp(
              window.scrollY / heroScroll,
              0,
              1,
            ),
          )
      } else if (refLine >= tops[M - 1]) {
        sTarget = M - 1
      } else {
        for (let i = 0; i < M - 1; i++) {
          if (refLine <= tops[i + 1]) {
            const t =
              (refLine - tops[i]) /
              Math.max(1, tops[i + 1] - tops[i])

            sTarget = i + dwell(t)
            break
          }
        }
      }
    }

    let frameTarget = THREE.MathUtils.clamp(
      (sTarget + 1) * FRAMES_PER_NODE,
      0,
      RESUME_FRAMES,
    )

    let inWorks = false

    if (!galleryEl.current) {
      galleryEl.current =
        document.querySelector('.wk-gallery')
    }

    if (galleryEl.current) {
      const ih = window.innerHeight

      const rectTop =
        galleryEl.current.getBoundingClientRect().top

      const range = Math.max(
        0,
        galleryEl.current.offsetHeight - ih,
      )

      if (rectTop < ih) {
        inWorks = true

        const entranceEnd = Math.min(
          RESUME_FRAMES + WORKS_ENTRANCE,
          totalFrames,
        )

        if (rectTop > 0) {
          const pA = THREE.MathUtils.clamp(
            1 - rectTop / ih,
            0,
            1,
          )

          frameTarget =
            RESUME_FRAMES +
            (entranceEnd - RESUME_FRAMES) * pA
        } else {
          const scrolled = THREE.MathUtils.clamp(
            -rectTop,
            0,
            range,
          )

          const pB = THREE.MathUtils.clamp(
            scrolled / window.innerWidth,
            0,
            1,
          )

          frameTarget =
            entranceEnd +
            (totalFrames - entranceEnd) * pB
        }
      }
    }

    const smoothOff = THREE.MathUtils.smoothstep(
      frameTarget,
      RESUME_FRAMES,
      RESUME_FRAMES + WORKS_ENTRANCE,
    )

    const aEff = THREE.MathUtils.lerp(
      a,
      1,
      smoothOff,
    )

    frameSmooth.current +=
      (frameTarget - frameSmooth.current) * aEff

    const frame = frameSmooth.current

    if (actions.current.length) {
      const t = frame / FPS

      for (const {
        action: act,
        duration,
      } of actions.current) {
        act.time = Math.min(t, duration)
      }

      mixer.update(0)
    }

    if (frameRef) {
      frameRef.current = frame
    }

    const s = THREE.MathUtils.clamp(
      frame / FRAMES_PER_NODE - 1,
      -1,
      M - 1,
    )

    if (focusRef) {
      if (inWorks && focusNode) {
        focusNode.getWorldPosition(focusRef.current)
      } else if (s < 0 && startPoint && points[0]) {
        startPoint.getWorldPosition(posA.current)
        points[0].getWorldPosition(posB.current)

        focusRef.current.lerpVectors(
          posA.current,
          posB.current,
          THREE.MathUtils.clamp(s + 1, 0, 1),
        )
      } else {
        const sc = THREE.MathUtils.clamp(
          s,
          0,
          M - 1,
        )

        const iA = Math.floor(sc)
        const iB = Math.min(iA + 1, M - 1)
        const f = sc - iA

        if (points[iA] && points[iB]) {
          points[iA].getWorldPosition(posA.current)
          points[iB].getWorldPosition(posB.current)

          focusRef.current.lerpVectors(
            posA.current,
            posB.current,
            f,
          )
        }
      }
    }

    // Preserve the existing GLB depth-of-field calculations.
    if (dofBokehRef && dofRangeRef) {
      if (!dof.has) {
        dofBokehRef.current = -1
      } else {
        const sample = (
          arr: number[],
          sv: number,
          wv: number,
        ): number => {
          if (inWorks) return wv

          if (s < 0) {
            return THREE.MathUtils.lerp(
              sv,
              arr[0] ?? sv,
              THREE.MathUtils.clamp(s + 1, 0, 1),
            )
          }

          const sc = THREE.MathUtils.clamp(
            s,
            0,
            M - 1,
          )

          const iA = Math.floor(sc)
          const iB = Math.min(iA + 1, M - 1)

          return THREE.MathUtils.lerp(
            arr[iA] ?? 0,
            arr[iB] ?? 0,
            sc - iA,
          )
        }

        dofBokehRef.current = sample(
          dof.bokeh,
          dof.startBokeh,
          dof.worksBokeh,
        )

        dofRangeRef.current =
          sample(
            dof.range,
            dof.startRange,
            dof.worksRange,
          ) * scale
      }
    }

    // Copy the animated GLB camera transform into the active camera.
    const camera: any = get().camera

    if (glbCam && camera.isPerspectiveCamera) {
      glbCam.updateWorldMatrix(true, false)

      glbCam.matrixWorld.decompose(
        camPos.current,
        camQuat.current,
        camScl.current,
      )

      const me = 1 - Math.pow(cam.parallaxEase, dt)

      smouse.current.x +=
        (mouse.current.x - smouse.current.x) * me

      smouse.current.y +=
        (mouse.current.y - smouse.current.y) * me

      const ax = THREE.MathUtils.degToRad(
        cam.parallax,
      )

      paraEuler.current.set(
        -smouse.current.y * ax,
        -smouse.current.x * ax,
        0,
      )

      paraQuat.current.setFromEuler(
        paraEuler.current,
      )

      tmpVec.current
        .copy(camPos.current)
        .sub(focusRef.current)
        .applyQuaternion(paraQuat.current)

      if (isMobile.current) {
        tmpVec.current.multiplyScalar(
          cam.mobilePullback,
        )
      }

      tmpVec.current.add(focusRef.current)

      camera.position.copy(tmpVec.current)

      camera.quaternion.multiplyQuaternions(
        paraQuat.current,
        camQuat.current,
      )

      if (isMobile.current) {
        if (cam.mobileTimelineShift !== 0) {
          const tlWeight =
            THREE.MathUtils.smoothstep(
              s,
              -0.8,
              0.3,
            ) *
            (1 - smoothOff)

          if (tlWeight > 0) {
            const dist = camera.position.distanceTo(
              focusRef.current,
            )

            camera.translateX(
              -dist *
                cam.mobileTimelineShift *
                tlWeight,
            )
          }
        }

        camera.translateX(cam.mobileOffsetX)
        camera.translateY(cam.mobileOffsetY)
      }

      if (camera.fov !== glbCam.fov) {
        camera.fov = glbCam.fov
        camera.updateProjectionMatrix()
      }
    }

    // Preserve the existing desktop eye-follow behavior.
    if (
      !eye.enabled ||
      eyes.length === 0 ||
      isMobile.current
    ) {
      return
    }

    const sx = eye.invertX ? -1 : 1
    const sy = eye.invertY ? -1 : 1

    let ax = 0
    let ay = 0

    for (const e of eyes) {
      e.obj
        .getWorldPosition(tmpVec.current)
        .project(camera)

      ax += tmpVec.current.x
      ay += tmpVec.current.y
    }

    ax /= eyes.length
    ay /= eyes.length

    const mx = mouse.current.x - ax
    const my = mouse.current.y - ay

    const yawBase =
      sx *
      mx *
      THREE.MathUtils.degToRad(eye.maxYaw) *
      eye.gain

    const pitch =
      sy *
      -my *
      THREE.MathUtils.degToRad(eye.maxPitch) *
      eye.gain

    const dist = Math.hypot(mx, my)

    const convWeight = THREE.MathUtils.clamp(
      1 - dist / eye.crossRadius,
      0,
      1,
    )

    const convRad =
      THREE.MathUtils.degToRad(eye.crossEye) *
      convWeight

    for (const e of eyes) {
      const yaw = yawBase - e.sx * convRad

      tmpEuler.current.set(pitch, yaw, 0)

      tmpQuat.current.setFromEuler(
        tmpEuler.current,
      )

      desiredQuat.current
        .copy(tmpQuat.current)
        .multiply(e.base)

      e.obj.quaternion.slerp(
        desiredQuat.current,
        eye.smooth,
      )
    }
  })

  return (
    <group
      position={[posX, posY, posZ]}
      rotation={[
        0,
        (rotationY * Math.PI) / 180,
        0,
      ]}
      scale={scale}
    >
      <primitive object={model} />
    </group>
  )
}

function Post2({
  focusRef,
  frameRef,
  dofBokehRef,
  dofRangeRef,
}: {
  focusRef: MutableRefObject<THREE.Vector3>
  frameRef: MutableRefObject<number>
  dofBokehRef: MutableRefObject<number>
  dofRangeRef: MutableRefObject<number>
}) {
  const post = {
    bloomIntensity: 0.6,
    bloomThreshold: 0.82,

    // TEMPORARY TEST: disable Depth of Field.
    // Restore to true after testing if performance does not improve.
    dof: false,

    startBokeh: 8.4,
    startRange: 3.0,
    focusBokeh: 3.0,
    focusRange: 0.15,
    startBlendFrame: 60,
    endBlendFrame: RESUME_FRAMES - 50,
  }

  const dofRef = useRef<any>(null)

  const isMobile = useRef(
    typeof window !== 'undefined' &&
      (
        window.matchMedia?.('(pointer: coarse)').matches === true ||
        window.innerWidth <= 640
      ),
  )

  useFrame(() => {
    const e = dofRef.current
    if (!e) return

    if (e.target && focusRef) {
      e.target.copy(focusRef.current)
    }

    const f = frameRef ? frameRef.current : 0

    const wStart =
      1 -
      THREE.MathUtils.smoothstep(
        f,
        0,
        post.startBlendFrame,
      )

    const wEnd = THREE.MathUtils.smoothstep(
      f,
      post.endBlendFrame,
      RESUME_FRAMES,
    )

    const w = Math.max(wStart, wEnd)

    if (
      dofBokehRef &&
      dofBokehRef.current >= 0
    ) {
      const glbBokeh = dofBokehRef.current

      const glbRange = dofRangeRef
        ? dofRangeRef.current
        : post.focusRange

      if (isMobile.current) {
        e.bokehScale =
          glbBokeh === 0 ? 0 : glbBokeh * 1.5

        if (e.cocMaterial) {
          e.cocMaterial.focusRange = Math.max(
            1e-4,
            glbRange * 0.7,
          )
        }
      } else {
        e.bokehScale = glbBokeh

        if (e.cocMaterial) {
          e.cocMaterial.focusRange = Math.max(
            1e-4,
            glbRange,
          )
        }
      }
    } else {
      const bokeh = THREE.MathUtils.lerp(
        post.focusBokeh,
        post.startBokeh,
        w,
      )

      const range = THREE.MathUtils.lerp(
        post.focusRange,
        post.startRange,
        w,
      )

      if (isMobile.current) {
        e.bokehScale = bokeh * 1.25

        if (e.cocMaterial) {
          e.cocMaterial.focusRange = Math.max(
            1e-4,
            range * 0.8,
          )
        }
      } else {
        e.bokehScale = bokeh

        if (e.cocMaterial) {
          e.cocMaterial.focusRange = Math.max(
            1e-4,
            range,
          )
        }
      }
    }
  })

  return (
    <EffectComposer
      multisampling={0}
      stencilBuffer={false}
      depthBuffer
    >
      {(
        post.dof ? (
          <DepthOfField
            ref={dofRef}
            target={[0, 1.3, 0]}
            worldFocusRange={post.focusRange}
            bokehScale={post.focusBokeh}
            height={480}
          />
        ) : null
      ) as any}

      <Bloom
        mipmapBlur
        intensity={post.bloomIntensity}
        luminanceThreshold={post.bloomThreshold}
        luminanceSmoothing={0.3}
      />

      <SMAA />
    </EffectComposer>
  )
}

export default function Scene() {
  const focusRef = useRef(
    new THREE.Vector3(0, 1.3, 0),
  )

  const frameRef = useRef(0)
  const dofBokehRef = useRef(-1)
  const dofRangeRef = useRef(0.15)

  return (
    <>
      <GradientBackground />

      <Suspense fallback={null}>
        <Lights />

        <Man2
          focusRef={focusRef}
          frameRef={frameRef}
          dofBokehRef={dofBokehRef}
          dofRangeRef={dofRangeRef}
        />
      </Suspense>

      <Post2
        focusRef={focusRef}
        frameRef={frameRef}
        dofBokehRef={dofBokehRef}
        dofRangeRef={dofRangeRef}
      />
    </>
  )
}