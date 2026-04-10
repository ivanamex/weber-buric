import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import './App.css'

// ── HELPERS ──────────────────────────────────────────────────────────────────
const PIN_SVG = (color = '#b8935a', size = 13) => (
  <svg width={size} height={size * 1.2} viewBox="0 0 12 14" fill="none">
    <path d="M6 0C3.24 0 1 2.24 1 5c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5zm0 6.5A1.5 1.5 0 1 1 6 3.5a1.5 1.5 0 0 1 0 3z" fill={color}/>
  </svg>
)

const LABEL_COLORS = {
  sale:    { bg: '#1e2a35', text: '#fff' },
  invest:  { bg: '#5a3e7a', text: '#fff' },
  rent:    { bg: '#C0614A', text: '#fff' },
  feat:    { bg: '#b8935a', text: '#fff' },
}

const WB_LOGO = ({ dark = false }) => (
  <svg viewBox="0 0 220 140" fill="none" style={{ height: 40, width: 'auto' }}>
    <polyline points="10,20 32,100 54,48 76,100 98,20" stroke={dark ? '#f5f0e8' : '#2c3e50'} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <line x1="112" y1="20" x2="112" y2="118" stroke={dark ? '#f5f0e8' : '#2c3e50'} strokeWidth="5" strokeLinecap="round"/>
    <path d="M112,20 Q158,20 158,52 Q158,68 140,72" stroke={dark ? '#f5f0e8' : '#2c3e50'} strokeWidth="5" strokeLinecap="round" fill="none"/>
    <path d="M112,72 Q168,72 168,95 Q168,118 112,118" stroke={dark ? '#f5f0e8' : '#2c3e50'} strokeWidth="5" strokeLinecap="round" fill="none"/>
    <path d="M152,44 C152,36 142,33 138,40 C134,33 124,36 124,44 C124,51 131,58 138,65 C145,58 152,51 152,44Z" fill="#C0614A"/>
    <rect x="135" y="65" width="6" height="28" rx="3" fill="#C0614A"/>
    <rect x="141" y="78" width="9" height="5" rx="2" fill="#C0614A"/>
    <rect x="141" y="88" width="7" height="4" rx="2" fill="#C0614A"/>
  </svg>
)

// ── PROPERTY CARD ─────────────────────────────────────────────────────────────
function PropertyCard({ prop, onClick }) {
  const [mapOpen, setMapOpen] = useState(false)
  const lbl = prop.mode === 'sale' && prop.featured ? 'feat' : prop.mode
  const colors = LABEL_COLORS[lbl] || LABEL_COLORS.sale

  return (
    <div className="p-card" onClick={() => onClick(prop)}>
      <div className="p-img" style={{ height: prop.featured ? 300 : 200 }}>
        {prop.image_main && (
          <img src={prop.image_main} alt={prop.title}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            loading="eager" />
        )}
        <span className="p-lbl" style={{ background: colors.bg, color: colors.text }}>
          {prop.featured ? '⭐ Featured Sale' : prop.label || prop.mode}
        </span>
      </div>
      <div className="p-body">
        <p className="p-loc">{prop.neighborhood} · {prop.city}</p>
        <h3 className="p-name">{prop.title}</h3>
        <div className="p-pin" onClick={e => { e.stopPropagation(); setMapOpen(o => !o) }}>
          {PIN_SVG()} {prop.address}
        </div>
        {mapOpen && prop.map_query && (
          <div className="map-drop">
            <iframe
              loading="lazy" title="Map"
              src={`https://maps.google.com/maps?q=${prop.map_query}&output=embed&z=15`}
              style={{ width: '100%', height: 200, border: 'none', display: 'block' }}
            />
            <button className="map-close" onClick={e => { e.stopPropagation(); setMapOpen(false) }}>
              ✕ Close map
            </button>
          </div>
        )}
        <div className="p-specs">
          {prop.bedrooms && <span>{prop.bedrooms} Beds</span>}
          {prop.bathrooms && <span>{prop.bathrooms} Baths</span>}
          {prop.area_sqm && <span>{prop.area_sqm} m²</span>}
          {prop.tags?.slice(0, 2).map(t => <span key={t}>{t}</span>)}
        </div>
        <div className="p-foot">
          <div className="p-price">
            {prop.price_display || prop.price}
            {prop.price_unit && <small> {prop.price_unit}</small>}
          </div>
          <div className="p-arrow">→</div>
        </div>
      </div>
    </div>
  )
}

