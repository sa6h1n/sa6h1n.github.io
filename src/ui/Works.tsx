import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react'
import { CLOSING_QUOTES } from '../data/quotes'
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
   useInView,
  useReducedMotion,
  type MotionValue,
} from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

import {
  WORKS,
  type WorkListItem,
  type WorkSection,
  type WorksLang,
} from '../data/works'

import { getWorkDoc } from '../data/workDocs'

import { startAudioReactive } from '../audio/reactive'
import QuoteReel from './QuoteReel'
import { useQuoteReveal } from './useQuoteReel'
import PhotoFigure from './PhotoFigure'

const EASE = [0.22, 1, 0.36, 1] as const

// A single work item in a section.
function WorkLine({
  item,
  onOpen,
}: {
  item: WorkListItem
  onOpen: (item: WorkListItem) => void
}) {
  const hasMeta = Boolean(item.meta || (item.tags && item.tags.length))

  return (
    <li className="wk-line">
      <button
        className="wk-line-btn"
        onClick={() => onOpen(item)}
      >
        <span className="wk-line-name">{item.name}</span>

        {hasMeta && (
          <span className="wk-line-meta">
            {item.meta && (
              <span className="wk-line-num">{item.meta}</span>
            )}

            {item.tags?.map((tag, index) => (
              <span key={index} className="wk-line-tag">
                {tag}
              </span>
            ))}
          </span>
        )}
      </button>
    </li>
  )
}

// A full-height gallery section card.
function SectionCard({
  section,
  data,
  onOpen,
}: {
  section: WorkSection
  data: WorksLang
  onOpen: (item: WorkListItem) => void
}) {
  return (
    <div className="wk-card">
      <div className="wk-card-head">
        <span className="wk-card-no">{section.no}</span>

        <h3 className="wk-card-title">{section.title}</h3>

        <span className="wk-card-tagline">
          {section.tagline}
        </span>
      </div>

      <SectionWorks
        section={section}
        data={data}
        onOpen={onOpen}
      />
    </div>
  )
}

