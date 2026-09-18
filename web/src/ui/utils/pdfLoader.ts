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
