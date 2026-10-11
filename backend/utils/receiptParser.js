// utils/receiptParser.js
// Turns the raw text of a receipt or money document (OCR output or a PDF's text
// layer) into structured fields. Pure functions — no I/O — so it is unit tested.
//
// Handles common Philippine documents: supermarket / convenience-store receipts,
// official receipts (OR), sales invoices, hardware/printing shop receipts,
// GCash / Maya transfer receipts, bank deposit slips, checks and
// acknowledgement receipts. OCR is never perfect, so every field also carries a
// confidence, and the UI always lets a person confirm and correct the result.

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
}

/* ── Text clean-up ─────────────────────────────────────────────────────────── */

// Fix the OCR slips that most often break numbers ("1,25O.OO", "1 250.00", "P 500")
// Inside a number-like token, O/o are zeros and l/I/| are ones ("1,25O.OO", "l5O")
const fixNumberToken = (tok) => (
  /\d/.test(tok) && /^[\u20B1P]?[\dOoIl|,.]+$/.test(tok) && /^[\u20B1P]?[\dOoIl|]/.test(tok)
    ? tok.replace(/[Oo]/g, '0').replace(/[Il|]/g, '1')
    : tok
)

const normalizeLine = (line) => line
  .replace(/[\u2018\u2019\u201C\u201D]/g, "'")
  .split(/(\s+)/).map(fixNumberToken).join('')
  // Common OCR misreads of the words the parser relies on ("ToraL", "T0TAL", "cass", "CHANCE")
  .replace(/\b[tT][oO0][tTrR][aA@4][lLI1|]\b/g, 'TOTAL')
  .replace(/\b[cC][aA@4][sS5][hHsS]\b/g, 'CASH')
  .replace(/\b[cC][hH][aA@4][nN][gGcC][eE]\b/g, 'CHANGE')
  .replace(/(?<=\d) (?=\d{3}(?:\.\d{2})\b)/g, '')     // "1 250.00" -> "1250.00"
  .replace(/(?<=\d)\s*\.\s*(?=\d{2}\b)/g, '.')       // "1250 . 00" -> "1250.00"
  .replace(/\s{2,}/g, ' ')
  .trim()

const toLines = (text) => String(text || '')
  .split(/\r?\n/)
  .map(normalizeLine)
  .filter((l) => l.length > 0)

/* ── Amounts ───────────────────────────────────────────────────────────────── */

// Money-looking tokens; excludes percentages, times and long ID-like numbers.
const AMOUNT_RE = /(?<![\d:/-])(?:₱|PHP|Php|P(?=\s?\d))?\s?(\d{1,3}(?:,\d{3})+(?:\.\d{2})?|\d{1,7}\.\d{2}|\d{1,7})(?![\d%:/]|\.\d)/g

const parseAmount = (raw) => {
  const n = Number(String(raw).replace(/,/g, ''))
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null
}

// Amounts on a line, most-likely-money first is NOT assumed: callers pick.
const amountsIn = (line) => {
  const out = []
  for (const m of line.matchAll(AMOUNT_RE)) {
    const value = parseAmount(m[1])
    if (value == null || value <= 0) continue
    const hasDecimals = /\.\d{2}$/.test(m[1]) || /,\d{3}$/.test(m[1])
    const hasCurrency = /₱|PHP|Php|P\s?\d/.test(m[0])
    // a bare 4-digit integer like 2026 is usually a year, not money
    if (!hasDecimals && !hasCurrency && /^(19|20)\d{2}$/.test(m[1])) continue
    out.push({ value, hasDecimals, hasCurrency })
  }
  return out
}

const bestAmount = (line) => {
  const list = amountsIn(line)
  if (!list.length) return null
  const strong = list.filter((a) => a.hasDecimals || a.hasCurrency)
  return (strong.length ? strong : list).at(-1).value // right-most money value on the line
}

/* ── Total ─────────────────────────────────────────────────────────────────── */

