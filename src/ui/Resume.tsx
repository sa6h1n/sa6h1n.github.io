import { motion } from 'framer-motion'
import { ZooopLogo } from './ZooopLogo'
import { SOCIAL_ICONS } from './SocialIcons'
import { FOCUS_POINTS } from '../data/focusPoints'
import { useState, type ReactNode } from 'react'

// Resume data
interface ResumeGroup {
  heading?: string
  logo?: string
  logoImg?: string
  sub?: string
  link?: string
  items?: string[]
  links?: { id: string; label: string; href: string }[]
}

interface ResumeEntry {
  period: string
  place: string
  role?: string
  logo?: { src: string; alt: string }
  points?: string[]
  groups?: ResumeGroup[]
}

const RESUME = {
  title: 'A Little About Me',
  entries: [
    {
      period: 'TRAVELLING',
      place: '100 Countries Before 50',
      points: [
        'My dream is to explore {{100 countries}} before I turn 50. Chasing mountain views, discovering new cultures, getting lost in unfamiliar streets, and collecting stories along the way.',
        '“When I’m far from home, don’t call me on the phone to tell me you’re alone.” — Eye Without a Face, Billy Idol',
      ],
    },
    {
      period: 'OUTDOORS',
      place: 'Made for the Mountains',
      points: [
        'Give me a mountain trail, fresh air, and {{a view worth the climb}}. Some of my favourite moments are the ones that take me outside my comfort zone.',
        'The best views come after the hardest climbs. Here’s to more trails, higher peaks, and adventures that make the journey worthwhile.',
      ],
    },
    {
      period: 'ON REPEAT',
      place: 'Life in Stereo',
      points: [
        'Some songs take me back in time; others make an ordinary drive feel like {{a movie scene}}. Sometimes, music says what words never could.',
        'From old favourites to songs I’ve just discovered, there’s always something playing in the background of my life.',
      ],
    },
    {
      period: 'TRYING TO STAY CONSISTENT',
      place: 'Strong Enough for the Journey',
      points: [
        'I stay active and {{train every day}}. Training today so I can chase adventures until my last breath.',
        'The goal isn’t just to live longer, but to stay strong enough to do the things I love — right up until my last adventure.',
      ],
    },
    {
      period: 'MY OWN COMPANY',
      place: 'The Art of Being Alone',
      points: [
        'I genuinely enjoy spending time by myself. Solo walks, quiet places, music, and getting lost in my thoughts help me recharge.',
        'I’ve learned that {{being alone isn’t the same as being lonely}}. Sometimes, the best company is your own.',
      ],
    },
  ] satisfies ResumeEntry[],
}

// IMPORTANT:
// Resume entries correspond to focus anchors in the 3D model.
// Keep the entry order unchanged to preserve camera focus-point mapping.
const POINT_ORDER = FOCUS_POINTS

const EASE = [0.22, 1, 0.36, 1] as const

/** `{{phrase}}` in the copy becomes an underlined highlight that draws itself in. */
function renderCopy(text: string): ReactNode[] {
  return text.split(/(\{\{.*?\}\})/g).map((part, i) =>
    part.startsWith('{{') ? (
      <mark key={i} className="tl-hl">
        {part.slice(2, -2)}
      </mark>
    ) : (
      part
    ),
  )
}

const containerV = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.04,
    },
  },
}

const itemV = {
  hidden: { opacity: 0, y: 26 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.75,
      ease: EASE,
    },
  },
}

function Group({ group }: { group: ResumeGroup }) {
  const heading =
    group.logo === 'zooop' ? (
      <a
        className="zooop-logo-link"
        href={group.link}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="ZOOOP"
      >
        <ZooopLogo className="zooop-logo" animated />
      </a>
    ) : group.link ? (
      <a
        className="about-link"
        href={group.link}
        target="_blank"
        rel="noopener noreferrer"
      >
        {group.heading}
      </a>
    ) : (
      <span>{group.heading}</span>
    )

  return (
    <motion.div className="tl-group" variants={itemV}>
      <div className="tl-group-head">
        {group.logoImg && (
          <span className="tl-group-logo">
            <img
              src={group.logoImg}
              alt={group.heading || ''}
              loading="lazy"
            />
          </span>
        )}

        {heading}

        {group.sub && (
          <span className="tl-group-sub">{group.sub}</span>
        )}
      </div>

      {group.items && (
        <ul className="tl-points">
          {group.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      )}

      {group.links && (
        <div className="tl-logos">
          {group.links.map((l) => {
            const Icon =
              SOCIAL_ICONS[l.id as keyof typeof SOCIAL_ICONS]

            return (
              <a
                key={l.id}
                className="tl-logo"
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={l.label}
                title={l.label}
              >
                <Icon />
              </a>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}

function Entry({
  entry,
  index,
}: {
  entry: ResumeEntry
  index: number
}) {
  const [seen, setSeen] = useState(false)
  return (
    <motion.div
      className={`tl-entry${seen ? ' is-in' : ''}`}
      onViewportEnter={() => setSeen(true)}
      data-point={POINT_ORDER[index]}
      variants={containerV}
      initial="hidden"
      whileInView="show"
      viewport={{
        once: true,
        margin: '-12% 0px -12% 0px',
      }}
    >
      <motion.span
        className="tl-dot"
        variants={itemV}
        aria-hidden="true"
      />

      <div className="tl-body">
        <motion.div className="tl-period" variants={itemV}>
          {entry.period}
        </motion.div>

        <motion.div className="tl-head" variants={itemV}>
          {entry.logo && (
            <span className="tl-logo-chip">
              <img
                src={entry.logo.src}
                alt={entry.logo.alt}
                loading="lazy"
              />
            </span>
          )}

          <h3 className="tl-place">{entry.place}</h3>
        </motion.div>

        {entry.role && (
          <motion.div className="tl-role" variants={itemV}>
            {entry.role}
          </motion.div>
        )}

        {entry.points && (
          <motion.ul className="tl-points" variants={itemV}>
            {entry.points.map((p, i) => (
              <li key={i}>{renderCopy(p)}</li>
            ))}
          </motion.ul>
        )}

        {entry.groups &&
          entry.groups.map((g, i) => (
            <Group key={i} group={g} />
          ))}
      </div>
    </motion.div>
  )
}

export default function Resume() {
  const data = RESUME

  return (
    <section className="resume" lang="en">
      <motion.h2
        className="resume-title"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{
          once: true,
          margin: '-10% 0px',
        }}
        transition={{
          duration: 0.7,
          ease: EASE,
        }}
      >
        {data.title}
      </motion.h2>

      <div className="timeline">
        {data.entries.map((e, i) => (
          <Entry key={i} entry={e} index={i} />
        ))}
      </div>
    </section>
  )
}