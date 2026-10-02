// Fixed facts about the club, shared by the website pages.
export const CONTACT = {
  phone: '+52 984 143 6457',
  phoneHref: 'tel:+529841436457',
  email: 'hipicorivieramaya@gmail.com',
  instagram: 'https://www.instagram.com/hipicoriveramaya/',
  instagramHandle: '@hipicoriveramaya',
  facebook: 'https://www.facebook.com/hipicorivieramaya',
  address: 'Carretera Cancún–Chetumal km 273, int. Rancho San Francisco, 77735 Paamul, Q. Roo',
  hours: null, // opening hours as the club gives them (e.g. 'Martes a domingo, 7:00 a 18:00'); null hides the line
  mapQuery: 'Hípico Riviera Maya, Rancho San Francisco, Paamul, Quintana Roo',
}
export const mapEmbed = `https://www.google.com/maps?q=${encodeURIComponent(CONTACT.mapQuery)}&output=embed`
export const mapDirections = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(CONTACT.mapQuery)}`

// The four big portrait photos (3:4, 1600 px + an 800 px copy for phones). One list so they can be swapped
// in one place. Alt text describes the scene only: no names, ever. The share image uses the horse alone.
export const BIG = {
  hero: { src: '/img/club/horse-blaze.webp', small: '/img/club/horse-blaze-800.webp', w: 1600, h: 2133, position: '60% 35%' },
  closeup: { src: '/img/club/girl-horse-closeup.webp', small: '/img/club/girl-horse-closeup-800.webp', w: 1600, h: 2133, position: '45% 55%' },
  riding: { src: '/img/club/girl-riding-flamboyan.webp', small: '/img/club/girl-riding-flamboyan-800.webp', w: 1600, h: 2133, position: '50% 40%' },
  nose: { src: '/img/club/girl-horse-nose.webp', small: '/img/club/girl-horse-nose-800.webp', w: 1600, h: 2133, position: '50% 50%' },
}
// The hero's three scenes, in a loop: muted clips (≤ 2 MB, no sound) with a poster of the same name.
// Reduced motion and Save-Data get the poster only.
export const HERO_SCENES = [
  { key: 'jumps', video: '/video/hero-1-jump.mp4', poster: '/video/hero-1-jump.webp' },
  { key: 'horses', video: '/video/hero-2-face.mp4', poster: '/video/hero-2-face.webp' },
  { key: 'kids', video: '/video/hero-3-kids.mp4', poster: '/video/hero-3-kids.webp' },
]

// The clips outside the hero: Competencias (full width), Equinoterapia and Pensión (big splits).
export const CLIPS = {
  hooves: { video: '/video/hooves-sand.mp4', poster: '/video/hooves-sand.webp', w: 1280, h: 720 },
  grooming: { video: '/video/grooming.mp4', poster: '/video/grooming.webp', w: 1280, h: 700 },
  herd: { video: '/video/paddock-herd.mp4', poster: '/video/paddock-herd.webp', w: 1280, h: 720 },
}

// Clips that also play in the gallery's lightbox (the tiles show their poster and a small play mark).
export const GALLERY_CLIPS = [
  { name: 'clip-jump', video: '/video/hero-1-jump.mp4', src: '/video/hero-1-jump.webp', w: 1280, h: 700, alt: 'jumpClip' },
  { name: 'clip-kids', video: '/video/hero-3-kids.mp4', src: '/video/hero-3-kids.webp', w: 1280, h: 700, alt: 'kids' },
  { name: 'clip-hooves', video: '/video/hooves-sand.mp4', src: '/video/hooves-sand.webp', w: 1280, h: 720, alt: 'hooves' },
  { name: 'clip-herd', video: '/video/paddock-herd.mp4', src: '/video/paddock-herd.webp', w: 1280, h: 720, alt: 'paddock' },
  { name: 'clip-grooming', video: '/video/grooming.mp4', src: '/video/grooming.webp', w: 1280, h: 700, alt: 'grooming' },
]

export const SHARE_IMAGE = '/img/club/og-horse-blaze.jpg'

// The club photos (~1000 px): only at medium size (bento tiles, the Competencias split), never full-bleed.
export const PHOTOS = {
  jumpBay: { src: '/img/club/jump-bay.webp', w: 1010, h: 671 },
  families: { src: '/img/club/families-celebrating.webp', w: 1008, h: 675 },
  jumpGrey: { src: '/img/club/jump-grey.webp', w: 452, h: 675 },
  rosette: { src: '/img/club/rosette-campeon.webp', w: 1017, h: 672 },
  rider: { src: '/img/club/rider-buckskin.webp', w: 451, h: 673 },
  paddock: { src: '/img/club/paddock-herd.webp', w: 1002, h: 668 },
  fence: { src: '/img/club/horse-fence.webp', w: 504, h: 678 },
}

// Club figures for the counters. null shows "—" until the club gives the real number (never invent one).
export const FIGURES = { years: null, horses: null, hectares: null, riders: null }

// Testimonials: only real ones, word for word, with the person's name. Empty hides the block.
export const TESTIMONIALS = []