const NOT_TOTAL = /(sub\s*-?\s*total|vatable|vat[\s-]*(exempt|amount|able|sales)?\b|zero[\s-]*rated|tax\b|change\b|tender|discount|total\s*(qty|quantity|items?|no\.?\s*of)|no\.?\s*of\s*items|savings|points|cash\s*(tendered|given|received)?\s*$)/i

// Ordered strongest first
const TOTAL_PATTERNS = [
  /grand\s*total/i,
  /total\s*amount\s*(due|payable|paid|sent)?/i,
  /amount\s*(due|payable)/i,
  /total\s*due/i,
  /net\s*(amount|total|payable|sales)/i,
  /total\s*sales?/i,
  /\btotal\b/i,
  /amount\s*(paid|received|sent|deposited|transferred)/i,
  /(the\s*)?sum\s*of/i,
  /\bamount\b/i,
]

const findTotal = (lines) => {
  for (let rank = 0; rank < TOTAL_PATTERNS.length; rank++) {
    const re = TOTAL_PATTERNS[rank]
    // bottom-most match wins (totals sit below the items)
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i]
      if (!re.test(line)) continue
      if (rank >= 6 && NOT_TOTAL.test(line)) continue // generic "total"/"amount" lines only
      if (rank < 6 && /sub\s*-?\s*total/i.test(line)) continue
      const sameLine = bestAmount(line.replace(re, ' '))
      const value = sameLine ?? (lines[i + 1] && !NOT_TOTAL.test(lines[i + 1]) ? bestAmount(lines[i + 1]) : null)
      if (value) return { value, confidence: rank <= 6 ? 'high' : 'medium' }
    }
  }

  // Cash − change, when both are printed
  const cashLine = lines.find((l) => /cash|tendered/i.test(l) && !/change/i.test(l))
  const changeLine = lines.find((l) => /\bchange\b/i.test(l))
  const cash = cashLine && bestAmount(cashLine)
  const change = changeLine && bestAmount(changeLine)
  if (cash && change != null && cash > change) return { value: Math.round((cash - change) * 100) / 100, confidence: 'medium' }

  // Largest money value that is not obviously cash tendered or a reference
  const candidates = lines
    .filter((l) => !/cash|tender|change|ref|tin|tel|phone|no\.|#/i.test(l))
    .flatMap((l) => amountsIn(l).filter((a) => a.hasDecimals || a.hasCurrency))
    .map((a) => a.value)
  if (candidates.length) return { value: Math.max(...candidates), confidence: 'low' }
  return { value: null, confidence: null }
}

/* ── Date ──────────────────────────────────────────────────────────────────── */

const iso = (y, m, d) => {
  if (y < 100) y += 2000
  const date = new Date(Date.UTC(y, m - 1, d))
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null
  const now = new Date()
  if (y < 2000 || date.getTime() > now.getTime() + 2 * 86400000) return null // not in the future
  return date.toISOString().slice(0, 10)
}

const datesIn = (line) => {
  const found = []
  let m
  const ymd = /\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/g
  while ((m = ymd.exec(line))) found.push(iso(+m[1], +m[2], +m[3]))
  const numeric = /\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/g
  while ((m = numeric.exec(line))) {
    const a = +m[1], b = +m[2], y = +m[3]
    // Philippine documents are usually month-first; switch when that is impossible
    found.push(a > 12 ? iso(y, b, a) : iso(y, a, b))
  }
  const monthFirst = /\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{2,4})\b/g
  while ((m = monthFirst.exec(line))) {
    const mo = MONTHS[m[1].slice(0, 4).toLowerCase()] || MONTHS[m[1].slice(0, 3).toLowerCase()]
    if (mo) found.push(iso(+m[3], mo, +m[2]))
  }
  const dayFirst = /\b(\d{1,2})[\s-]([A-Za-z]{3,9})\.?[\s-,]+(\d{2,4})\b/g
  while ((m = dayFirst.exec(line))) {
    const mo = MONTHS[m[2].slice(0, 4).toLowerCase()] || MONTHS[m[2].slice(0, 3).toLowerCase()]
    if (mo) found.push(iso(+m[3], mo, +m[1]))
  }
  return found.filter(Boolean)
}

