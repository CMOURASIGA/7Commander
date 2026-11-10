/**
 * Client-side PDF export for Commander reports.
 *
 * Uses the HTML document that was already rendered and authorized. No report
 * content is sent to a third-party conversion service. Each A4 page is drawn
 * from a high-resolution rendering of the report and downloaded directly.
 */
const encoder = new TextEncoder();
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MARGIN = 30;

function ascii(value: string): Uint8Array {
  return encoder.encode(value);
}

function jpegBytes(dataUrl: string): Uint8Array {
  const encoded = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const binary = atob(encoded);
  const result = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) result[index] = binary.charCodeAt(index);
  return result;
}

type PdfPageImage = { image: Uint8Array; width: number; height: number; physicalHeight: number };

function assemblePdf(pages: PdfPageImage[]): Blob {
  const count = 3 + pages.length * 3;
  const fontId = count;
  const offsets = new Array<number>(count + 1).fill(0);
  const chunks: Uint8Array[] = [];
  let length = 0;
  const push = (part: Uint8Array) => { chunks.push(part); length += part.length; };
  const object = (id: number, body: Uint8Array) => {
    offsets[id] = length;
    push(ascii(id + " 0 obj\n"));
    push(body);
    push(ascii("\nendobj\n"));
  };
  push(ascii("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n"));
  object(1, ascii("<< /Type /Catalog /Pages 2 0 R >>"));
  const kids = pages.map((_, i) => (3 + i * 3) + " 0 R").join(" ");
  object(2, ascii("<< /Type /Pages /Kids [" + kids + "] /Count " + pages.length + " >>"));
  for (const [index, page] of pages.entries()) {
    const id = 3 + index * 3;
    const imageId = id + 1;
    const contentsId = id + 2;
    object(id, ascii("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + A4_WIDTH + " " + A4_HEIGHT +
      "] /Resources << /XObject << /ReportImage " + imageId + " 0 R >> /Font << /F1 " + fontId + " 0 R >> >> /Contents " + contentsId + " 0 R >>"));
    const header = ascii("<< /Type /XObject /Subtype /Image /Width " + page.width +
      " /Height " + page.height + " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " +
      page.image.length + " >>\nstream\n");
    const imageObject = new Uint8Array(header.length + page.image.length + 11);
    imageObject.set(header);
    imageObject.set(page.image, header.length);
    imageObject.set(ascii("\nendstream"), header.length + page.image.length);
    object(imageId, imageObject.subarray(0, header.length + page.image.length + 10));
    const drawnWidth = A4_WIDTH - MARGIN * 2;
    const drawnHeight = page.physicalHeight;
    const bottom = A4_HEIGHT - MARGIN - drawnHeight;
    const command = ascii("q\n" + drawnWidth.toFixed(3) + " 0 0 " + drawnHeight.toFixed(3) +
      " " + MARGIN + " " + bottom.toFixed(3) + " cm\n/ReportImage Do\nQ\n" +
      "BT /F1 9 Tf 470 13 Td (Pagina " + (index + 1) + " de " + pages.length + ") Tj ET");
    object(contentsId, ascii("<< /Length " + command.length + " >>\nstream\n" +
      new TextDecoder().decode(command) + "\nendstream"));
  }
  object(fontId, ascii("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"));
  const startxref = length;
  push(ascii("xref\n0 " + (count + 1) + "\n0000000000 65535 f \n"));
  for (let id = 1; id <= count; id++) push(ascii(String(offsets[id]).padStart(10, "0") + " 00000 n \n"));
  push(ascii("trailer\n<< /Size " + (count + 1) + " /Root 1 0 R >>\nstartxref\n" + startxref + "\n%%EOF"));
  return new Blob(chunks as BlobPart[], { type: "application/pdf" });
}

async function renderReport(html: string): Promise<{ canvas: HTMLCanvasElement; boundaries: number[] }> {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;left:0;top:0;width:760px;height:1200px;border:0;opacity:0;pointer-events:none;z-index:-1";
  document.body.appendChild(frame);
  try {
    const frameDoc = frame.contentDocument;
    if (!frameDoc) throw new Error("Não foi possível preparar o relatório.");
    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();
    await Promise.all(Array.from(frameDoc.images).map(image =>
      image.complete ? Promise.resolve() : new Promise<void>(resolve => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
      })
    ));
    await frameDoc.fonts.ready;
    frameDoc.querySelectorAll(".actions").forEach(element => element.remove());
    const main = frameDoc.querySelector<HTMLElement>(".wrap");
    if (!main) throw new Error("Estrutura do relatório não encontrada.");
    const height = Math.ceil(main.getBoundingClientRect().height + 4);
    if (height < 1 || height > 14000) throw new Error("O relatório excedeu o tamanho permitido para exportação.");
    frame.style.height = height + "px";
    const breakCandidates = Array.from(main.querySelectorAll<HTMLElement>(".panel, .hero, .risk-legend, .report-table tr, .risk-matrix tr, .item, .metric, .risk-summary, .foot"));
    const mainTop = main.getBoundingClientRect().top;
    const boundaries = Array.from(new Set(breakCandidates.map(child => Math.max(0, Math.round(child.getBoundingClientRect().top - mainTop)))
      .filter(n => n > 0 && n < height))).sort((a,b)=>a-b);
    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(main, {
      backgroundColor: "#ffffff",
      scale: 1.7,
      useCORS: false,
      allowTaint: false,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: 760,
      windowHeight: height,
    });
    if (canvas.width < 1 || canvas.height < 1) throw new Error("Não foi possível capturar o conteúdo do relatório.");
    // Canvas pixels can be read only if all document images remain same-origin/data URIs.
    try { canvas.toDataURL("image/jpeg", 0.8); }
    catch { throw new Error("Não foi possível incorporar a logo ao PDF. Verifique a imagem da empresa."); }
    return { canvas, boundaries };
  } finally {
    frame.remove();
  }
}

/** Create and download an actual PDF file, with no print dialog. */
export async function downloadReportPdf(html: string, filename: string): Promise<void> {
  const { canvas, boundaries } = await renderReport(html);
  const scale = canvas.width / 760;
  const heightLimit = Math.floor(canvas.width * (A4_HEIGHT - MARGIN * 2) / (A4_WIDTH - MARGIN * 2));
  const pages: PdfPageImage[] = [];
  let top = 0;
  while (top < canvas.height) {
    const maxEnd = Math.min(canvas.height, top + heightLimit);
    let end = maxEnd;
    if (maxEnd < canvas.height) {
      const breaks = boundaries.map(position => Math.floor(position * scale))
        .filter(position => position > top + heightLimit * 0.72 && position <= maxEnd - 8);
      if (breaks.length) end = breaks[breaks.length - 1];
    }
    const partHeight = end - top;
    if (partHeight <= 0) throw new Error("Não foi possível paginar o PDF.");
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = partHeight;
    const ctx = pageCanvas.getContext("2d");
    if (!ctx) throw new Error("Exportação de PDF indisponível neste navegador.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    ctx.drawImage(canvas, 0, top, canvas.width, partHeight, 0, 0, canvas.width, partHeight);
    pages.push({
      image: jpegBytes(pageCanvas.toDataURL("image/jpeg", 0.92)),
      width: pageCanvas.width,
      height: pageCanvas.height,
      physicalHeight: partHeight * (A4_WIDTH - MARGIN * 2) / canvas.width,
    });
    top = end;
  }
  const pdf = assemblePdf(pages);
  const url = URL.createObjectURL(pdf);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename.endsWith(".pdf") ? filename : filename + ".pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }
}
