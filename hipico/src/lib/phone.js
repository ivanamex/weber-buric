// Phone numbers as WhatsApp wants them: digits only, with Mexico's 52 in front of a 10-digit number.
export function waNumber(phone) {
  let digits = String(phone || '').replace(/\D/g, '')
  if (digits.length === 10) digits = `52${digits}`
  if (digits.length === 12 && digits.startsWith('52')) return digits
  if (digits.length === 13 && digits.startsWith('521')) return `52${digits.slice(3)}` // old mobile prefix
  return digits.length >= 8 ? digits : ''
}

/** A wa.me link to someone's number with a ready message, or '' when the number is unusable. */
export function waTo(phone, text) {
  const n = waNumber(phone)
  return n ? `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}` : ''
}
