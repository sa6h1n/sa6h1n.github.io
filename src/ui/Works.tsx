import { useEffect, useRef, useState, type Ref } from 'react'
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
   useInView,
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
            <figure className="wk-photo" key={src}>
              <img
                src={src}
                alt={`${section.title} photo ${index + 1}`}
                loading="lazy"
              />

              <figcaption>
                {String(index + 1).padStart(2, '0')}
              </figcaption>
            </figure>
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

function QuoteCard() {
  const quoteRef = useRef<HTMLDivElement>(null)

  const isInView = useInView(quoteRef, {
    amount: 0.15,
    once: true,
  })

  const words = ['Be', 'the', 'world', 'you', 'want', 'to', 'have']

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
// GALLERY BACKGROUND MUSIC — SAFARI + FADE FIX
// =========================================================
useEffect(() => {
  const gallery = galleryRef.current
  if (!gallery) return

  const audio = new Audio(
    `${import.meta.env.BASE_URL}hobbies/music/gallery-track.mp3`,
  )

 audio.loop = true
audio.preload = 'auto'
audio.volume = 0
audio.muted = false

  let destroyed = false
  let galleryVisible = false
  let autoplayAttempted = false
  let fadeFrame = 0
  let fadeStartedAt = 0
  let fadeStartVolume = 0
  let fadeTargetVolume = 0
  let lastVolumeTarget = -1

  const TARGET_VOLUME = 0.095
  const FADE_DURATION = 800

  const cancelFade = () => {
    if (fadeFrame) {
      cancelAnimationFrame(fadeFrame)
      fadeFrame = 0
    }
  }

  // Calculate how much of the gallery is entering or leaving
  // the viewport. This controls the music volume.
  const getDesiredVolume = () => {
    const rect = gallery.getBoundingClientRect()
    const viewportHeight = window.innerHeight

    if (
      rect.top >= viewportHeight ||
      rect.bottom <= 0
    ) {
      return 0
    }

    const fadeDistance = Math.max(
      240,
      viewportHeight * 0.6,
    )

    const entering = Math.max(
      0,
      Math.min(
        1,
        (viewportHeight - rect.top) / fadeDistance,
      ),
    )

    const leaving = Math.max(
      0,
      Math.min(
        1,
        rect.bottom / fadeDistance,
      ),
    )

   return Math.max(
  0,
  Math.min(entering, leaving) * TARGET_VOLUME,
)
  }

  const fadeTo = (target: number) => {
    if (destroyed) return

    target = Math.max(
      0,
      Math.min(TARGET_VOLUME, target),
    )

    // Avoid restarting the same fade on every scroll event.
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

      const eased =
        progress * progress * (3 - 2 * progress)

      audio.volume =
        fadeStartVolume +
        (fadeTargetVolume - fadeStartVolume) * eased

      if (progress < 1) {
        fadeFrame = requestAnimationFrame(animate)
      } else {
        audio.volume = fadeTargetVolume
        fadeFrame = 0

        if (
          fadeTargetVolume === 0 &&
          !galleryVisible
        ) {
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
      rect.top < window.innerHeight &&
      rect.bottom > 0

   if (!galleryVisible) {
  setMusicNeedsGesture(false)

  // Allow autoplay to be attempted again on re-entry.
  autoplayAttempted = false

  fadeTo(0)
  return
}

    if (audio.paused) {
      // Show the manual button while music is unavailable.
      setMusicNeedsGesture(true)

      // Only one automatic attempt per page load.
      if (!autoplayAttempted) {
        autoplayAttempted = true

        void audio.play()
          .then(() => {
            if (destroyed) {
              audio.pause()
              return
            }

            setMusicNeedsGesture(false)
            fadeTo(getDesiredVolume())
          })
          .catch((error: unknown) => {
            if (destroyed) return

            console.info(
              'Gallery autoplay was blocked:',
              error,
            )

            setMusicNeedsGesture(true)
          })
      }

      return
    }

    setMusicNeedsGesture(false)
    fadeTo(getDesiredVolume())
  }

  // Called directly from the music button's click event.
 const unlockMusic = () => {
  if (destroyed) return

  const rect = gallery.getBoundingClientRect()

  galleryVisible =
    rect.top < window.innerHeight &&
    rect.bottom > 0

  if (!galleryVisible) return

  autoplayAttempted = true

  cancelFade()

  audio.volume = 0
  lastVolumeTarget = -1

  // Call play immediately inside the user's click interaction.
  const playPromise = audio.play()

  void playPromise
    .then(() => {
      if (destroyed) {
        audio.pause()
        return
      }

      setMusicNeedsGesture(false)

      // Start fading in after playback begins.
      fadeTo(getDesiredVolume())
    })
    .catch((error: unknown) => {
      if (destroyed) return

      console.info('Manual gallery playback failed:', error)
      setMusicNeedsGesture(true)
    })
}

  // Retry a blocked autoplay only after genuine user interaction.
  const onUserInteraction = () => {
    if (
      destroyed ||
      !galleryVisible ||
      !audio.paused
    ) {
      return
    }

    // This event can provide Safari's user activation.
    // The button remains available if playback is still blocked.
    autoplayAttempted = true

    void audio.play()
      .then(() => {
        if (destroyed) {
          audio.pause()
          return
        }

        setMusicNeedsGesture(false)
        fadeTo(getDesiredVolume())
      })
      .catch(() => {
        if (!destroyed && galleryVisible) {
          setMusicNeedsGesture(true)
        }
      })
  }

  const observer = new IntersectionObserver(
    updateGalleryVisibility,
    { threshold: 0 },
  )

  window.addEventListener(
    'scroll',
    updateGalleryVisibility,
    { passive: true },
  )

  window.addEventListener(
    'resize',
    updateGalleryVisibility,
  )

  // These events may allow Safari to start playback after
  // the visitor has interacted with the website.
  document.addEventListener(
    'pointerdown',
    onUserInteraction,
    { passive: true },
  )

  document.addEventListener(
    'keydown',
    onUserInteraction,
  )

  observer.observe(gallery)

  unlockMusicRef.current = unlockMusic

  updateGalleryVisibility()

  return () => {
    destroyed = true
    unlockMusicRef.current = null

    observer.disconnect()

    window.removeEventListener(
      'scroll',
      updateGalleryVisibility,
    )

    window.removeEventListener(
      'resize',
      updateGalleryVisibility,
    )

    document.removeEventListener(
      'pointerdown',
      onUserInteraction,
    )

    document.removeEventListener(
      'keydown',
      onUserInteraction,
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
          <div
            className="wk-progress"
            aria-hidden="true"
          >
            <motion.div
              className="wk-progress-fill"
              style={{ scaleX: scrollYProgress }}
            />
          </div>

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
