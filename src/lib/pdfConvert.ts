import { jsPDF } from "jspdf";

// Client-side only. Real conversion (not just "make *a* PDF") is only
// feasible here for formats the browser can already decode natively --
// plain text and images. Office formats (docx/xlsx/pptx) need a real
// document-layout engine, which means a paid conversion API or a server
// with LibreOffice installed -- out of scope until that's worth the cost.
export function canConvertToPdf(mimeType: string | null, name: string) {
  if (mimeType?.startsWith("image/")) return true;
  if (mimeType === "text/plain" || name.toLowerCase().endsWith(".txt")) return true;
  return false;
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function convertBlobToPdf(blob: Blob, mimeType: string | null): Promise<Blob> {
  const doc = new jsPDF();
  if (mimeType?.startsWith("image/")) {
    const dataUrl = await blobToDataURL(blob);
    const img = await loadImage(dataUrl);
    const pageWidth = doc.internal.pageSize.getWidth() - 20;
    const pageHeight = doc.internal.pageSize.getHeight() - 20;
    const ratio = Math.min(pageWidth / img.width, pageHeight / img.height);
    const w = img.width * ratio;
    const h = img.height * ratio;
    doc.addImage(dataUrl, mimeType.includes("png") ? "PNG" : "JPEG", 10, 10, w, h);
  } else {
    const text = await blob.text();
    const lines = doc.splitTextToSize(text, 180);
    doc.text(lines, 10, 15);
  }
  return doc.output("blob");
}

export function pdfNameFor(originalName: string) {
  const base = originalName.replace(/\.[^.]+$/, "");
  return `${base}.pdf`;
}
