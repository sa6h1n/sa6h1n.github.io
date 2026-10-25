// Personal Gallery data (bilingual).
// Section and work changes should be made in this file.

export interface WorkListItem {
  name: string
  meta?: string
  tags?: string[]
  link?: string
  slug?: string
}

export interface WorkGroup {
  heading: string
  items: string[]
}

export interface WorkSection {
  id: string
  no: string
  title: string
  tagline: string
  items?: WorkListItem[]
  groups?: WorkGroup[]
  awards?: string[]
  footer?: string
  galleryImages?: string[]
}

export interface WorksLang {
  title: string
  closeLabel: string
  openLabel: string
  hint: string
  awardsLabel: string
  visitLabel: string
  detailPlaceholder: string
  phImageLabel: string
  phButtonLabel: string
  countLabel: (n: number) => string
  sections: WorkSection[]
}
const sections: WorkSection[] = [
  {
    id: 'ad',
    no: '',
    title: 'CitySide',
    tagline: 'CONCRETE JUNGLES & CITY LIGHTS',
    galleryImages: Array.from(
      { length: 6 },
      (_, i) =>
        `${import.meta.env.BASE_URL}hobbies/hillside/${String(i + 1).padStart(2, '0')}.webp`
    ),
  },
  {
    id: 'maker',
    no: '',
    title: 'After Hours',
    tagline: 'SOUNDTRACK TO MY LIFE',
    galleryImages: Array.from(
      { length: 6 },
      (_, i) =>
        `${import.meta.env.BASE_URL}hobbies/music/${String(i + 1).padStart(2, '0')}.webp`
    ),
  },
  {
    id: 'product',
    no: '',
    title: 'Southbound',
    tagline: 'A LITTLE PIECE OF HOME',
    galleryImages: Array.from(
      { length: 6 },
      (_, i) =>
        `${import.meta.env.BASE_URL}hobbies/south-side/${String(i + 1).padStart(2, '0')}.webp`
    ),
  },
  {
    id: 'graphics',
    no: '',
    title: 'Off the Grid',
    tagline: 'CHASING PEAKS & QUIET MOMENTS',
    galleryImages: Array.from(
      { length: 6 },
      (_, i) =>
        `${import.meta.env.BASE_URL}hobbies/lens/${String(i + 1).padStart(2, '0')}.webp`
    ),
  },
]

export const WORKS: Record<'zh' | 'en', WorksLang> = {
  zh: {
    title: 'Personal Gallery',
    closeLabel: 'Back',
    openLabel: 'Explore',
    hint: 'Keep scrolling',
    awardsLabel: '',
    visitLabel: 'Visit site',
    detailPlaceholder: '',
    phImageLabel: 'Photo',
    phButtonLabel: '',
    countLabel: (n) => `${n} photos`,
    sections,
  },

  en: {
    title: 'Personal Gallery',
    closeLabel: 'Back',
    openLabel: 'Explore',
    hint: 'Keep scrolling',
    awardsLabel: '',
    visitLabel: 'Visit site',
    detailPlaceholder: '',
    phImageLabel: 'Photo',
    phButtonLabel: '',
    countLabel: (n) => `${n} photos`,
    sections,
  },
}

// Section cover images.
export const SECTION_COVERS: Record<string, string> = {
  ad: `${import.meta.env.BASE_URL}works/covers/ad.webp`,
  maker: `${import.meta.env.BASE_URL}works/covers/maker.webp`,
  product: `${import.meta.env.BASE_URL}works/covers/product.webp`,
  graphics: `${import.meta.env.BASE_URL}works/covers/graphics.webp`,
}

// Count works in a section.
export function sectionCount(section: WorkSection): number {
  if (section.items) return section.items.length

  if (section.groups) {
    return section.groups.reduce(
      (count, group) => count + group.items.length,
      0
    )
  }

  return 0
}