const findDate = (lines) => {
  const labelled = lines.filter((l) => /date|petsa|issued|txn|trans/i.test(l))
  for (const l of [...labelled, ...lines]) {
    const d = datesIn(l)
    if (d.length) return { value: d[0], confidence: labelled.includes(l) ? 'high' : 'medium' }
  }
  return { value: null, confidence: null }
}

/* ── Reference number ──────────────────────────────────────────────────────── */

const REF_RE = /(?:o\.?\s*r\.?|official\s*receipt|acknowledg\w*\s*receipt|a\.?\s*r\.?|sales\s*invoice|s\.?\s*i\.?|invoice|receipt|ref(?:erence)?|trans(?:action)?|txn|control|check|cheque|deposit\s*slip|serial)\s*(?:no\.?|number|num\.?|#|id|[fH%])\s*[:#.]?\s*([A-Z0-9][A-Z0-9\- ]{2,28})/i // [fH%] = OCR misreads of "#"

const findReference = (lines) => {
  for (const line of lines) {
    const m = line.match(REF_RE)
    if (!m) continue
    const value = m[1].replace(/\s+(?=\d)/g, '').replace(/\s.*$/, '').replace(/[-.]+$/, '')
    if ((value.match(/\d/g) || []).length >= 3) return { value: value.slice(0, 40), confidence: 'high' }
  }
  return { value: null, confidence: null }
}

/* ── Vendor (expenses) / payer (funds) ─────────────────────────────────────── */

// Document labels — never a business name
const NOT_NAME = /(official\s*receipt|sales\s*invoice|\binvoice\b|\breceipt\b|vat\s*reg|\btin\b|non[\s-]*vat|cashier|\bdate\b|\btime\b|\bpos\b|terminal|machine|serial|permit|accreditation|www\.|@|tel\.?|phone|\bcel\b|mobile|thank|customer|welcome|copy)/i
// Address lines — skipped unless they also look like a business name
const ADDRESS = /(\bst\.|street|brgy|barangay|poblacion|city|province|municipality|marinduque|philippines|,\s*sta\.?)/i
const BUSINESS_HINT = /\b(inc|corp(oration)?|co\.|company|store|mart|market|trading|enterprises?|hardware|pharmacy|drug|bakery|restaurant|resto|cafe|caf[eé]|shop|supply|supplies|center|centre|bookstore|printing|print|gas|station|foods?|grocery|merchandise|services?|marketing|depot)\b/i

const findVendor = (lines) => {
  const top = lines.slice(0, 8)
  let best = null
  top.forEach((line, i) => {
    const letters = (line.match(/[A-Za-z]/g) || []).length
    const digits = (line.match(/\d/g) || []).length
    const business = BUSINESS_HINT.test(line)
    const hasMoney = amountsIn(line).some((a) => a.hasDecimals || a.hasCurrency) // "7-ELEVEN" is a name, not ₱7
    if (letters < 3 || digits > letters || NOT_NAME.test(line) || hasMoney) return
    if (ADDRESS.test(line) && !business) return
    const score = (business ? 5 : 0) + (line === line.toUpperCase() ? 1 : 0) - i
    if (!best || score > best.score) best = { line, score }
  })
  if (!best) return { value: null, confidence: null }
  const value = best.line.replace(/[^\w&.,'()\- ]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, 80)
  return { value, confidence: best.score >= 4 ? 'high' : 'medium' }
}

const PAYER_RE = /(?:received\s*(?:with\s*thanks\s*)?from|sender|payor|payer|depositor|remitter|from\s*account|account\s*name|donor|donated\s*by|issued\s*by|from)\s*[:\-]?\s*(.+)/i

const findPayer = (lines) => {
  for (const line of lines) {
    const m = line.match(PAYER_RE)
    if (!m) continue
    const value = m[1]
      .split(/\s+(?:the\s+sum|sum\s+of|in\s+the\s+amount|amount|pesos?|php|₱|for\s|as\s|with\s+ref)/i)[0]
      .replace(/(?:₱|PHP|P)\s?[\d,]+(?:\.\d{2})?.*$/i, '')
      .replace(/[^\w&.,'()\- ]+/g, ' ')
      .replace(/[\s(,]+$/, '')
      .trim()
    if ((value.match(/[A-Za-z]/g) || []).length >= 3) return { value: value.slice(0, 80), confidence: 'high' }
  }
  return { value: null, confidence: null }
}

/* ── Line items ────────────────────────────────────────────────────────────── */

const NOT_ITEM = /(total|vat|tax|change|cash|tender|amount|due|balance|discount|payment|paid|card|gcash|maya|ref|invoice|receipt|cashier|tin\b|date|time|qty\s*$|points|savings|thank|sum\s*of)/i

const findItems = (lines) => {
  const items = []
  lines.forEach((line, i) => {
    if (NOT_ITEM.test(line) || items.length >= 40) return
    let m = line.match(/^(.*?[A-Za-z].*?)\s+(\d{1,4})\s*(?:x|@|pcs?|pc)\s*(?:₱|P)?\s*([\d,]+\.\d{2})\s+(?:₱|P)?\s*([\d,]+\.\d{2})\s*[A-Z]?$/i)
    if (m) { items.push({ description: m[1].trim(), quantity: +m[2], amount: parseAmount(m[4]) }); return }

    m = line.match(/^(\d{1,4})\s*(?:x|pcs?|pc)?\s+([A-Za-z].*?)\s+(?:₱|P)?\s*([\d,]+\.\d{2})\s*[A-Z]?$/i)
    if (m) { items.push({ description: m[2].trim(), quantity: +m[1], amount: parseAmount(m[3]) }); return }

    // "DESC  3 x 45.00" with the line total printed in a separate column
    m = line.match(/^(.*?[A-Za-z].*?)\s+(\d{1,4})\s*(?:x|@)\s*(?:₱|P)?\s*([\d,]+\.\d{2})\s*[A-Z]?$/i)
    if (m) {
      items.push({ description: m[1].trim(), quantity: +m[2], amount: Math.round(+m[2] * parseAmount(m[3]) * 100) / 100 })
      return
    }

    // "2 @ 50.00   100.00" under its description line
    m = line.match(/^(\d{1,4})\s*(?:x|@)\s*(?:₱|P)?\s*[\d,]+\.\d{2}\s+(?:₱|P)?\s*([\d,]+\.\d{2})\s*[A-Z]?$/i)
    if (m && i > 0 && /[A-Za-z]{3}/.test(lines[i - 1]) && !NOT_ITEM.test(lines[i - 1]) && !bestAmount(lines[i - 1])) {
      items.push({ description: lines[i - 1].trim(), quantity: +m[1], amount: parseAmount(m[2]) })
      return
    }

    m = line.match(/^(.*?[A-Za-z]{2}.*?)\s+(?:₱|P)?\s*([\d,]+\.\d{2})\s*[A-Z]{0,2}$/)
    if (m && !NOT_NAME.test(m[1])) items.push({ description: m[1].trim(), quantity: 1, amount: parseAmount(m[2]) })
  })
  return items
    .filter((it) => it.amount > 0 && it.description.replace(/[^A-Za-z]/g, '').length >= 2)
    .map((it) => ({ ...it, description: it.description.replace(/\s{2,}/g, ' ').slice(0, 120) }))
}

/* ── Guesses that help pre-fill the form ───────────────────────────────────── */

const CATEGORY_HINTS = {
  food: /(food|meal|snack|rice|lunch|dinner|breakfast|catering|water|drinks?|softdrinks|coffee|bread|jollibee|mcdo|chowking|mang\s*inasal|bakery|grocery|canned|noodles)/gi,
  supplies: /(paper|bond|pen|ballpen|pencil|folder|envelope|tape|marker|glue|scissors|notebook|cartolina|crayon|supplies|bookstore|stapler|ink)/gi,
  printing: /(print|xerox|photocopy|tarpaulin|tarp|layout|lamination|laminate|banner|sticker)/gi,
  transportation: /(fare|gas|fuel|diesel|gasoline|unleaded|petron|shell|caltex|seaoil|phoenix|tricycle|jeep|van\s*rental|transport|toll|parking)/gi,
  equipment: /(speaker|projector|microphone|mic\b|extension|chair|table|ball|net|jersey|trophy|medal|tools?|equipment|hardware|generator)/gi,
  venue: /(venue|hall|court|rental|reservation|function\s*room)/gi,
  honorarium: /(honorarium|talent\s*fee|speaker'?s?\s*fee|resource\s*speaker|token)/gi,
}

const guessCategory = (text) => {
  let best = { key: 'other', hits: 0 }
  for (const [key, re] of Object.entries(CATEGORY_HINTS)) {
    const hits = (text.match(re) || []).length
    if (hits > best.hits) best = { key, hits }
  }
  return best.key
}

const guessSourceType = (text) => {
  if (/donat/i.test(text)) return 'donation'
  if (/grant|dswd|nyc|national\s*youth/i.test(text)) return 'grant'
  if (/barangay|treasur|municipal|lgu|allotment|allocation|appropriation|sk\s*fund/i.test(text)) return 'barangay_allocation'
  return null
}

const detectKind = (text) => {
  if (/gcash|maya|paymaya|instapay|pesonet|fund\s*transfer|sent\s*via/i.test(text)) return 'transfer'
  if (/deposit\s*slip|deposited|account\s*no/i.test(text)) return 'deposit'
  if (/pay\s*to\s*the\s*order|cheque|\bcheck\b/i.test(text)) return 'check'
  if (/official\s*receipt|\bo\.?\s*r\.?\s*no/i.test(text)) return 'official_receipt'
  if (/acknowledg/i.test(text)) return 'acknowledgement'
  if (/invoice/i.test(text)) return 'invoice'
  return 'receipt'
}

/* ── Public API ────────────────────────────────────────────────────────────── */

/**
 * @param {string} text raw OCR / PDF text
 * @returns {{ kind, vendor, payer, date, total, referenceNumber, items, category, sourceType,
 *            itemsMatchTotal, confidence, rawText }}
 */
const parseDocument = (text) => {
  const rawText = String(text || '')
  const lines = toLines(rawText)
  let total = findTotal(lines)
  const date = findDate(lines)
  const ref = findReference(lines)
  const vendor = findVendor(lines)
  const payer = findPayer(lines)
  // A guessed (low-confidence) total must never throw away real line items
  const trustedTotal = total.confidence === 'low' ? null : total.value
  const items = findItems(lines).filter((it) => trustedTotal == null || it.amount <= trustedTotal)
  const itemsSum = Math.round(items.reduce((s, it) => s + it.amount, 0) * 100) / 100
  if (total.confidence === 'low' && items.length) total = { value: itemsSum, confidence: 'medium' }

  return {
    kind: detectKind(rawText),
    vendor: vendor.value,
    payer: payer.value,
    date: date.value,
    total: total.value,
    referenceNumber: ref.value,
    items,
    category: guessCategory(rawText),
    sourceType: guessSourceType(rawText),
    itemsMatchTotal: total.value != null && items.length > 0 && Math.abs(itemsSum - total.value) < 0.01,
    confidence: {
      vendor: vendor.confidence, payer: payer.confidence, date: date.confidence,
      total: total.confidence, referenceNumber: ref.confidence,
    },
    rawText,
  }
}

// How complete a parse is — used to pick the better of two OCR passes
const scoreParse = (d) => ({ high: 3, medium: 2, low: 1 }[d.confidence.total] || 0)
  + (d.date ? 1 : 0)
  + (d.items.length ? 1 : 0)
  + (d.itemsMatchTotal ? 2 : 0)
  + (d.referenceNumber ? 0.5 : 0)
  + (d.vendor || d.payer ? 0.5 : 0)

module.exports = { parseDocument, scoreParse, normalizeLine, amountsIn, datesIn }
