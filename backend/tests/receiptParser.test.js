// ============================================================
// File:    receiptParser.test.js
// Test:    Receipt / money-document text → structured fields
//          Fixtures mimic real OCR output, including its typical mistakes.
// ============================================================

const { parseDocument, normalizeLine } = require('../utils/receiptParser')

describe('normalizeLine (OCR clean-up)', () => {
  test('fixes letter O read inside numbers', () => {
    expect(normalizeLine('TOTAL 1,25O.OO')).toBe('TOTAL 1,250.00')
  })
  test('joins a thousands group split by a space', () => {
    expect(normalizeLine('TOTAL 1 250.00')).toBe('TOTAL 1250.00')
  })
})

describe('supermarket sales invoice', () => {
  const doc = parseDocument(`
PUREGOLD PRICE CLUB INC.
STA. CRUZ, MARINDUQUE
VAT REG TIN 000-123-456-000
SALES INVOICE
SI No. 000123456
Date: 10/05/2026  14:32
BOND PAPER A4 500S      2 x 245.00    490.00 V
BALLPEN BLACK           12 x 8.50     102.00 V
FOLDER LONG             1 x 125.50    125.50 V
SUBTOTAL                             717.50
VATABLE SALES                        640.63
VAT AMOUNT                            76.87
TOTAL                                717.50
CASH                                1000.00
CHANGE                               282.50
`)
  test('reads the total, not cash or VAT lines', () => {
    expect(doc.total).toBe(717.5)
    expect(doc.confidence.total).toBe('high')
  })
  test('reads date, invoice number and store', () => {
    expect(doc.date).toBe('2026-10-05')
    expect(doc.referenceNumber).toBe('000123456')
    expect(doc.vendor).toMatch(/PUREGOLD/)
  })
  test('reads every line item and they add up', () => {
    expect(doc.items).toHaveLength(3)
    expect(doc.items[0]).toEqual({ description: 'BOND PAPER A4 500S', quantity: 2, amount: 490 })
    expect(doc.itemsMatchTotal).toBe(true)
  })
  test('suggests the supplies category', () => {
    expect(doc.category).toBe('supplies')
  })
})

describe('fast-food official receipt with OCR noise', () => {
  const doc = parseDocument(`
JOLLIBEE STA CRUZ
OFFICIAL RECEIPT
OR# 4521 889
Oct 3, 2026 12:10 PM
1 CHICKENJOY BUCKET 6PC  699.OO
2 SPAGHETTI              120.00
TOTAL AMOUNT DUE  P 819.00
CASH 1,000.00
CHANGE 181.00
`)
  test('reads total, date, OR number', () => {
    expect(doc.total).toBe(819)
    expect(doc.date).toBe('2026-10-03')
    expect(doc.referenceNumber).toBe('4521889')
    expect(doc.kind).toBe('official_receipt')
  })
  test('reads items despite "699.OO"', () => {
    expect(doc.items.map((i) => i.amount)).toEqual([699, 120])
    expect(doc.category).toBe('food')
  })
})

describe('GCash transfer received as a fund', () => {
  const doc = parseDocument(`
GCash
Sent via GCash
Amount 5,000.00
Total Amount Sent ₱5,000.00
From: BARANGAY TAWIRAN TREASURY
Ref No. 1012 345 678901
Sep 30, 2026 3:15 PM
`)
  test('reads amount, sender, reference and date', () => {
    expect(doc.total).toBe(5000)
    expect(doc.payer).toBe('BARANGAY TAWIRAN TREASURY')
    expect(doc.referenceNumber).toBe('1012345678901')
    expect(doc.date).toBe('2026-09-30')
  })
  test('recognises a barangay allocation transfer', () => {
    expect(doc.kind).toBe('transfer')
    expect(doc.sourceType).toBe('barangay_allocation')
  })
})

describe('acknowledgement receipt for a donation', () => {
  const doc = parseDocument(`
ACKNOWLEDGEMENT RECEIPT
Received from Hon. Maria Santos the sum of TEN THOUSAND PESOS (P10,000.00)
as donation for the Youth Sports Fest.
Date: 09-28-2026
`)
  test('reads payer without the amount wording', () => {
    expect(doc.payer).toBe('Hon. Maria Santos')
  })
  test('reads the amount and date, and suggests donation', () => {
    expect(doc.total).toBe(10000)
    expect(doc.date).toBe('2026-09-28')
    expect(doc.sourceType).toBe('donation')
  })
})

