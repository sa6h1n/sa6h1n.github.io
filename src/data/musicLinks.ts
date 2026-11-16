// Everything on the "My Music" page. To add a button, add one object here.
//
// Cover pictures: nothing to set here. Drop the picture into
//     src/assets/music/playlists/   (for the Playlists row)
//     src/assets/music/albums/      (for the Albums row)
// and name it after the button's `id`  — e.g.  albums/utopia.jpg  for the id 'utopia'.
// (See src/music/covers.ts for mosaics.) A button with no picture shows a generated record cover,
// coloured by `hue`.

export interface MusicLink {
  /** also the file name of its cover picture (without the extension) */
  id: string
  title: string
  /** small line under the title */
  subtitle: string
  kind: 'Playlist' | 'Album' | 'Artist'
  url: string
  /** colour (0–360) of the generated cover, used when there is no picture */
  hue: number
}

export const PLAYLISTS: MusicLink[] = [
  {
    id: 'hot-stuff',
    title: 'Hot Stuff',
    subtitle: 'My playlist',
    kind: 'Playlist',
    url: 'https://music.apple.com/in/playlist/hot-stuff/pl.u-mJy8gErtNmd8NE7',
    hue: 215,
  },
  {
    id: 'mac-demarco',
    title: 'Mac DeMarco',
    subtitle: 'Playlist',
    kind: 'Playlist',
    url: 'https://music.apple.com/in/playlist/mac-demarco/pl.u-9N9LXPLt1MJR1Gq',
    hue: 200,
  },
  {
    id: 'radiohead',
    title: 'Radiohead',
    subtitle: 'Playlist',
    kind: 'Playlist',
    url: 'https://music.apple.com/in/playlist/radiohead/pl.u-38oWXBgTYl4RY6p',
    hue: 10,
  },
]

export const ALBUMS: MusicLink[] = [
  {
    id: 'cigarettes-after-sex',
    title: 'Cigarettes After Sex',
    subtitle: 'Cigarettes After Sex',
    kind: 'Album',
    url: 'https://music.apple.com/in/album/cigarettes-after-sex/1217977525',
    hue: 208,
  },
  {
    id: 'withered',
    title: 'WITHERED',
    subtitle: 'd4vd',
    kind: 'Artist',
    url: 'https://music.apple.com/in/artist/d4vd/1599361691',
    hue: 348,
  },
  {
    id: 'utopia',
    title: 'UTOPIA',
    subtitle: 'Travis Scott',
    kind: 'Album',
    url: 'https://music.apple.com/in/album/utopia/1699712635',
    hue: 24,
  },
  {
    id: 'american-dream',
    title: 'American Dream',
    subtitle: '21 Savage',
    kind: 'Album',
    url: 'https://music.apple.com/in/album/american-dream/1724494274',
    hue: 262,
  },
]
