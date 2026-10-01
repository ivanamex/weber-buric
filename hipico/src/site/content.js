// Fixed facts about the club, shared by the website pages.
export const CONTACT = {
  phone: '+52 984 143 6457',
  phoneHref: 'tel:+529841436457',
  email: 'hipicorivieramaya@gmail.com',
  instagram: 'https://www.instagram.com/hipicoriveramaya/',
  instagramHandle: '@hipicoriveramaya',
  facebook: 'https://www.facebook.com/hipicorivieramaya',
  address: 'Carretera Cancún–Chetumal km 273, int. Rancho San Francisco, 77735 Paamul, Q. Roo',
  mapQuery: 'Hípico Riviera Maya, Rancho San Francisco, Paamul, Quintana Roo',
}
export const mapEmbed = `https://www.google.com/maps?q=${encodeURIComponent(CONTACT.mapQuery)}&output=embed`
export const mapDirections = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(CONTACT.mapQuery)}`

// Real club photos (public/img/club), with their size so nothing shifts while they load.
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
