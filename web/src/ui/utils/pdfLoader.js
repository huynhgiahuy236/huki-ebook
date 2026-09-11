import * as pdfjsLib from 'pdfjs-dist';

// Cấu hình worker cho pdfjs-dist
if (typeof window !== 'undefined' && 'Worker' in window) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
  } catch (err) {
    console.warn('PDF.js worker setup error:', err);
  }
}

export { pdfjsLib };

/**
 * Tải tài liệu PDF từ URL hoặc ArrayBuffer
 */
export async function loadPdfDocument(urlOrData) {
  try {
    const loadingTask = pdfjsLib.getDocument(urlOrData);
    const pdfDoc = await loadingTask.promise;
    return pdfDoc;
  } catch (error) {
    console.error('Error loading PDF document:', error);
    throw error;
  }
}
