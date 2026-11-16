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

import { FADE_AWAY_MS, getPreviewId, stopPreview, usePreviewId } from '../audio/preview'
import { coverage } from '../audio/ambientLevel'
import { useInputMode } from '../audio/inputMode'
import QuoteReel from './QuoteReel'
import { useQuoteReveal } from './useQuoteReel'
import PhotoFigure, { type ReadyTrack } from './PhotoFigure'
import { INSTAGRAM_URL } from '../data/socials'
import { openMusicPage } from '../music/nav'
import { preloadMusic } from '../music/lazy'
import { useDepth } from './useDepth'

const EASE = [0.22, 1, 0.36, 1] as const
const HEAD_LAG = 72 // px a card's title trails behind its photos by the time the card has passed

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

// Fetch + decode every gallery photo shortly after the page is idle, so scrolling into the gallery
// never has to wait for a download or a decode (that wait showed up as a stutter on slower laptops).
const warmed: HTMLImageElement[] = []
function warmGalleryImages(urls: string[]): () => void {
  let cancelled = false
  const timers: number[] = []
  const start = () => {
    urls.forEach((url, i) => {
      timers.push(
        window.setTimeout(() => {
          if (cancelled) return
          const img = new Image()
          img.decoding = 'async'
          img.src = url
          warmed.push(img) // keep a reference so the decoded picture stays around
          img.decode().catch(() => undefined)
        }, i * 140),
      )
    })
  }
  const w = window as unknown as {
    requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number
    cancelIdleCallback?: (h: number) => void
  }
  const idle = w.requestIdleCallback
    ? w.requestIdleCallback(start, { timeout: 5000 })
    : window.setTimeout(start, 2500)
  return () => {
    cancelled = true
    timers.forEach((t) => window.clearTimeout(t))
    if (w.cancelIdleCallback) w.cancelIdleCallback(idle)
    else window.clearTimeout(idle)
  }
}