// Render the contents of a gallery section.
function SectionWorks({
  section,
  data,
  onOpen,
}: {
  section: WorkSection
  data: WorksLang
  onOpen: (item: WorkListItem) => void
}) {
  return (
    <div className="wk-card-body">
      {section.galleryImages ? (
        <div className="wk-photo-grid">
          {section.galleryImages.map((src, index) => (
            <PhotoFigure
              key={src}
              src={src}
              alt={`${section.title} — ${section.tagline.toLowerCase()}, photo ${index + 1} of ${section.galleryImages!.length}`}
              index={index}
            />
          ))}
        </div>
      ) : (
        <>
          {section.items && (
            <ul className="wk-list">
              {section.items.map((item, index) => (
                <WorkLine
                  key={index}
                  item={item}
                  onOpen={onOpen}
                />
              ))}
            </ul>
          )}

          {section.groups?.map((group, groupIndex) => (
            <div key={groupIndex} className="wk-sub">
              <div className="wk-sub-head">
                {group.heading}
              </div>

              <ul className="wk-list">
                {group.items.map((item, index) => (
                  <WorkLine
                    key={index}
                    item={{ name: item }}
                    onOpen={onOpen}
                  />
                ))}
              </ul>
            </div>
          ))}
        </>
      )}

      {(section.awards || section.footer) && (
        <div className="wk-foot">
          {section.awards && (
            <p className="wk-foot-line">
              <span className="wk-foot-label">
                {data.awardsLabel}
              </span>

              <span className="wk-foot-val accent">
                {section.awards.join('  ·  ')}
              </span>
            </p>
          )}

          {section.footer && (
            <p className="wk-foot-line">
              {section.footer}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// Full-screen work details modal.
function WorkDetail({
  item,
  data,
  onClose,
}: {
  item: WorkListItem
  data: WorksLang
  onClose: () => void
}) {
  const [bannerError, setBannerError] = useState(false)

  const doc = getWorkDoc(item.slug)
  const title = (doc && doc.title) || item.name
  const banner = doc && doc.banner

  const link = doc ? doc.link || item.link : null
  const tags = doc ? doc.tags || item.tags : null

  const sub = doc
    ? [item.meta, doc.role].filter(Boolean).join('  ·  ')
    : ''

  return (
    <>
      <motion.div
        className="wk-detail-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={onClose}
      />

      <motion.div
        className="wk-detail"
        initial={{ opacity: 0, scale: 0.985, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.99, y: 6 }}
        transition={{ duration: 0.42, ease: EASE }}
      >
        <button
          className="wk-detail-close"
          onClick={onClose}
          aria-label={data.closeLabel}
        >
          ✕
        </button>

        {banner && !bannerError ? (
          <div className="wk-detail-banner">
            <img
              src={banner}
              alt={title}
              onError={() => setBannerError(true)}
            />
          </div>
        ) : (
          <div
            className="wk-detail-banner is-ph"
            aria-hidden="true"
          >
            <span className="wk-detail-ph-text">
              {title}
            </span>
          </div>
        )}

        <article className="wk-detail-article">
          <header className="wk-detail-head">
            <h3 className="wk-detail-title">
              {title}
            </h3>

            {sub && (
              <div className="wk-detail-sub">{sub}</div>
            )}

            {tags && tags.length > 0 && (
              <div className="wk-detail-tags">
                {tags.map((tag, index) => (
                  <span key={index} className="wk-badge">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          {doc && doc.body ? (
            <div className="wk-md">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
              >
                {doc.body}
              </ReactMarkdown>
            </div>
          ) : (
            <>
              <p className="wk-detail-desc">
                {data.detailPlaceholder}
              </p>

              <div
                className="wk-detail-ph-img"
                aria-hidden="true"
              >
                <span className="wk-detail-ph-img-label">
                  {data.phImageLabel}
                </span>
              </div>

              <span
                className="wk-detail-link is-ph"
                role="button"
                aria-disabled="true"
              >
                {data.phButtonLabel}{' '}
                <span aria-hidden="true">↗</span>
              </span>
            </>
          )}

          {link && (
            <a
              className="wk-detail-link"
              href={link}
              target="_blank"
              rel="noopener noreferrer"
            >
              {data.visitLabel}{' '}
              <span aria-hidden="true">↗</span>
            </a>
          )}
        </article>
      </motion.div>
    </>
  )
}

// The first screen of the horizontal strip: one big line, written letter by letter — every
// letter springs up with a little tilt and settles; the marked word gets a hand-drawn squiggle
// that draws itself and then ripples gently. When you scroll on, the line doesn't just slide
// away: its letters lift off one after another (reading order), tilting, blurring and fading as
// the photo cards slide in from the right.

/** One letter's exit, driven by how far the strip has scrolled (`exit` 0 → 1). */
function ExitLetter({ exit, i, n, children }: { exit: MotionValue<number>; i: number; n: number; children: ReactNode }) {
  const from = (i / n) * 0.42
  const to = from + 0.4
  const y = useTransform(exit, [from, to], [0, -52 - ((i * 29) % 24)])
  const x = useTransform(exit, [from, to], [0, -34])
  const rotate = useTransform(exit, [from, to], [0, ((i * 53) % 29) - 14])
  const opacity = useTransform(exit, [from, to], [1, 0])
  const filter = useTransform(exit, [from, to], ['blur(0px)', 'blur(9px)'])
  return (
    <motion.span className="wk-intro-exit" style={{ x, y, rotate, opacity, filter }}>
      {children}
    </motion.span>
  )
}

function GalleryIntro({ text, x }: { text: string; x: MotionValue<number> }) {
  const ref = useRef<HTMLDivElement>(null)
  const seen = useInView(ref, { once: true, amount: 0.35 })
  const reduce = useReducedMotion()
  const words = text.split(' ')
  const plain = text.replace(/\*/g, '')
  const total = plain.replace(/ /g, '').length

  // 0 while the panel sits on screen → 1 once it has slid ~80 % of its width to the left
  const exit = useTransform(x, (v) => Math.min(1, Math.max(0, -v / (window.innerWidth * 0.8))))
  const squiggleFade = useTransform(exit, [0, 0.25], [1, 0])

  let ci = 0 // running letter index, for the stagger
  return (
    <div className={`wk-intro${seen ? ' is-seen' : ''}`} ref={ref}>
      <div className="wk-intro-inner">
        <p className="wk-intro-line" aria-label={plain}>
          {words.map((w, wi) => {
            const mark = w.startsWith('*')
            const chars = Array.from(w.replace(/\*/g, ''))
            return (
              <span key={wi} aria-hidden="true">
                <span className={`wk-intro-word${mark ? ' is-mark' : ''}`}>
                  {chars.map((ch, k) => {
                    const i = ci++
                    const tilt = ((i * 37) % 21) - 10 // −10° … +10°, stable
                    const delay = 0.2 + i * 0.034
                    const letter = (
                      <motion.span
                        className="wk-intro-char"
                        style={mark ? { animationDelay: `${1.6 + k * 0.11}s` } : undefined}
                        initial={reduce ? false : { opacity: 0, y: 46, rotate: tilt, scale: 0.7, filter: 'blur(7px)' }}
                        animate={seen || reduce ? { opacity: 1, y: 0, rotate: 0, scale: 1, filter: 'blur(0px)' } : undefined}
                        transition={{
                          default: { type: 'spring', stiffness: 150, damping: 12, mass: 0.7, delay },
                          opacity: { duration: 0.45, delay },
                          filter: { duration: 0.7, delay },
                        }}
                      >
                        {ch}
                      </motion.span>
                    )
                    return reduce ? (
                      <span key={k} className="wk-intro-exit">{letter}</span>
                    ) : (
                      <ExitLetter key={k} exit={exit} i={i} n={total}>{letter}</ExitLetter>
                    )
                  })}
                  {mark && (
                    <motion.svg
                      className="wk-intro-squiggle"
                      viewBox="0 0 200 14"
                      preserveAspectRatio="none"
                      aria-hidden="true"
                      style={reduce ? undefined : { opacity: squiggleFade }}
                    >
                      <motion.path
                        d="M2 8 C 22 2, 40 13, 66 7 S 112 2, 138 8 S 178 12, 198 5"
                        fill="none"
                        stroke="#ffd9b3"
                        strokeWidth="2.6"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                        initial={reduce ? false : { pathLength: 0 }}
                        animate={seen || reduce ? { pathLength: 1 } : undefined}
                        transition={{ duration: 0.9, delay: 0.2 + total * 0.034 * 0.5, ease: EASE }}
                      />
                    </motion.svg>
                  )}
                </span>
                {wi < words.length - 1 ? ' ' : null}
              </span>
            )
          })}
        </p>
      </div>
    </div>
  )
}

function QuoteCard() {
  const quoteRef = useRef<HTMLDivElement>(null)

  const isInView = useInView(quoteRef, {
    amount: 0.15,
    once: true,
  })

  // Every time this card scrolls into view a NEW closing line is chosen and a slot-machine reel
  // spins onto it — on page open, after leaving the gallery, and when scrolling back to it.
  const onScreen = useInView(quoteRef, { amount: 0.5 })
  const { quote, runId, delay, showQuote } = useQuoteReveal(onScreen)

  // The dots at the very bottom are the control: click one to show that line. Ignored while a
  // change is still playing, and until the first line has finished writing itself out.
  const [busy, setBusy] = useState(false)
  const [used, setUsed] = useState(false) // after the first click the "look at me" cues stop
  const busyTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(busyTimer.current), [])
  useEffect(() => {
    if (!isInView) return
    setBusy(true)
    const t = window.setTimeout(() => setBusy(false), 4300)
    return () => window.clearTimeout(t)
  }, [isInView])
  const pick = (i: number) => {
    if (busy || CLOSING_QUOTES[i] === quote) return
    setUsed(true)
    setBusy(true)
    showQuote(CLOSING_QUOTES[i])
    busyTimer.current = window.setTimeout(() => setBusy(false), 2600)
  }
  const current = CLOSING_QUOTES.indexOf(quote)

  const words = ['Be', 'the', 'world', 'you', 'want', 'to', 'have!']

  return (
    <div
      ref={quoteRef}
      className="wk-card wk-quote-card"
    >
      <div className="wk-quote-content">
        <motion.span
          className="wk-quote-label"
          initial={{ opacity: 0, y: 8 }}
          animate={
            isInView
              ? { opacity: 1, y: 0 }
              : { opacity: 0, y: 8 }
          }
          transition={{ duration: 0.5, ease: EASE }}
        >
          THANK YOU -
        </motion.span>

       <h2 className="wk-quote-text">
  {words.map((word, index) => (
    <motion.span
      key={`${word}-${index}`}
      initial={{ opacity: 0, y: 12 }}
      animate={
        isInView
          ? { opacity: 1, y: 0 }
          : { opacity: 0, y: 12 }
      }
      transition={{
        duration: 0.55,
        delay: 0.15 + index * 0.22,
        ease: EASE,
      }}
      className="wk-quote-word"
    >
      {word}
    </motion.span>
  ))}
</h2>

        <motion.span
          className="wk-quote-mark"
          initial={{ opacity: 0, scale: 0.6, rotate: -45 }}
          animate={
            isInView
              ? { opacity: 1, scale: 1, rotate: 0 }
              : { opacity: 0, scale: 0.6, rotate: -45 }
          }
          transition={{
            duration: 0.65,
            delay: 1.8,
            ease: EASE,
          }}
        >
          ✳
        </motion.span>
        <motion.div
          className="closing-quote"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.5, delay: 1.9 }}
        >
          <QuoteReel quote={quote} runId={runId} delay={delay} />
        </motion.div>

        {/* very bottom (where the progress line was): one dot per line — click one to show it */}
        <motion.div
          className={`quote-dots-wrap${used ? ' is-used' : ''}`}
          initial={{ opacity: 0, y: 8 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
          transition={{ duration: 0.65, delay: 2.4, ease: EASE }}
        >
          <nav className="quote-dots" aria-label="Choose a closing line">
            {CLOSING_QUOTES.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`quote-dot${i === current ? ' is-on' : ''}`}
                style={{ ['--i' as string]: i }}
                aria-label={`Line ${i + 1} of ${CLOSING_QUOTES.length}`}
                aria-current={i === current || undefined}
                title="Show this line"
                onClick={() => pick(i)}
              />
            ))}
          </nav>
        </motion.div>
      </div>
    </div>
  )
}

export default function Works({
  lang,
  innerRef,
}: {
  lang: 'en' | 'zh'
  innerRef: Ref<HTMLElement>
}) {
  const data = WORKS[lang]
  const sections = data.sections
  const count = sections.length

  const [active, setActive] = useState<WorkListItem | null>(null)
  const [musicNeedsGesture, setMusicNeedsGesture] = useState(false)

  const galleryRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const unlockMusicRef = useRef<(() => void) | null>(null)

// =========================================================
// GALLERY BACKGROUND MUSIC — TAB SWITCH + FADE
// =========================================================
useEffect(() => {
  const gallery = galleryRef.current
  if (!gallery) return

  const audio = new Audio(
    `${import.meta.env.BASE_URL}hobbies/music/gallery-track.mp3`,
  )

  audio.loop = true
  audio.preload = 'none'
  audio.volume = 0

  let destroyed = false
  let galleryVisible = false
  let autoplayAttempted = false
  let manuallyPaused = false
  let resumeAfterTabSwitch = false

  let fadeFrame = 0
  let fadeStartedAt = 0
  let fadeStartVolume = 0
  let fadeTargetVolume = 0
  let lastVolumeTarget = -1

  const TARGET_VOLUME = 0.095
  const FADE_DURATION = 800

  // Make the 3D scene pulse with the music (reads audio.currentTime only).
  const stopReactive = startAudioReactive(
    audio,
    audio.src,
    () => audio.volume / TARGET_VOLUME,
  )

  const cancelFade = () => {
    if (fadeFrame) {
      cancelAnimationFrame(fadeFrame)
      fadeFrame = 0
    }
  }

  // Calculate the desired volume from gallery visibility.
  const getDesiredVolume = () => {
    const rect = gallery.getBoundingClientRect()
    const viewportHeight = window.innerHeight

    if (rect.top >= viewportHeight || rect.bottom <= 0) {
      return 0
    }

    const fadeDistance = Math.max(240, viewportHeight * 0.6)

    const entering = Math.max(
      0,
      Math.min(1, (viewportHeight - rect.top) / fadeDistance),
    )

    const leaving = Math.max(
      0,
      Math.min(1, rect.bottom / fadeDistance),
    )

    return Math.min(entering, leaving) * TARGET_VOLUME
  }

  const fadeTo = (target: number) => {
    if (destroyed) return

    target = Math.max(0, Math.min(TARGET_VOLUME, target))

    if (
      Math.abs(target - lastVolumeTarget) < 0.004 &&
      (fadeFrame !== 0 || Math.abs(audio.volume - target) < 0.004)
    ) {
      return
    }

    lastVolumeTarget = target
    cancelFade()

    fadeStartVolume = audio.volume
    fadeTargetVolume = target
    fadeStartedAt = performance.now()

    const animate = (now: number) => {
      if (destroyed) return

      const progress = Math.min(
        1,
        (now - fadeStartedAt) / FADE_DURATION,
      )

      const eased = progress * progress * (3 - 2 * progress)

      audio.volume =
        fadeStartVolume +
        (fadeTargetVolume - fadeStartVolume) * eased

      if (progress < 1) {
        fadeFrame = requestAnimationFrame(animate)
      } else {
        audio.volume = fadeTargetVolume
        fadeFrame = 0

        if (fadeTargetVolume === 0 && !galleryVisible) {
          audio.pause()
        }
      }
    }

    fadeFrame = requestAnimationFrame(animate)
  }

  const updateGalleryVisibility = () => {
    if (destroyed) return

    const rect = gallery.getBoundingClientRect()

    galleryVisible =
      rect.top < window.innerHeight && rect.bottom > 0

    if (!galleryVisible) {
      setMusicNeedsGesture(false)
      autoplayAttempted = false
      fadeTo(0)
      return
    }

    // Never restart music after a manual pause.
    if (manuallyPaused) {
      setMusicNeedsGesture(false)
      return
    }

    // Do not start playback while this browser tab is hidden.
    if (document.hidden) return

    if (audio.paused) {
      setMusicNeedsGesture(true)

      if (!autoplayAttempted) {
        autoplayAttempted = true

        void audio.play()
          .then(() => {
            if (destroyed || document.hidden || manuallyPaused) {
              audio.pause()
              return
            }

            setMusicNeedsGesture(false)
            fadeTo(getDesiredVolume())
          })
          .catch((error: unknown) => {
            if (destroyed) return

            console.info('Gallery autoplay was blocked:', error)
            setMusicNeedsGesture(true)
          })
      }

      return
    }

    setMusicNeedsGesture(false)
    fadeTo(getDesiredVolume())
  }

  // Explicit user action to enable or resume music.
  const unlockMusic = () => {
    if (destroyed || document.hidden) return

    const rect = gallery.getBoundingClientRect()

    galleryVisible =
      rect.top < window.innerHeight && rect.bottom > 0

    if (!galleryVisible) return

    manuallyPaused = false
    autoplayAttempted = true

    cancelFade()
    audio.volume = 0
    lastVolumeTarget = -1

    void audio.play()
      .then(() => {
        if (destroyed || document.hidden || manuallyPaused) {
          audio.pause()
          return
        }

        setMusicNeedsGesture(false)
        fadeTo(getDesiredVolume())
      })
      .catch((error: unknown) => {
        if (destroyed) return

        console.info('Manual gallery playback failed:', error)
        setMusicNeedsGesture(true)
      })
  }

  // Retry blocked autoplay after genuine user interaction.
  const onUserInteraction = () => {
    if (
      destroyed ||
      document.hidden ||
      !galleryVisible ||
      !audio.paused ||
      manuallyPaused
    ) {
      return
    }

    autoplayAttempted = true

    void audio.play()
      .then(() => {
        if (destroyed || document.hidden || manuallyPaused) {
          audio.pause()
          return
        }

        setMusicNeedsGesture(false)
        fadeTo(getDesiredVolume())
      })
      .catch(() => {
        if (!destroyed && galleryVisible && !manuallyPaused) {
          setMusicNeedsGesture(true)
        }
      })
  }

  // Pause when leaving the tab, resume only if it was playing.
  const handleVisibilityChange = () => {
    if (document.hidden) {
      resumeAfterTabSwitch = !audio.paused && !manuallyPaused

      cancelFade()
      audio.pause()
      return
    }

    if (resumeAfterTabSwitch && galleryVisible && !manuallyPaused) {
      resumeAfterTabSwitch = false

      void audio.play()
        .then(() => {
          if (destroyed || document.hidden || manuallyPaused) {
            audio.pause()
            return
          }

          fadeTo(getDesiredVolume())
        })
        .catch((error: unknown) => {
          if (!destroyed && galleryVisible && !manuallyPaused) {
            console.info('Could not resume gallery music:', error)
            setMusicNeedsGesture(true)
          }
        })
    }
  }

  const observer = new IntersectionObserver(
    updateGalleryVisibility,
    { threshold: 0 },
  )

  window.addEventListener('scroll', updateGalleryVisibility, {
    passive: true,
  })

  window.addEventListener('resize', updateGalleryVisibility)

  document.addEventListener('pointerdown', onUserInteraction, {
    passive: true,
  })

  document.addEventListener('keydown', onUserInteraction)

  document.addEventListener(
    'visibilitychange',
    handleVisibilityChange,
  )

  observer.observe(gallery)

  unlockMusicRef.current = unlockMusic

  updateGalleryVisibility()

  return () => {
    destroyed = true
    unlockMusicRef.current = null
    stopReactive()

    observer.disconnect()

    window.removeEventListener('scroll', updateGalleryVisibility)
    window.removeEventListener('resize', updateGalleryVisibility)

    document.removeEventListener('pointerdown', onUserInteraction)
    document.removeEventListener('keydown', onUserInteraction)

    document.removeEventListener(
      'visibilitychange',
      handleVisibilityChange,
    )

    cancelFade()

    audio.pause()
    audio.removeAttribute('src')
    audio.load()
  }
}, [])

  // =========================================================
  // HORIZONTAL GALLERY SCROLL
  // =========================================================
  const { scrollYProgress } = useScroll({
    target: galleryRef,
    offset: ['start start', 'end end'],
  })

  const [scrollRange, setScrollRange] = useState(0)

  useEffect(() => {
    const element = trackRef.current
    if (!element) return

    const measure = () => {
      const viewportWidth =
        document.documentElement.clientWidth

      setScrollRange(
        Math.max(0, element.scrollWidth - viewportWidth),
      )
    }

    measure()

    const resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(element)

    window.addEventListener('resize', measure)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [count, lang])

  const x = useTransform(
    scrollYProgress,
    [0, 1],
    [0, -scrollRange],
  )

  // the progress line is gone by the time the closing screen is reached
  const progressOpacity = useTransform(scrollYProgress, [0.86, 0.95], [1, 0])

  const hintOpacity = useTransform(
    scrollYProgress,
    [0.85, 1],
    [1, 0],
  )

  // =========================================================
  // WORK DETAIL MODAL
  // =========================================================
  useEffect(() => {
    if (!active) return

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActive(null)
      }
    }

    window.addEventListener('keydown', onKey)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [active])

    // =========================================================
  // RENDER
  // =========================================================
  return (
    <section
      className="works"
      lang={lang}
      ref={innerRef}
    >
      <div
        className="wk-gallery"
        ref={galleryRef}
        style={{
          height: `calc(100vh + ${scrollRange}px)`,
        }}
      >
        <div className="wk-gallery-sticky">
          {/* Gallery heading */}
          <motion.span
            className="wk-gallery-title"
            style={{
              opacity: useTransform(
                scrollYProgress,
                [0.7, 0.9],
                [1, 0],
              ),
            }}
          >
            {data.title}
          </motion.span>

          {/* Horizontal scrolling gallery */}
          <motion.div
            className="wk-track"
            ref={trackRef}
            style={{ x }}
          >
            <GalleryIntro text={data.intro} x={x} />

            {sections.map((section) => (
              <SectionCard
                key={section.id}
                section={section}
                data={data}
                onOpen={setActive}
              />
            ))}

            {/* Final quote panel — keep it inside the track */}
            <QuoteCard />
          </motion.div>

          {/* Scroll progress indicator */}
          <motion.div
            className="wk-progress"
            style={{ opacity: progressOpacity }}
            aria-hidden="true"
          >
            <motion.div
              className="wk-progress-fill"
              style={{ scaleX: scrollYProgress }}
            />
          </motion.div>

          {/* Scroll hint */}
          <motion.span
            className="wk-hint"
            style={{ opacity: hintOpacity }}
            aria-hidden="true"
          >
            {data.hint}
          </motion.span>
        </div>
      </div>

      {/* Music button */}
      {musicNeedsGesture && (
        <button
          type="button"
          onClick={() => {
            unlockMusicRef.current?.()
          }}
          aria-label="Enable gallery background music"
          style={{
            position: 'fixed',
            left: '24px',
            bottom: '28px',
            zIndex: 99999,

            display: 'flex',
            alignItems: 'center',
            gap: '10px',

            padding: '12px 18px',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '4px',

            background: 'rgba(255, 255, 255, 0.06)',
            color: 'rgba(255, 255, 255, 0.9)',

            fontFamily: 'inherit',
            fontSize: '11px',
            fontWeight: 500,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',

            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',

            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.05)',
            transition:
              'background 0.25s ease, border-color 0.25s ease',
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.background =
              'rgba(255, 255, 255, 0.12)'

            event.currentTarget.style.borderColor =
              'rgba(255, 255, 255, 0.55)'
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.background =
              'rgba(255, 255, 255, 0.06)'

            event.currentTarget.style.borderColor =
              'rgba(255, 255, 255, 0.3)'
          }}
        >
          <span aria-hidden="true">♫</span>
          <span>Enable Music</span>
        </button>
      )}

      {/* Work details modal */}
      <AnimatePresence>
        {active && (
          <WorkDetail
            key={active.slug || active.name}
            item={active}
            data={data}
            onClose={() => setActive(null)}
          />
        )}
      </AnimatePresence>
    </section>
  )
}
