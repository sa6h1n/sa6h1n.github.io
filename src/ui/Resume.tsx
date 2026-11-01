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
      period: 'MY BIGGEST DREAM',
      place: 'I want to see 100 countries before I turn 50',
      points: [
        'I want to visit {{100 countries}} before I turn 50. I love the idea of seeing mountains I’ve never seen, getting lost in streets I don’t know, and coming back home with a lot of stories.',
        '“When I’m far from home, don’t call me on the phone to tell me you’re alone.” — Eye Without a Face, Billy Idol',
      ],
    },
    {
      period: 'WHERE I CLEAR MY HEAD',
      place: 'I’m happiest up in the mountains',
      points: [
        'I feel most like myself with a trail ahead of me, fresh air and {{a view worth the climb}}. Honestly, some of my best memories are from the times I got pushed out of my comfort zone.',
        'I’ve noticed the best views always come after the hardest climbs, so I’m going to keep climbing, a little higher each time.',
      ],
    },
    {
      period: 'WHAT I’M LISTENING TO',
      place: 'I always have music on',
      points: [
        'I have songs that take me straight back to a moment in time, and others that make a normal drive feel like {{a scene from a movie}}. Sometimes a song says what I can’t.',
        'I keep going back to my old favourites, but I’m always hunting for something new to put on repeat.',
      ],
    },
    {
      period: 'I’M TRYING TO STAY CONSISTENT',
      place: 'I train so I can keep going',
      points: [
        'I {{train every day}}, even when I don’t feel like it. I want to be able to go on adventures for as long as I can.',
        'I don’t just want to live longer. I want to stay strong enough to do the things I love, right up until my last adventure.',
      ],
    },
    {
      period: 'WHEN IT’S JUST ME',
      place: 'I like being on my own',
      points: [
        'I honestly enjoy my own company. I recharge with a solo walk, a quiet place, some music and getting lost in my thoughts.',
        'I’ve learned that {{being alone isn’t the same as being lonely}}. Sometimes my own company is the best company.',
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