// ── PROPERTY DETAIL MODAL ─────────────────────────────────────────────────────
function DetailModal({ prop, onClose }) {
  const [imgIdx, setImgIdx] = useState(0)
  const [mapOpen, setMapOpen] = useState(false)
  const imgs = prop.images || [prop.image_main].filter(Boolean)

  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = '' } }, [])

  return (
    <div className="det-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="det-box">
        <button className="det-close" onClick={onClose}>✕</button>

        {/* Gallery */}
        <div className="det-gal">
          {imgs[imgIdx] && (
            <img src={imgs[imgIdx]} alt={prop.title}
              style={{ width: '100%', height: 360, objectFit: 'cover', display: 'block' }}
              loading="eager" />
          )}
          {imgs.length > 1 && (
            <>
              <button className="det-gal-btn left" onClick={() => setImgIdx(i => (i - 1 + imgs.length) % imgs.length)}>‹</button>
              <button className="det-gal-btn right" onClick={() => setImgIdx(i => (i + 1) % imgs.length)}>›</button>
              <span className="det-gal-cnt">{imgIdx + 1} / {imgs.length}</span>
            </>
          )}
          <span className="det-lbl" style={LABEL_COLORS[prop.mode] ? { background: LABEL_COLORS[prop.mode].bg, color: '#fff' } : {}}>
            {prop.label || prop.mode}
          </span>
        </div>

        {/* Body */}
        <div className="det-body">
          <p className="det-loc">{prop.neighborhood} · {prop.city}</p>
          <h2 className="det-title">{prop.title}</h2>

          <div className="det-pin" onClick={() => setMapOpen(o => !o)}>
            {PIN_SVG()} {prop.address} — tap to show map
          </div>
          {mapOpen && prop.map_query && (
            <div className="det-map-wrap">
              <iframe loading="lazy" title="Location"
                src={`https://maps.google.com/maps?q=${prop.map_query}&output=embed&z=15`}
                style={{ width: '100%', height: 240, border: 'none', display: 'block' }} />
              <button className="map-close" onClick={() => setMapOpen(false)}>✕ Close map</button>
            </div>
          )}

          <div className="det-price-row">
            <div className="det-price">
              {prop.price_display || prop.price}
              {!prop.price_display && prop.price_unit && <small> {prop.price_unit}</small>}
            </div>
            <div className="det-ctas">
              <a href={`https://wa.me/52?text=Hi, I am interested in ${prop.title}`}
                className="btn-gold" target="_blank" rel="noreferrer">WhatsApp</a>
              <a href={`mailto:info@weber-buric.com?subject=Enquiry: ${prop.title}`}
                className="btn-outline">Email Us</a>
            </div>
          </div>

          <div className="det-specs">
            {prop.bedrooms && <div className="det-spec"><span>{prop.bedrooms}</span><small>Bedrooms</small></div>}
            {prop.bathrooms && <div className="det-spec"><span>{prop.bathrooms}</span><small>Bathrooms</small></div>}
            {prop.area_sqm && <div className="det-spec"><span>{prop.area_sqm}</span><small>m²</small></div>}
            {prop.year_built && <div className="det-spec"><span>{prop.year_built}</span><small>Built</small></div>}
          </div>

          {prop.description_en && <p className="det-desc">{prop.description_en}</p>}

          {prop.features?.length > 0 && (
            <div className="det-feats">
              {prop.features.map((f, i) => <div key={i} className="det-feat">{f}</div>)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedProp, setSelectedProp] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [activeTab, setActiveTab] = useState('sale')
  const [filters, setFilters] = useState({ location: '', type: '', price: '', beds: '' })
  const [carouselIdx, setCarouselIdx] = useState(0)

  // Fetch properties
  useEffect(() => {
    async function fetchProperties() {
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .eq('status', 'active')
          .in('site', ['weber-buric', 'both'])
          .order('featured', { ascending: false })
          .order('created_at', { ascending: false })

        if (error) throw error
        setProperties(data || [])
      } catch (err) {
        console.error('Supabase error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchProperties()
  }, [])

  // Scroll
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  // Carousel auto-advance
  const featuredProps = properties.filter(p => p.featured || p.mode === 'sale').slice(0, 4)
  useEffect(() => {
    if (!featuredProps.length) return
    const t = setInterval(() => setCarouselIdx(i => (i + 1) % featuredProps.length), 6000)
    return () => clearInterval(t)
  }, [featuredProps.length])

  // Filter
  const filtered = properties.filter(p => {
    if (activeTab === 'sale' && p.mode !== 'sale' && p.mode !== 'invest') return false
    if (activeTab === 'rent' && p.mode !== 'rent') return false
    if (activeTab === 'invest' && p.mode !== 'invest') return false
    if (filters.location && !p.neighborhood?.toLowerCase().includes(filters.location.toLowerCase()) &&
        !p.city?.toLowerCase().includes(filters.location.toLowerCase())) return false
    if (filters.beds && p.bedrooms < parseInt(filters.beds)) return false
    return true
  })

  const NEIGHBORHOODS = ['Playacar Fase I','Playacar Fase II','Corasol','Centro / 5th Avenue','Zazil-Ha','Ejidal','Selvamar','El Cielo','Tulum','Puerto Aventuras','Puerto Morelos','Akumal','Cancun']

  return (
    <div style={{ fontFamily: "'Montserrat', sans-serif", background: '#f5f0e8', color: '#2c3e50', fontSize: 16 }}>

      {/* MOBILE MENU */}
      {menuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: '#f5f0e8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          {['Properties','Neighborhoods','About','Blog','Contact'].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`}
              onClick={() => setMenuOpen(false)}
              style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(32px,9vw,52px)', fontWeight: 300, color: '#2c3e50', textDecoration: 'none', padding: '10px 0', display: 'block', textAlign: 'center' }}>
              {item}
            </a>
          ))}
          <button onClick={() => setMenuOpen(false)}
            style={{ marginTop: 24, background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#8a9aaa' }}>✕</button>
        </div>
      )}

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, height: scrolled ? 58 : 72, padding: '0 5vw', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(245,240,232,.96)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(184,147,90,.22)', transition: 'height .3s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <WB_LOGO />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 400, color: '#1e2a35', letterSpacing: '.5px', lineHeight: 1 }}>Weber-Buric</span>
            <span style={{ fontSize: 7.5, letterSpacing: 3, textTransform: 'uppercase', color: '#b8935a' }}>Real Estate Mexico</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <nav className="desk-nav">
            {['Properties','Neighborhoods','About','Blog'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} className="nav-link">{item}</a>
            ))}
            <a href="#contact" className="nav-cta">Contact</a>
          </nav>
          <button onClick={() => setMenuOpen(o => !o)} className="burger-btn" aria-label="Menu">
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* HERO CAROUSEL */}
      <section style={{ position: 'relative', height: '100vh', minHeight: 560, overflow: 'hidden', marginTop: 0 }}>
        {featuredProps.length > 0 ? featuredProps.map((prop, i) => (
          <div key={prop.id} style={{
            position: 'absolute', inset: 0,
            opacity: i === carouselIdx ? 1 : 0,
            transition: 'opacity .9s ease',
            pointerEvents: i === carouselIdx ? 'all' : 'none'
          }}>
            {prop.image_main && (
              <img src={prop.image_main} alt={prop.title}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: i === carouselIdx ? 'scale(1)' : 'scale(1.04)', transition: 'transform 7s ease' }}
                loading="eager" />
            )}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right,rgba(30,42,53,.78) 0%,rgba(30,42,53,.38) 60%,rgba(30,42,53,.08) 100%)' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 220, background: 'linear-gradient(to top,rgba(245,240,232,.88),transparent)' }} />
            <div style={{ position: 'absolute', bottom: 160, left: '8vw', zIndex: 10, maxWidth: 560 }}>
              <p style={{ fontSize: 9, letterSpacing: 4, textTransform: 'uppercase', color: '#d4aa72', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ display: 'block', width: 28, height: 1, background: '#d4aa72' }} />
                {prop.neighborhood} · {prop.city}
              </p>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(34px,5.5vw,66px)', fontWeight: 300, lineHeight: 1.05, color: '#fff', marginBottom: 10 }}>
                {prop.title}
              </h2>
              <p style={{ fontSize: 14, fontWeight: 400, color: '#d4aa72', marginBottom: 14 }}>
                {prop.price_display || `${prop.price} ${prop.price_unit}`}
              </p>
              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 20 }}>
                {prop.bedrooms && <span style={{ fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,.7)' }}><strong style={{ color: '#fff' }}>{prop.bedrooms}</strong> Beds</span>}
                {prop.bathrooms && <span style={{ fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,.7)' }}><strong style={{ color: '#fff' }}>{prop.bathrooms}</strong> Baths</span>}
                {prop.area_sqm && <span style={{ fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,.7)' }}><strong style={{ color: '#fff' }}>{prop.area_sqm}</strong> m²</span>}
              </div>
              <button onClick={() => setSelectedProp(prop)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '12px 28px', border: '1px solid rgba(255,255,255,.55)', color: '#fff', fontSize: 9, letterSpacing: '2.5px', textTransform: 'uppercase', background: 'none', cursor: 'pointer', fontFamily: "'Montserrat', sans-serif" }}>
                View Property →
              </button>
            </div>
          </div>
        )) : (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#1e2a35,#2c3e50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: '#d4aa72', fontFamily: "'Cormorant Garamond', serif", fontSize: 32 }}>Weber-Buric Real Estate</p>
          </div>
        )}

        {/* Carousel dots */}
        {featuredProps.length > 1 && (
          <div style={{ position: 'absolute', bottom: 90, left: '8vw', zIndex: 10, display: 'flex', gap: 12 }}>
            {featuredProps.map((_, i) => (
              <button key={i} onClick={() => setCarouselIdx(i)}
                style={{ width: i === carouselIdx ? 40 : 24, height: 2, background: i === carouselIdx ? '#fff' : 'rgba(255,255,255,.3)', border: 'none', padding: 0, cursor: 'pointer', transition: 'all .3s' }} />
            ))}
          </div>
        )}
        <div style={{ position: 'absolute', right: '5vw', bottom: 82, zIndex: 10, display: 'flex', gap: 10 }}>
          <button onClick={() => setCarouselIdx(i => (i - 1 + featuredProps.length) % featuredProps.length)}
            style={{ width: 42, height: 42, border: '1px solid rgba(255,255,255,.35)', background: 'rgba(255,255,255,.08)', color: '#fff', cursor: 'pointer', fontSize: 18 }}>‹</button>
          <button onClick={() => setCarouselIdx(i => (i + 1) % featuredProps.length)}
            style={{ width: 42, height: 42, border: '1px solid rgba(255,255,255,.35)', background: 'rgba(255,255,255,.08)', color: '#fff', cursor: 'pointer', fontSize: 18 }}>›</button>
        </div>
      </section>

      {/* SEARCH */}
      <div style={{ background: '#f5f0e8', borderBottom: '1px solid rgba(184,147,90,.22)', padding: '20px 5vw 18px' }}>
        <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '2px solid rgba(184,147,90,.22)' }}>
          {[['sale','Buy'],['rent','Rent'],['invest','Invest']].map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)}
              style={{ padding: '12px 0', marginRight: 32, fontSize: 10, letterSpacing: '2.5px', textTransform: 'uppercase', color: activeTab === key ? '#2c3e50' : '#8a9aaa', background: 'none', border: 'none', borderBottom: activeTab === key ? '3px solid #b8935a' : '3px solid transparent', marginBottom: -2, cursor: 'pointer', fontFamily: "'Montserrat', sans-serif", fontWeight: activeTab === key ? 600 : 500, transition: 'all .3s' }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: '#b8935a', fontWeight: 600, display: 'block', marginBottom: 6 }}>Location</label>
            <select value={filters.location} onChange={e => setFilters(f => ({ ...f, location: e.target.value }))} className="s-select">
              <option value="">All Locations</option>
              {NEIGHBORHOODS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: '#b8935a', fontWeight: 600, display: 'block', marginBottom: 6 }}>Min Beds</label>
            <select value={filters.beds} onChange={e => setFilters(f => ({ ...f, beds: e.target.value }))} className="s-select">
              <option value="">Any</option>
              {['1','2','3','4','5'].map(n => <option key={n} value={n}>{n}+</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
            <button style={{ padding: '13px 36px', background: '#1e2a35', border: 'none', color: '#fff', fontSize: 10, letterSpacing: '2.5px', textTransform: 'uppercase', cursor: 'pointer', fontFamily: "'Montserrat', sans-serif", fontWeight: 600, borderRadius: 2, transition: 'background .3s' }}
              onMouseOver={e => e.target.style.background='#b8935a'} onMouseOut={e => e.target.style.background='#1e2a35'}>
              Search Properties
            </button>
            <button onClick={() => setFilters({ location: '', type: '', price: '', beds: '' })}
              style={{ fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: '#8a9aaa', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Montserrat', sans-serif" }}>
              Clear All
            </button>
          </div>
        </div>
      </div>

      {/* PROPERTIES */}
      <section style={{ padding: '80px 5vw', background: '#fff' }} id="properties">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 44, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <p className="sec-lbl">Sales &amp; Rentals</p>
            <h2 className="sec-ttl">Luxury Properties<br /><em>Riviera Maya</em></h2>
          </div>
          <span style={{ fontSize: 13, color: '#8a9aaa' }}>{filtered.length} {filtered.length === 1 ? 'property' : 'properties'}</span>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, color: '#b8935a' }}>Loading properties...</p>
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#C0614A' }}>
            <p>Could not load properties. Please check your Supabase connection.</p>
            <p style={{ fontSize: 12, marginTop: 8 }}>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="p-grid">
            {filtered.map(prop => (
              <div key={prop.id} className={prop.featured ? 'wide' : ''}>
                <PropertyCard prop={prop} onClick={setSelectedProp} />
              </div>
            ))}
            {filtered.length === 0 && (
              <p style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', fontFamily: "'Cormorant Garamond', serif", fontSize: 24, color: '#8a9aaa' }}>
                No properties match your search. Try adjusting the filters.
              </p>
            )}
          </div>
        )}
      </section>

      {/* STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', background: '#1e2a35', borderTop: '3px solid #b8935a' }}>
        {[['11+','Years in Riviera Maya'],['200+','Properties Transacted'],['4','Languages Spoken'],['100%','Licensed & Certified']].map(([n, l]) => (
          <div key={l} style={{ padding: '44px 5vw', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,.08)' }}>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(36px,5vw,56px)', fontWeight: 300, color: '#b8935a', lineHeight: 1, marginBottom: 8 }}>{n}</p>
            <p style={{ fontSize: 8.5, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(255,255,255,.45)' }}>{l}</p>
          </div>
        ))}
      </div>

      {/* ABOUT DARK */}
      <div style={{ background: '#1e2a35' }} id="about">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', maxWidth: '100%' }}>
          <div style={{ padding: '80px 5vw', borderRight: '1px solid rgba(255,255,255,.08)' }}>
            <p className="a-lbl">About Weber-Buric</p>
            <h2 className="a-ttl">European precision.<br /><em>Local expertise.</em></h2>
            <p style={{ fontSize: 15, fontWeight: 300, lineHeight: 2, color: 'rgba(255,255,255,.65)', maxWidth: 500, marginBottom: 24 }}>
              We are Ivana and Yannick Weber-Buric — licensed and certified real estate brokers based in Playa del Carmen. Swiss by standard, Caribbean by choice. 11 years on the ground serving Mexican, Latin American, and international clients.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 28 }}>
              {[
                { init: 'I', name: 'Ivana Weber-Buric', cred: 'MSc. Economics · Broker', bio: 'Contract negotiation, luxury sales & investment strategy. 4 languages.' },
                { init: 'Y', name: 'Yannick Weber', cred: 'Swiss · Licensed Broker', bio: 'Investment analysis, legal & notarial, fiscal strategy for all buyers.' }
              ].map(p => (
                <div key={p.init} style={{ padding: 22, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.03)', borderRadius: 2 }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 48, fontWeight: 300, color: 'rgba(184,147,90,.18)', lineHeight: 1, marginBottom: 5 }}>{p.init}</div>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 19, fontWeight: 400, color: '#fff', marginBottom: 3 }}>{p.name}</p>
                  <p style={{ fontSize: 8.5, letterSpacing: 2, textTransform: 'uppercase', color: '#b8935a', marginBottom: 8, fontWeight: 500 }}>{p.cred}</p>
                  <p style={{ fontSize: 13, fontWeight: 300, lineHeight: 1.9, color: 'rgba(255,255,255,.5)' }}>{p.bio}</p>
                </div>
              ))}
            </div>
          </div>
          <div style={{ padding: '80px 5vw', background: 'rgba(255,255,255,.03)' }}>
            <p className="a-lbl">Why Choose Us</p>
            <h2 className="a-ttl" style={{ marginBottom: 24 }}>The <em>right team</em><br />for Riviera Maya.</h2>
            {[
              { ico: '🎓', title: 'Academic & Professional Edge', body: "Ivana's MSc. in Economics drives data-grounded valuations and precision contract negotiation." },
              { ico: '🏡', title: 'Sales Is Our Core Business', body: 'We specialise in luxury property sales and investment advisory. Rentals offered as an added service.' },
              { ico: '⚖', title: 'Legal & Fiscal Fluency', body: 'Fideicomiso, ISR, notarial processes — we guide every client with trusted legal partners.' },
              { ico: '🌍', title: '4 Languages, Zero Barriers', body: 'Spanish, French, English, Serbian — we speak your language and understand your culture.' }
            ].map(u => (
              <div key={u.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 16px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.03)', marginBottom: 12 }}>
                <span style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}>{u.ico}</span>
                <div>
                  <strong style={{ display: 'block', fontSize: 13, color: '#fff', marginBottom: 3, fontWeight: 600 }}>{u.title}</strong>
                  <span style={{ fontSize: 14, fontWeight: 300, color: 'rgba(255,255,255,.55)', lineHeight: 1.8 }}>{u.body}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '80px 5vw', background: '#243040', borderTop: '3px solid #b8935a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 28 }} id="contact">
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(26px,4vw,46px)', fontWeight: 300, color: '#fff', lineHeight: 1.15, maxWidth: 560 }}>
          Ready to buy, sell,<br />or invest in <em style={{ fontStyle: 'italic', color: '#d4aa72' }}>Riviera Maya?</em>
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a href="https://wa.me/52" target="_blank" rel="noreferrer" className="btn-gold">WhatsApp Us</a>
          <a href="mailto:info@weber-buric.com" className="btn-outline-light">Send Email</a>
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{ background: '#1e2a35', padding: '60px 5vw 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: 44, marginBottom: 48 }}>
          <div>
            <WB_LOGO dark />
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 300, color: '#fff', margin: '14px 0 4px' }}>Weber-Buric Real Estate</p>
            <p style={{ fontSize: 8.5, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#b8935a', marginBottom: 14 }}>Playa del Carmen · Riviera Maya</p>
            <p style={{ fontSize: 12, fontWeight: 300, lineHeight: 1.9, color: 'rgba(255,255,255,.45)', maxWidth: 260 }}>Licensed Swiss-European brokers. 11+ years on the ground.</p>
          </div>
          {[
            { title: 'Buy & Sell', links: ['Properties for Sale','Investment Advisory','Neighborhoods Guide','Legal & Notarial'] },
            { title: 'Rental Service', links: ['Vacation Rentals','Long-Term Rentals','Property Management','Blog & Insights'] },
            { title: 'Contact', links: ['info@weber-buric.com','WhatsApp','Playa del Carmen, Q.Roo'] }
          ].map(col => (
            <div key={col.title}>
              <p style={{ fontSize: 8.5, letterSpacing: 3, textTransform: 'uppercase', color: '#b8935a', marginBottom: 16, fontWeight: 500 }}>{col.title}</p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 11 }}>
                {col.links.map(l => <li key={l}><a href="#" style={{ fontSize: 13, fontWeight: 300, color: 'rgba(255,255,255,.45)', textDecoration: 'none' }}>{l}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,.08)', paddingTop: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontSize: 10, fontWeight: 300, color: 'rgba(255,255,255,.22)' }}>© 2026 Weber-Buric Real Estate Mexico. Licensed Brokers.</p>
          <div style={{ display: 'flex', gap: 12 }}>
            {['ES','EN','FR','SR'].map(l => (
              <button key={l} style={{ fontSize: 8.5, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,.25)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Montserrat', sans-serif" }}>{l}</button>
            ))}
          </div>
        </div>
      </footer>

      {/* PROPERTY DETAIL MODAL */}
      {selectedProp && <DetailModal prop={selectedProp} onClose={() => setSelectedProp(null)} />}
    </div>
  )
}
