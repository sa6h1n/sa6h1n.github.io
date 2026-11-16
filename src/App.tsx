import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import {
  motion,
  MotionConfig,
  useScroll,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import * as THREE from 'three'

import Scene from './scene/Scene'
import NoiseOverlay from './ui/NoiseOverlay'
import Resume from './ui/Resume'
import Works from './ui/Works'
import LoadingScreen from './ui/LoadingScreen'
import SoundToggle from './ui/SoundToggle'
import { startAmbientMusic } from './audio/ambient'
import { useStore } from './store'
import MusicOverlay from './music/MusicOverlay'

// Stop redrawing the 3D scene while the gallery covers it (big smoothness win on Windows laptops).
const PAUSE_SCENE_IN_GALLERY = true

function Backdrop() {
  const setActive = useStore((s) => s.setActive)

  return (
    <mesh
      position={[0, 0, -40]}
      onClick={() => setActive(null)}
    >
      <planeGeometry args={[600, 300]} />
      <meshBasicMaterial
        transparent
        opacity={0}
        depthWrite={false}
      />
    </mesh>
  )
}

type Lang = 'en' | 'zh'

const COPY = {
  en: {
    title: 'About Sachin',
    paragraphs: [
      "I’m Sachin, an IT professional by day and a traveler at heart. When I’m not working with technology, you’ll probably find me exploring new places, capturing moments through my camera, or looking for my next adventure.",
    ],
  },
  zh: {
    title: 'About Sachin',
    paragraphs: [
      'I’m Sachin, an IT professional by day and a traveler at heart. When I’m not working with technology, you’ll probably find me exploring new places, capturing moments through my camera, or looking for my next adventure.',
    ],
  },
}

function Hero({
  lang,
  cueOpacity,
}: {
  lang: Lang
  cueOpacity: MotionValue<number>
}) {
  const { title, paragraphs } = COPY[lang]
  const aboutRef = useRef<HTMLDivElement | null>(null)

  const { scrollYProgress } = useScroll({
    target: aboutRef,
    offset: ['start 0.6', 'start start'],
  })

  const blur = useTransform(
    scrollYProgress,
    [0, 0.5],
    ['blur(0px)', 'blur(16px)'],
  )

  const opacity = useTransform(
    scrollYProgress,
    [0, 0.5],
    [1, 0],
  )

  const titleY = useTransform(
    scrollYProgress,
    [0, 1],
    [0, -96],
  )

  const bodyY = useTransform(
    scrollYProgress,
    [0, 1],
    [0, -52],
  )

  const titleSpacing = useTransform(
    scrollYProgress,
    [0, 1],
    ['0.01em', '0.42em'],
  )

  return (
    <section className="hero">
      <motion.div
        className="about"
        lang={lang}
        ref={aboutRef}
        style={{ filter: blur, opacity }}
      >
        <div className="about-intro">
          <motion.h1
            className="about-title"
            style={{
              y: titleY,
              letterSpacing: titleSpacing,
            }}
          >
            {title}
          </motion.h1>

          {paragraphs.map((paragraph, index) => (
            <motion.p
              key={index}
              className="about-body"
              style={{ y: bodyY }}
            >
              {paragraph}
            </motion.p>
          ))}
        </div>
      </motion.div>

      <motion.div
        className="scroll-cue"
        style={{ opacity: cueOpacity }}
        aria-hidden="true"
      >
        <span className="scroll-cue-label">SCROLL</span>

        <span className="scroll-cue-track">
          <span className="scroll-cue-dot" />
        </span>
      </motion.div>
    </section>
  )
}

export default function App() {
  const lang: Lang = 'en'
  const [views, setViews] = useState<string | null>(null)
  // The music page hides the whole site when it is open, so the 3D scene stops drawing (saves battery)
  const musicCovered = useStore((s) => s.musicCovered)

  // Background music: silent in the hero, starts at "A Little About Me", follows the scroll.
  useEffect(() => startAmbientMusic(), [])

  // Load the site-wide visitor count.
  useEffect(() => {
    let cancelled = false

    fetch('https://sa6h1n.goatcounter.com/counter/TOTAL.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Could not load GoatCounter total')
        }

        return response.json()
      })
      .then((data: { count?: string | number }) => {
        if (cancelled) return

        const count = Number(
          String(data.count ?? '').replace(/,/g, ''),
        )

        if (Number.isFinite(count)) {
          setViews(count.toLocaleString('en-IN'))
        }
      })
      .catch((error) => {
        console.error('Could not load visitor count:', error)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const { scrollY } = useScroll()

  // Ref points to the <section className="works"> element.
  const worksRef = useRef<HTMLElement | null>(null)

  // Saving the GPU for the gallery:
  //  - Past the home screen (About Me onward) the character no longer moves on its own, so the 3D
  //    scene only needs redrawing while the page is actually scrolling. A moment after you stop it
  //    goes quiet (the last picture stays on screen) and wakes up as soon as you scroll again.
  //  - Deep inside the gallery the cards cover the scene and the camera has finished, so it stays
  //    quiet even while you scroll, and wakes up when you scroll back up.
  // Set PAUSE_SCENE_IN_GALLERY to false to keep the scene always drawing.
  const [sceneIdle, setSceneIdle] = useState(false)
  useEffect(() => {
    if (!PAUSE_SCENE_IN_GALLERY) return
    let raf = 0
    let timer = 0

    const evaluate = () => {
      raf = 0
      const el = worksRef.current
      if (!el) return
      const top = el.getBoundingClientRect().top
      const done = window.innerWidth // the camera finishes after ~one screen-width of gallery scroll
      const deep = top < -done * 1.15
      const pastHome = window.scrollY > window.innerHeight * 0.9

      if (deep) {
        // let the camera's easing settle, then stop drawing for good
        if (!timer) {
          timer = window.setTimeout(() => {
            timer = 0
            setSceneIdle(true)
          }, 800)
        }
      } else if (pastHome) {
        // live while scrolling, quiet ~1.2 s after the last scroll
        setSceneIdle(false)
        window.clearTimeout(timer)
        timer = window.setTimeout(() => {
          timer = 0
          setSceneIdle(true)
        }, 1200)
      } else {
        window.clearTimeout(timer)
        timer = 0
        setSceneIdle(false)
      }
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(evaluate)
    }

    evaluate()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      window.clearTimeout(timer)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  const { scrollYProgress: worksProgress } = useScroll({
    target: worksRef,
    offset: ['start end', 'start center'],
  })

  const fogBg = useTransform(
    worksProgress,
    [0, 1],
    [
      'rgba(8, 11, 18, 0)',
      'rgba(8, 11, 18, 0.41)',
    ],
  )

  const fogBlur = useTransform(
    worksProgress,
    [0, 1],
    ['blur(0px)', 'blur(10px)'],
  )

  // Dim the 3D scene while scrolling.
  const scrimBase = useTransform(
    scrollY,
    [0, 520],
    [0, 0.4],
  )

  // The dark right-hand scrim and rail are made for the timeline pages. On the desktop closing
  // "Be the world you want to have!" page there is no timeline, so they fade out there and the
  // dark shadow in the bottom-right corner disappears. On mobile the gallery is a normal stacked
  // page, so the overlay stays exactly as before (isMobile).
  const isMobile = useRef(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const update = () => {
      isMobile.current = mq.matches
    }
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  const { scrollYProgress: galleryEnd } = useScroll({
    target: worksRef,
    offset: ['start start', 'end end'],
  })
  const closingFade = useTransform(galleryEnd, [0.88, 1], [1, 0])
  const scrimOpacity = useTransform([scrimBase, closingFade], ([a, b]: number[]) => (isMobile.current ? a : a * b))

  // Fade out the scroll prompt.
  const cueOpacity = useTransform(
    scrollY,
    [0, 160],
    [1, 0],
  )

  // Retained for the existing hero-gradient effect.
  const heroGradientOpacity = useTransform(
    scrollY,
    [0, 240],
    [1, 0],
  )

  const vh =
    typeof window !== 'undefined'
      ? window.innerHeight
      : 800

  // Fade in the frosted side rail.
  const railBase = useTransform(
    scrollY,
    [vh * 0.5, vh * 1.1],
    [0, 1],
  )
  const railOpacity = useTransform([railBase, closingFade], ([a, b]: number[]) => (isMobile.current ? a : a * b))

  // Fade out the decorative frame.
  const heroChromeOpacity = useTransform(
    scrollY,
    [0, 280],
    [1, 0],
  )

  return (
    <MotionConfig reducedMotion="user">
      <LoadingScreen />

      {/* Fixed 3D background */}
      <div className="scene-bg">
        <Canvas
          frameloop={musicCovered ? 'never' : sceneIdle ? 'demand' : 'always'}
          shadows={{ type: THREE.PCFShadowMap }}
          dpr={[1, 1.5]}
          camera={{
            position: [0, 5, 19],
            fov: 39,
            near: 0.1,
            far: 500,
          }}
          gl={{
            antialias: false,
            stencil: false,
            depth: true,
            toneMapping: THREE.ACESFilmicToneMapping,
          }}
        >
          <color
            attach="background"
            args={['#0a0e16']}
          />

          <Suspense fallback={null}>
            <Backdrop />
            <Scene />
          </Suspense>
        </Canvas>
      </div>

      {/* Scroll dimming overlay */}
      <motion.div
        className="scrim"
        style={{ opacity: scrimOpacity }}
        aria-hidden="true"
      />

      {/* Gallery overlay */}
      <motion.div
        className="stage-fog"
        style={{
          background: fogBg,
          // backdropFilter: fogBlur,
          // WebkitBackdropFilter: fogBlur,
        }}
        aria-hidden="true"
      />

      {/* Frosted side rail */}
      <motion.div
        className="glass-rail"
        style={{ opacity: railOpacity }}
        aria-hidden="true"
      />

      {/* Hero decorative frame */}
      <motion.div
        className="hero-chrome"
        style={{ opacity: heroChromeOpacity }}
        aria-hidden="true"
      >
        <div className="hero-frame" />

        <span className="hero-mark tl">+</span>
        <span className="hero-mark tr">+</span>
        <span className="hero-mark bl">+</span>
        <span className="hero-mark br">+</span>

        <div className="hero-meta hm-tl">
          <span className="hm-name">
            Sachin Reghunadhan
          </span>
          <span>🙃</span>
        </div>

        <div className="hero-meta hm-tr">
          Portfolio — 2026
        </div>

        <div className="hero-meta hm-bl">
          👁 <span id="visitor-count">{views ?? '—'}</span> views
        </div>

        <div className="hero-meta hm-right">
          Based in BLR/KL
        </div>
      </motion.div>

      {/* Film grain overlay */}
      <NoiseOverlay />

      {/* "Tap for sound" chip / mute button */}
      <SoundToggle />

      {/* Scrollable page content */}
      <main className="content">
        <Hero
          lang={lang}
          cueOpacity={cueOpacity}
        />

        <Resume />

        <Works
          lang={lang}
          innerRef={worksRef}
        />

      </main>

      {/* "My Music" page: opens over the site with a circle animation */}
      <MusicOverlay />
    </MotionConfig>
  )
}

