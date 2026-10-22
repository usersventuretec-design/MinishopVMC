import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Convert OKLCH string to RGB/RGBA string
 * Supports: oklch(L C H), oklch(L C H / alpha), oklch(L C H / alpha%)
 */
export function oklchToRgb(oklchStr: string): string {
  try {
    const match = oklchStr.match(
      /oklch\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+)(?:deg)?(?:\s*\/\s*([\d.]+%?))?\s*\)/i
    );
    if (!match) return '#333333';

    let [, lStr, cStr, hStr, aStr] = match;

    // Lightness: 0..1 or 0%..100%
    let L = lStr.endsWith('%') ? parseFloat(lStr) / 100 : parseFloat(lStr);
    // Chroma: usually 0..0.4, or percentage
    let C = cStr.endsWith('%') ? (parseFloat(cStr) / 100) * 0.4 : parseFloat(cStr);
    // Hue: 0..360
    let H = parseFloat(hStr);

    let alpha = 1;
    if (aStr !== undefined) {
      alpha = aStr.endsWith('%') ? parseFloat(aStr) / 100 : parseFloat(aStr);
    }

    // Convert OKLCH to OKLab
    const rad = (H * Math.PI) / 180;
    const lab_a = C * Math.cos(rad);
    const lab_b = C * Math.sin(rad);

    // OKLab to LMS
    const l_ = L + 0.3963377774 * lab_a + 0.2158037573 * lab_b;
    const m_ = L - 0.1055613458 * lab_a - 0.0638541728 * lab_b;
    const s_ = L - 0.0894841775 * lab_a - 1.291485548 * lab_b;

    const l = l_ * l_ * l_;
    const m = m_ * m_ * m_;
    const s = s_ * s_ * s_;

    // LMS to linear sRGB
    const r_lin = 4.076743477 * l - 3.3077115913 * m + 0.2309699292 * s;
    const g_lin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const b_lin = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

    // Linear sRGB to standard sRGB gamma
    const gamma = (val: number) => {
      const v = Math.max(0, Math.min(1, val));
      return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
    };

    const r = Math.round(gamma(r_lin) * 255);
    const g = Math.round(gamma(g_lin) * 255);
    const b = Math.round(gamma(b_lin) * 255);

    if (alpha < 1) {
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return `rgb(${r}, ${g}, ${b})`;
  } catch {
    return '#333333';
  }
}

/**
 * Replace all oklch(...) occurrences in a string with rgb(...)
 */
function sanitizeOklch(cssText: string): string {
  if (!cssText || !cssText.includes('oklch')) return cssText;
  return cssText.replace(/oklch\([^)]+\)/gi, (match) => {
    return oklchToRgb(match);
  });
}

/**
 * Sanitize cloned document for html2canvas
 */
function sanitizeClonedDocument(clonedDoc: Document): void {
  // 1. Sanitize all <style> elements
  const styleTags = clonedDoc.querySelectorAll('style');
  styleTags.forEach((styleTag) => {
    if (styleTag.textContent && styleTag.textContent.includes('oklch')) {
      styleTag.textContent = sanitizeOklch(styleTag.textContent);
    }
  });

  // 2. Sanitize any inline styles with oklch
  const elementsWithStyle = clonedDoc.querySelectorAll('[style*="oklch"]');
  elementsWithStyle.forEach((el) => {
    const styleAttr = el.getAttribute('style');
    if (styleAttr && styleAttr.includes('oklch')) {
      el.setAttribute('style', sanitizeOklch(styleAttr));
    }
  });
}

/**
 * Render HTMLElement to canvas at strict standard A4 desktop width (794px)
 * to prevent responsive viewport compression or text clipping
 */
async function captureA4Canvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  // Ensure all Google Fonts (Sarabun, Prompt) are loaded before rasterizing canvas
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Non-fatal if font check is not supported
    }
  }

  return html2canvas(element, {
    scale: 2, // 2x sharp resolution (approx 200 DPI)
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: 1200, // Forces full desktop layout width during snapshot
    onclone: (clonedDoc, clonedElement) => {
      // Force exact A4 dimensions on the cloned element
      clonedElement.style.width = '794px';
      clonedElement.style.minWidth = '794px';
      clonedElement.style.maxWidth = '794px';
      clonedElement.style.boxSizing = 'border-box';
      clonedElement.style.margin = '0';
      clonedElement.style.transform = 'none';

      // Ensure text elements never have their ascenders or descenders clipped by overflow:hidden
      const textNodes = clonedElement.querySelectorAll<HTMLElement>('span, p, div, td, th');
      textNodes.forEach((node) => {
        if (node.classList.contains('truncate') || node.style.overflow === 'hidden') {
          node.style.overflow = 'visible';
          node.style.textOverflow = 'clip';
        }
      });

      sanitizeClonedDocument(clonedDoc);
    },
  });
}

/**
 * Convert captured canvas to jsPDF document with safe printable margins (5mm)
 * to ensure text NEVER falls off the page edges
 */
function buildA4Pdf(canvas: HTMLCanvasElement): jsPDF {
  const imgData = canvas.toDataURL('image/jpeg', 0.98);
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
  const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm

  // Safe margin of 5mm on all sides prevents non-printable area cutoff
  const marginX = 6;
  const marginY = 6;
  const maxW = pageWidth - marginX * 2; // 198mm
  const maxH = pageHeight - marginY * 2; // 285mm

  let renderW = maxW;
  let renderH = (canvas.height * renderW) / canvas.width;

  // If height slightly exceeds available height, scale down proportionally so the whole receipt fits neatly on 1 page
  if (renderH > maxH) {
    renderH = maxH;
    renderW = (canvas.width * renderH) / canvas.height;
  }

  const posX = (pageWidth - renderW) / 2;
  const posY = marginY;

  pdf.addImage(imgData, 'JPEG', posX, posY, renderW, renderH);
  return pdf;
}

export async function generateReceiptPdfBlob(element: HTMLElement): Promise<Blob> {
  const canvas = await captureA4Canvas(element);
  const pdf = buildA4Pdf(canvas);
  return pdf.output('blob');
}

export async function downloadReceiptPdf(element: HTMLElement, filename: string): Promise<void> {
  const canvas = await captureA4Canvas(element);
  const pdf = buildA4Pdf(canvas);
  pdf.save(filename);
}