// True while the viewport matches the query (used to switch the gallery to its phone layout).
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  )

  useEffect(() => {
    const mq = window.matchMedia(query)
    const update = () => setMatches(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [query])

  return matches
}

// Which of a section's songs actually exist in public/hobbies/music/ (so photos without a file stay plain).
function useReadyTracks(section: WorkSection): (ReadyTrack | null)[] {
  const [ready, setReady] = useState<(ReadyTrack | null)[]>([])

  useEffect(() => {
    const tracks = section.tracks
    if (!tracks || tracks.length === 0) return

    let dead = false

    Promise.all(
      tracks.map(async (track, index): Promise<ReadyTrack | null> => {
        if (!track) return null

        const src = `${import.meta.env.BASE_URL}hobbies/music/${track.file}`

        // a dev server answers missing files with the index page, so check the type too
        const exists = await fetch(src, { method: 'HEAD' })
          .then((res) => res.ok && !(res.headers.get('content-type') || '').includes('text/html'))
          .catch(() => false)

        // In production a photo without a song file stays a plain photo.
        // While developing we still show the music UI so you can see it.
        if (!exists && !import.meta.env.DEV) return null

        return {
          id: `${section.id}-${index}`,
          src,
          file: track.file,
          missing: !exists,
          title: track.title,
          artist: track.artist,
          start: track.start,
        }
      }),
    ).then((list) => {
      if (!dead) setReady(list)
    })

    return () => {
      dead = true
    }
  }, [section])

  return ready
}

// A full-height gallery section card.
function SectionCard({
  section,
  data,
  onOpen,
  trackX,
  vertical,
}: {
  section: WorkSection
  data: WorksLang
  onOpen: (item: WorkListItem) => void
  trackX: MotionValue<number>
  vertical: boolean
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()

  const tracks = useReadyTracks(section)
  const hasMusic = tracks.some(Boolean)

  // The title lags a little behind the photos, which adds a layer of depth.
  // It only ever lags BEHIND (offset ≥ 0, to the right): it starts exactly in place while the card is
  // still off-screen and drifts right as the card passes. Pulling it to the left (as before) made the
  // title poke out of its card — the first letter showed on the previous page and the title crossed
  // the divider line.
  // (on phones the title doesn't lag, so the depth tracking is switched off there)
  const depth = useDepth(cardRef, trackX, vertical, Boolean(reduce) || vertical)
  const headX = useTransform(depth, (v) =>
    vertical ? 0 : HEAD_LAG * Math.min(1, Math.max(0, (1.4 - v) / 2.8)),
  )

  // A short message the first time the music section is on screen.
  const seen = useInView(cardRef, { amount: vertical ? 0.3 : 0.55, once: true })
  const previewId = usePreviewId()
  const [hint, setHint] = useState(false)

  useEffect(() => {
    if (!hasMusic || !seen) return

    setHint(true)
    const t = window.setTimeout(() => setHint(false), 5200)

    return () => window.clearTimeout(t)
  }, [hasMusic, seen])

  // Scrolling away from the music page: a song that is still playing fades away (the visitor did not
  // pause it) and the background music comes back. While the page is on screen it keeps playing.
  useEffect(() => {
    const el = cardRef.current
    if (!el || !hasMusic) return

    let raf = 0
    const check = () => {
      raf = 0
      const id = getPreviewId()
      if (!id || !id.startsWith(`${section.id}-`)) return
      if (coverage(el.getBoundingClientRect(), window.innerWidth, window.innerHeight) < 0.12) {
        stopPreview(id, FADE_AWAY_MS)
      }
    }
    const onMove = () => {
      if (!raf) raf = requestAnimationFrame(check)
    }

    window.addEventListener('scroll', onMove, { passive: true })
    window.addEventListener('resize', onMove)
    return () => {
      window.removeEventListener('scroll', onMove)
      window.removeEventListener('resize', onMove)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [hasMusic, section.id])

  // Laptop (mouse): hover plays a song. Phone (finger): tap plays it. Updates live.
  const inputMode = useInputMode()

  // the message sits over the first cover that has a song
  const hintIndex = tracks.findIndex(Boolean)
  const hintText = hint && previewId === null
    ? inputMode === 'mouse' ? 'Hover to play' : 'Tap to play'
    : null

  return (
    <div className="wk-card" ref={cardRef} data-music={hasMusic ? 'true' : undefined}>
      <motion.div className="wk-card-head" style={{ x: headX }}>
        <span className="wk-card-no">{section.no}</span>

        <h3 className="wk-card-title">{section.title}</h3>

        <span className="wk-card-tagline">
          {section.tagline}
        </span>
      </motion.div>

      <SectionWorks
        section={section}
        data={data}
        onOpen={onOpen}
        tracks={tracks}
        hintIndex={hintIndex}
        hintText={hintText}
      />
    </div>
  )
}

// Render the contents of a gallery section.
function SectionWorks({
  section,
  data,
  onOpen,
  tracks,
  hintIndex,
  hintText,
}: {
  section: WorkSection
  data: WorksLang
  onOpen: (item: WorkListItem) => void
  tracks: (ReadyTrack | null)[]
  hintIndex: number
  hintText: string | null
}) {
  return (
    <div className={`wk-card-body${section.galleryImages ? ' is-photos' : ''}`}>
      {section.galleryImages ? (
        <div className="wk-photo-grid">
          {section.galleryImages.map((src, index) => (
            <PhotoFigure
              key={src}
              src={src}
              alt={`${section.title} — ${section.tagline.toLowerCase()}, photo ${index + 1} of ${section.galleryImages!.length}`}
              index={index}
              track={tracks[index] ?? null}
              hint={index === hintIndex ? hintText : null}
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
  // (no blur here: ~60 letters each re-blurring on every scroll frame was a big cost on Windows)
  return (
    <motion.span className="wk-intro-exit" style={{ x, y, rotate, opacity }}>
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
                        initial={reduce ? false : { opacity: 0, y: 46, rotate: tilt, scale: 0.7 }}
                        animate={seen || reduce ? { opacity: 1, y: 0, rotate: 0, scale: 1 } : undefined}
                        transition={{
                          default: { type: 'spring', stiffness: 150, damping: 12, mass: 0.7, delay },
                          opacity: { duration: 0.45, delay },
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
      {/* Top corners, in the same style as the first page's corner text: two plain links */}
      <motion.a
        className="corner-link corner-left"
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Instagram (opens in a new tab)"
        initial={{ opacity: 0 }}
        animate={{ opacity: isInView ? 1 : 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        Instagram <span className="corner-arrow" aria-hidden="true">↗</span>
      </motion.a>
      {/* top right: opens the "My Music" page (all my playlists and albums) in this tab, with a circle
          that grows out of this link. The href is still a real link, so ctrl/cmd-click, middle-click and
          "copy link" keep working (they open the page on its own). */}
      <motion.a
        className="corner-link corner-right"
        href={`${import.meta.env.BASE_URL}?page=music`}
        aria-label="My Music — playlists and albums"
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
          e.preventDefault()
          const r = e.currentTarget.getBoundingClientRect()
          openMusicPage({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
        }}
        onPointerEnter={preloadMusic}
        onFocus={preloadMusic}
        onTouchStart={preloadMusic}
        initial={{ opacity: 0 }}
        animate={{ opacity: isInView ? 1 : 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        My Music <span className="corner-arrow" aria-hidden="true">↗</span>
      </motion.a>

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
  const vertical = useMediaQuery('(max-width: 640px)')

  useEffect(
    () => warmGalleryImages(sections.flatMap((section) => section.galleryImages ?? [])),
    [sections],
  )

  const galleryRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  // (The background music now lives in src/audio/ambient.ts and is started from App.tsx.)

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
                trackX={x}
                vertical={vertical}
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
