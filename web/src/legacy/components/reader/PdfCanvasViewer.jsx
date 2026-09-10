import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useReader } from '../../context/ReaderContext';
import { loadPdfDocument } from '../../utils/pdfLoader';

export default function PdfCanvasViewer({ pdfUrl, bookTitle = 'Con Đường Phía Trước', bookId = 'con-duong-phia-truoc' }) {
  const {
    currentPage,
    setCurrentPage,
    setTotalPages,
    zoom,
    viewMode,
    isHighlighterActive,
    highlighterColor,
    highlighterSize,
    highlighterMode,
    highlighterShape,
    highlights,
    addHighlightStroke,
    removeHighlightStroke
  } = useReader();

  const [pdfDoc, setPdfDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const canvasRef1 = useRef(null);
  const canvasRef2 = useRef(null);
  const overlayRef1 = useRef(null);
  const overlayRef2 = useRef(null);
  const containerRef = useRef(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [currentStroke, setCurrentStroke] = useState([]);

  // 1. Tải tài liệu PDF
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const targetUrl = pdfUrl || '/books/Con_duong_phia_truoc__Bill_Gates.pdf';

    loadPdfDocument(targetUrl)
      .then((doc) => {
        if (!isMounted) return;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Lỗi khi tải PDF:', err);
        setError('Không thể nạp tệp PDF. Vui lòng kiểm tra lại kết nối.');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [pdfUrl, setTotalPages]);

  // 2. Render trang PDF lên Canvas
  const renderPage = useCallback(async (pageNum, canvas, overlayCanvas) => {
    if (!pdfDoc || !canvas || pageNum < 1 || pageNum > pdfDoc.numPages) return;

    try {
      const page = await pdfDoc.getPage(pageNum);
      const containerWidth = containerRef.current?.clientWidth || window.innerWidth;
      const dpr = window.devicePixelRatio || 1.5;

      const unscaledViewport = page.getViewport({ scale: 1 });
      const targetWidth = viewMode === 'spread' ? Math.min((containerWidth - 64) / 2, 680) : Math.min(containerWidth - 48, 800);
      const baseScale = targetWidth / unscaledViewport.width;
      const finalScale = baseScale * (zoom / 100);

      const viewport = page.getViewport({ scale: finalScale });

      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, viewport.width, viewport.height);

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport
      };

      await page.render(renderContext).promise;

      if (overlayCanvas) {
        overlayCanvas.width = canvas.width;
        overlayCanvas.height = canvas.height;
        overlayCanvas.style.width = canvas.style.width;
        overlayCanvas.style.height = canvas.style.height;
        redrawHighlights(pageNum, overlayCanvas, dpr);
      }
    } catch (err) {
      console.warn(`Render page ${pageNum} error:`, err);
    }
  }, [pdfDoc, zoom, viewMode]);

  // Vẽ lại các nét highlight của trang lên overlay canvas
  const redrawHighlights = useCallback((pageNum, overlayCanvas, dpr) => {
    if (!overlayCanvas) return;
    const ctx = overlayCanvas.getContext('2d');
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const pageStrokes = (highlights[bookId] && highlights[bookId][pageNum]) || [];
    if (pageStrokes.length === 0) return;

    ctx.save();

    pageStrokes.forEach((stroke) => {
      if (stroke.type === 'rect') {
        // Vẽ khối highlight chữ nhật thẳng tắp
        ctx.fillStyle = stroke.color || '#fef08a';
        ctx.globalAlpha = 0.38;
        ctx.fillRect(stroke.x, stroke.y, stroke.width, stroke.height);
      } else if (stroke.points && stroke.points.length > 0) {
        // Vẽ nét tự do
        ctx.strokeStyle = stroke.color || '#fef08a';
        ctx.fillStyle = stroke.color || '#fef08a';
        ctx.lineWidth = stroke.size || 20;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 0.4;

        ctx.beginPath();
        const first = stroke.points[0];
        ctx.moveTo(first.x, first.y);

        if (stroke.points.length === 1) {
          ctx.arc(first.x, first.y, (stroke.size || 20) / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
          }
          ctx.stroke();
        }
      }
    });

    ctx.restore();
  }, [highlights, bookId]);

  // Render khi đổi trang hoặc zoom
  useEffect(() => {
    if (pdfDoc && canvasRef1.current) {
      renderPage(currentPage, canvasRef1.current, overlayRef1.current);
    }
    if (pdfDoc && viewMode === 'spread' && canvasRef2.current && currentPage < pdfDoc.numPages) {
      renderPage(currentPage + 1, canvasRef2.current, overlayRef2.current);
    }
  }, [pdfDoc, currentPage, zoom, viewMode, renderPage]);

  // Vẽ lại highlights khi có thay đổi
  useEffect(() => {
    if (overlayRef1.current) {
      const dpr = window.devicePixelRatio || 1.5;
      redrawHighlights(currentPage, overlayRef1.current, dpr);
    }
    if (viewMode === 'spread' && overlayRef2.current && currentPage < (pdfDoc?.numPages || 166)) {
      const dpr = window.devicePixelRatio || 1.5;
      redrawHighlights(currentPage + 1, overlayRef2.current, dpr);
    }
  }, [highlights, currentPage, viewMode, pdfDoc, redrawHighlights]);

  // 3. Xử lý vẽ Highlight (Hình chữ nhật kéo thả hoặc vẽ tự do)
  const handlePointerDown = (e, pageNum, overlayCanvas) => {
    if (!isHighlighterActive || !overlayCanvas) return;
    const rect = overlayCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (highlighterMode === 'eraser') {
      const pageStrokes = (highlights[bookId] && highlights[bookId][pageNum]) || [];
      const hitStroke = pageStrokes.find(s => {
        if (s.type === 'rect') {
          return x >= s.x - 4 && x <= s.x + s.width + 4 && y >= s.y - 4 && y <= s.y + s.height + 4;
        }
        return s.points?.some(p => Math.hypot(p.x - x, p.y - y) <= (s.size || 20) + 10);
      });
      if (hitStroke) {
        removeHighlightStroke(bookId, pageNum, hitStroke.id);
      }
      return;
    }

    setIsDrawing(true);
    setStartPoint({ x, y });

    if (highlighterShape === 'freehand') {
      setCurrentStroke([{ x, y }]);
    }
  };

  const handlePointerMove = (e, pageNum, overlayCanvas) => {
    if (!isDrawing || !isHighlighterActive || highlighterMode !== 'draw' || !overlayCanvas || !startPoint) return;
    const rect = overlayCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dpr = window.devicePixelRatio || 1.5;

    if (highlighterShape === 'rect') {
      // Vẽ preview hình chữ nhật kéo thả chuẩn chỉ
      redrawHighlights(pageNum, overlayCanvas, dpr);
      const ctx = overlayCanvas.getContext('2d');
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const rx = Math.min(startPoint.x, x);
      const ry = Math.min(startPoint.y, y);
      const rw = Math.abs(x - startPoint.x);
      const rh = Math.abs(y - startPoint.y);

      // Nền highlight bán trong suốt
      ctx.fillStyle = highlighterColor;
      ctx.globalAlpha = 0.38;
      ctx.fillRect(rx, ry, rw, rh);

      // Viền nét đứt chỉ dẫn khi đang kéo
      ctx.strokeStyle = highlighterColor;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.globalAlpha = 0.9;
      ctx.strokeRect(rx, ry, rw, rh);

      ctx.restore();
    } else {
      // Vẽ tự do
      const newPoint = { x, y };
      setCurrentStroke(prev => [...prev, newPoint]);

      const ctx = overlayCanvas.getContext('2d');
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.strokeStyle = highlighterColor;
      ctx.lineWidth = highlighterSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = 0.4;

      if (currentStroke.length > 0) {
        const lastPoint = currentStroke[currentStroke.length - 1];
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      ctx.restore();
    }
  };

  const handlePointerUp = (e, pageNum, overlayCanvas) => {
    if (!isDrawing || !startPoint) {
      setIsDrawing(false);
      setStartPoint(null);
      setCurrentStroke([]);
      return;
    }

    if (highlighterShape === 'rect' && overlayCanvas) {
      const rect = overlayCanvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const rx = Math.min(startPoint.x, x);
      const ry = Math.min(startPoint.y, y);
      const rw = Math.abs(x - startPoint.x);
      const rh = Math.abs(y - startPoint.y);

      // Lưu nếu khung có kích thước tối thiểu
      if (rw > 5 && rh > 4) {
        const strokeData = {
          id: `rect_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          type: 'rect',
          color: highlighterColor,
          x: rx,
          y: ry,
          width: rw,
          height: rh
        };
        addHighlightStroke(bookId, pageNum, strokeData);
      }
    } else if (highlighterShape === 'freehand' && currentStroke.length > 0) {
      const strokeData = {
        id: `strk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        type: 'freehand',
        color: highlighterColor,
        size: highlighterSize,
        points: currentStroke
      };
      addHighlightStroke(bookId, pageNum, strokeData);
    }

    setIsDrawing(false);
    setStartPoint(null);
    setCurrentStroke([]);

    const dpr = window.devicePixelRatio || 1.5;
    if (overlayCanvas) {
      redrawHighlights(pageNum, overlayCanvas, dpr);
    }
  };

  // 4. Phím tắt bàn phím & Chống sao chép
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        if (currentPage > 1) {
          setCurrentPage(viewMode === 'spread' ? Math.max(1, currentPage - 2) : currentPage - 1);
        }
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        const total = pdfDoc?.numPages || 166;
        if (currentPage < total) {
          setCurrentPage(viewMode === 'spread' ? Math.min(total, currentPage + 2) : currentPage + 1);
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'u' || e.key === 's' || e.key === 'p')) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, pdfDoc, viewMode, setCurrentPage]);

  return (
    <div
      ref={containerRef}
      onContextMenu={(e) => e.preventDefault()}
      className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-8 flex flex-col items-center select-none relative bg-[#121212] custom-scrollbar"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center my-auto py-24 text-zinc-300 gap-3">
          <span className="w-10 h-10 border-4 border-[#006953] border-t-transparent rounded-full animate-spin" />
          <p className="font-semibold text-sm">Đang nạp tệp sách điện tử...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="my-auto p-6 bg-red-950/60 border border-red-800 rounded-2xl text-white max-w-md text-center shadow-2xl">
          <span className="material-symbols-outlined text-4xl text-red-400 mb-2">error</span>
          <p className="font-bold text-sm mb-1">{error}</p>
        </div>
      )}

      {/* Main PDF Page Display with Shadow & Clean Margins */}
      {!loading && !error && (
        <div className="flex items-start justify-center gap-6 max-w-full my-2">
          {/* Page 1 Canvas Container */}
          <div className="relative shadow-2xl rounded-sm overflow-hidden bg-white shrink-0">
            <canvas ref={canvasRef1} className="block shadow-md max-w-full" />

            {/* Highlighter Overlay Canvas */}
            <canvas
              ref={overlayRef1}
              onPointerDown={(e) => handlePointerDown(e, currentPage, overlayRef1.current)}
              onPointerMove={(e) => handlePointerMove(e, currentPage, overlayRef1.current)}
              onPointerUp={(e) => handlePointerUp(e, currentPage, overlayRef1.current)}
              onPointerLeave={(e) => handlePointerUp(e, currentPage, overlayRef1.current)}
              className={`absolute inset-0 z-20 ${
                isHighlighterActive
                  ? highlighterMode === 'eraser'
                    ? 'cursor-pointer'
                    : 'cursor-crosshair'
                  : 'pointer-events-none'
              }`}
            />

            {/* Watermark DRM Layer */}
            <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center overflow-hidden opacity-15">
              <div className="transform -rotate-25 text-xs font-mono font-bold tracking-widest text-[#ac2c19] whitespace-nowrap select-none">
                {bookTitle} • HUKI DRM PROTECTED • BẢN XEM TRỰC TUYẾN
              </div>
            </div>
          </div>

          {/* Page 2 Canvas Container (Spread Mode) */}
          {viewMode === 'spread' && currentPage < (pdfDoc?.numPages || 166) && (
            <div className="relative shadow-2xl rounded-sm overflow-hidden bg-white shrink-0 hidden md:block">
              <canvas ref={canvasRef2} className="block shadow-md max-w-full" />

              {/* Highlighter Overlay Canvas */}
              <canvas
                ref={overlayRef2}
                onPointerDown={(e) => handlePointerDown(e, currentPage + 1, overlayRef2.current)}
                onPointerMove={(e) => handlePointerMove(e, currentPage + 1, overlayRef2.current)}
                onPointerUp={(e) => handlePointerUp(e, currentPage + 1, overlayRef2.current)}
                onPointerLeave={(e) => handlePointerUp(e, currentPage + 1, overlayRef2.current)}
                className={`absolute inset-0 z-20 ${
                  isHighlighterActive
                    ? highlighterMode === 'eraser'
                      ? 'cursor-pointer'
                      : 'cursor-crosshair'
                    : 'pointer-events-none'
                }`}
              />

              {/* Watermark DRM Layer */}
              <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center overflow-hidden opacity-15">
                <div className="transform -rotate-25 text-xs font-mono font-bold tracking-widest text-[#ac2c19] whitespace-nowrap select-none">
                  {bookTitle} • HUKI DRM PROTECTED • BẢN XEM TRỰC TUYẾN
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
