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
import { useStore } from './store'

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
  const scrimOpacity = useTransform(
    scrollY,
    [0, 520],
    [0, 0.4],
  )

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
  const railOpacity = useTransform(
    scrollY,
    [vh * 0.5, vh * 1.1],
    [0, 1],
  )

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
    </MotionConfig>
  )
}

