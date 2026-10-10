let pdfjsLib: any = null;

export async function getPdfLib() {
  if (typeof window === 'undefined') return null;
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    if ('Worker' in window && pdfjsLib?.GlobalWorkerOptions) {
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
      } catch (err) {
        console.warn('PDF.js worker setup error:', err);
      }
    }
  }
  return pdfjsLib;
}

export { pdfjsLib };

/**
 * Tải tài liệu PDF từ URL hoặc ArrayBuffer
 */
export async function loadPdfDocument(urlOrData: string | ArrayBuffer) {
  try {
    const lib = await getPdfLib();
    if (!lib) throw new Error('PDF.js can only run in the browser.');
    const loadingTask = lib.getDocument(urlOrData);
    const pdfDoc = await loadingTask.promise;
    return pdfDoc;
  } catch (error) {
    console.error('Error loading PDF document:', error);
    throw error;
  }
}

const pdfDocCache = new Map<string, any>();

/**
 * Trích xuất toàn bộ văn bản chữ thật của một trang PDF
 */
export async function extractPdfPageText(docOrUrl: any, pageNum: number): Promise<string> {
  try {
    let doc = docOrUrl;
    if (typeof docOrUrl === 'string') {
      if (pdfDocCache.has(docOrUrl)) {
        doc = pdfDocCache.get(docOrUrl);
      } else {
        doc = await loadPdfDocument(docOrUrl);
        pdfDocCache.set(docOrUrl, doc);
      }
    }
    if (!doc || !doc.getPage) return '';
    const page = await doc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const strings = textContent.items
      .map((item: any) => item.str)
      .filter((s: string) => s && s.trim().length > 0);
    return strings.join(' ').replace(/\s+/g, ' ').trim();
  } catch (err) {
    console.warn(`Lỗi trích xuất văn bản trang ${pageNum}:`, err);
    return '';
  }
}