describe('bank deposit slip with a day-first date', () => {
  const doc = parseDocument(`
LANDBANK OF THE PHILIPPINES
DEPOSIT SLIP
Account Name: SK TAWIRAN
Date 25/09/2026
Cash 15,000.00
Total Deposit 15,000.00
`)
  test('switches to day-first when the month would be impossible', () => {
    expect(doc.date).toBe('2026-09-25')
  })
  test('reads the deposit total', () => {
    expect(doc.total).toBe(15000)
    expect(doc.kind).toBe('deposit')
  })
})

describe('edge cases', () => {
  test('empty text never throws and returns empty fields', () => {
    const doc = parseDocument('')
    expect(doc.total).toBeNull()
    expect(doc.items).toEqual([])
    expect(doc.date).toBeNull()
  })
  test('ignores dates in the future', () => {
    expect(parseDocument('Date: 01/01/2099\nTOTAL 50.00').date).toBeNull()
  })
  test('does not mistake a year for an amount', () => {
    expect(parseDocument('Thank you 2026\nAmount 350.00').total).toBe(350)
  })
  test('falls back to cash minus change when no total line exists', () => {
    expect(parseDocument('Store X\nCASH 500.00\nCHANGE 120.00').total).toBe(380)
  })
})

// Real Tesseract output (rendered hardware receipt): the amount column came out
// separated from the item names, as it often does with photographed receipts.
describe('real OCR output with a detached amount column', () => {
  const doc = parseDocument(`MARINDUQUE HARDWARE & SUPPLY
Brgy. Poblacion, Sta. Cruz
VAT REG TIN 123-456-789-000

OFFICIAL RECEIPT

OR No. 0045871
Date: 10/08/2026 09:41

135.00
760.00
130.00

PAINT BRUSH 2IN 3 x 45.00

LATEX PAINT 1GAL 2 x 380.00
MASKING TAPE 4 x 32.50

SUBTOTAL                          1,025.00
VAT AMOUNT                          109.82

TOTAL AMOUNT DUE               P 1,025.00
cash                              1,100.00

CHANGE                               75.00
THANK YOU, COME AGAIN!`)
  test('finds the store even though its name contains the province', () => {
    expect(doc.vendor).toBe('MARINDUQUE HARDWARE & SUPPLY')
  })
  test('computes line totals from quantity × unit price', () => {
    expect(doc.items).toEqual([
      { description: 'PAINT BRUSH 2IN', quantity: 3, amount: 135 },
      { description: 'LATEX PAINT 1GAL', quantity: 2, amount: 760 },
      { description: 'MASKING TAPE', quantity: 4, amount: 130 },
    ])
    expect(doc.itemsMatchTotal).toBe(true)
  })
  test('reads total, date and OR number', () => {
    expect(doc.total).toBe(1025)
    expect(doc.date).toBe('2026-10-08')
    expect(doc.referenceNumber).toBe('0045871')
  })
})

// Real Tesseract output from a tilted, blurred, low-contrast phone photo.
describe('real OCR of a tilted phone photo', () => {
  // column mode stopped before the totals
  const partial = parseDocument('7-ELEVEN STA cruz\nSALES INVOICE\n\nSIf: 00221873\n10/09/2026 18:22\n\nBOTTLED WATER 500MI 12 x 15.00\nBREAD LOAF 2 x 68.00\n\n')
  // block mode recovered them, with OCR misspellings
  const full = parseDocument('7-ELEVEN STA cruz\nSALES INVOICE\n\nSIf: 00221873\n\n10/09/2026 18:22\n\nBOTTLED WATER 500MI 12 x 15.00\n\nBREAD LOAF 2 x 68.00\n\nToraL                          316.00\ncass                           500.00\nCHANGE                          184.00')

  test('a guessed total never discards real items', () => {
    expect(partial.items.map((i) => i.amount)).toEqual([180, 136])
    expect(partial.total).toBe(316)
    expect(partial.confidence.total).toBe('medium')
  })
  test('reads "ToraL" as the total and "cass" as cash', () => {
    expect(full.total).toBe(316)
    expect(full.confidence.total).toBe('high')
    expect(full.itemsMatchTotal).toBe(true)
  })
  test('keeps "7-ELEVEN" as the store and reads "SIf" as SI#', () => {
    expect(full.vendor).toBe('7-ELEVEN STA cruz')
    expect(full.referenceNumber).toBe('00221873')
  })
  test('the fuller parse scores higher', () => {
    const { scoreParse } = require('../utils/receiptParser')
    expect(scoreParse(full)).toBeGreaterThan(scoreParse(partial))
  })
})
