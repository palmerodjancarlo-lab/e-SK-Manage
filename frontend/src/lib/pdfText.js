// lib/pdfText.js — read the text layer of a PDF in the browser (pdf.js)
// The worker is bundled by Vite, so this works offline and never depends on a CDN
// path matching the installed pdf.js version.

/**
 * @param {File|Blob} file
 * @param {{ maxPages?: number }} opts
 * @returns {Promise<string[]>} text lines, top to bottom, left to right
 */
export async function pdfToLines(file, { maxPages = Infinity } = {}) {
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const lines = [];
  for (let p = 1; p <= Math.min(doc.numPages, maxPages); p++) {
    const page = await doc.getPage(p);
    const { items } = await page.getTextContent();
    const rows = {};
    for (const it of items) {
      const y = Math.round(it.transform[5]);
      (rows[y] = rows[y] || []).push({ x: it.transform[4], s: it.str });
    }
    Object.keys(rows).map(Number).sort((a, b) => b - a).forEach((y) => {
      const line = rows[y].sort((a, b) => a.x - b.x).map((o) => o.s).join(' ').replace(/\s+/g, ' ').trim();
      if (line) lines.push(line);
    });
  }
  return lines;
}
