// lib/scanDocument.js — send a receipt / money document to be stored and read
import api from './api';
import { pdfToLines } from './pdfText';

const MAX_EDGE = 2400; // plenty for OCR; keeps uploads small and fast

export const isPdfFile = (file) => file?.type === 'application/pdf' || /\.pdf$/i.test(file?.name || '');

// Large phone photos are scaled down (respecting EXIF rotation) before upload.
// HEIC and other formats the browser cannot decode are sent as-is — the server
// converts them.
async function shrinkImage(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 1.5 * 1024 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
  } catch {
    return file;
  }
}

/**
 * Upload + read a document.
 * @param {File} file
 * @param {(stage: string) => void} onStage progress text for the UI
 * @returns {Promise<{ url, previewUrl, isPdf, ocr }>}
 */
export async function scanDocument(file, onStage = () => {}) {
  const fd = new FormData();
  if (isPdfFile(file)) {
    onStage('Reading the PDF…');
    try {
      // Digital PDFs (e-receipts, bank statements) carry exact text — no OCR guesswork
      fd.append('pdfText', (await pdfToLines(file, { maxPages: 3 })).join('\n'));
    } catch {
      /* scanned PDF without a text layer — the server will OCR it */
    }
    fd.append('file', file);
  } else {
    onStage('Preparing the photo…');
    fd.append('file', await shrinkImage(file));
  }
  onStage('Uploading and reading the text…');
  // OCR can take a while on a slow server, especially the first scan of the day
  const { data } = await api.post('/upload/scan-receipt', fd, { timeout: 120000 });
  return data;
}

/** Upload a document as proof only (no reading). */
export async function uploadProof(file) {
  const fd = new FormData();
  fd.append('file', isPdfFile(file) ? file : await shrinkImage(file));
  const { data } = await api.post('/upload/receipt', fd, { timeout: 60000 });
  return data.url;
}
