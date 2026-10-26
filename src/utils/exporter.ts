import JSZip from 'jszip';
import { CardData, ExportResolution } from '../types/deck';

/**
 * Loads an image from URL into an HTMLImageElement
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Downloads a single card at 1x, 2x, or 4x high resolution
 */
export async function downloadCardImage(
  card: CardData,
  resolution: ExportResolution = '2x',
  useFullArt: boolean = false
): Promise<void> {
  let src = `/assets/deck/${card.file}`;
  if (useFullArt && card.type === 'ace') {
    // If user wants original full 1600x1600 illustration
    const suitOrigMap: Record<string, string> = {
      S: '/assets/aistudio/image_ae13c770.png',
      H: '/assets/aistudio/image_0c8e9bfb.png',
      D: '/assets/aistudio/image_61f2e7ae.png',
      C: '/assets/aistudio/image_c33aaf53.png'
    };
    if (suitOrigMap[card.suitCode]) {
      src = suitOrigMap[card.suitCode];
    }
  }

  const img = await loadImage(src);

  let scale = 1;
  if (resolution === '2x') scale = 2;
  if (resolution === '4x') scale = 4;

  const width = img.naturalWidth * scale;
  const height = img.naturalHeight * scale;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Crucial: Nearest-neighbor rendering to preserve razor-sharp pixel art
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, width, height);

  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  const safeName = card.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  link.download = `${card.code}_${safeName}_${resolution}_res.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Downloads the card back at chosen resolution
 */
export async function downloadCardBack(resolution: ExportResolution = '2x'): Promise<void> {
  const img = await loadImage('/assets/deck/BACK.png');

  let scale = 1;
  if (resolution === '2x') scale = 2;
  if (resolution === '4x') scale = 4;

  const width = img.naturalWidth * scale;
  const height = img.naturalHeight * scale;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, width, height);

  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `Verso_Baralho_Olimpo_${resolution}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports multiple cards (or entire custom deck) as a compressed ZIP file
 */
export async function exportDeckAsZip(
  deckName: string,
  cards: { card: CardData; count: number }[],
  resolution: ExportResolution = '2x',
  onProgress?: (progress: number, status: string) => void
): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder(deckName.replace(/[^a-zA-Z0-9_-]/g, '_')) || zip;

  let scale = 1;
  if (resolution === '2x') scale = 2;
  if (resolution === '4x') scale = 4;

  // Also include the card back
  try {
    const backImg = await loadImage('/assets/deck/BACK.png');
    const bCanvas = document.createElement('canvas');
    bCanvas.width = backImg.naturalWidth * scale;
    bCanvas.height = backImg.naturalHeight * scale;
    const bCtx = bCanvas.getContext('2d');
    if (bCtx) {
      bCtx.imageSmoothingEnabled = false;
      bCtx.drawImage(backImg, 0, 0, bCanvas.width, bCanvas.height);
      const bBlob = await new Promise<Blob | null>((res) => bCanvas.toBlob(res, 'image/png'));
      if (bBlob) folder.file('00_VERSO_CARTA.png', bBlob);
    }
  } catch (e) {
    console.error('Error adding back to zip', e);
  }

  const total = cards.length;
  for (let i = 0; i < total; i++) {
    const { card, count } = cards[i];
    if (onProgress) {
      onProgress(Math.round(((i + 1) / total) * 90), `Processando ${card.name}...`);
    }

    try {
      const img = await loadImage(`/assets/deck/${card.file}`);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth * scale;
      canvas.height = img.naturalHeight * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
        if (blob) {
          const fileName = `${card.code}_${card.name.replace(/[^a-zA-Z0-9_-]/g, '_')}${count > 1 ? `_x${count}` : ''}.png`;
          folder.file(fileName, blob);
        }
      }
    } catch (err) {
      console.error(`Failed to load ${card.file}`, err);
    }
  }

  // Add metadata manifest
  const manifest = {
    deckTitle: deckName,
    exportedAt: new Date().toISOString(),
    resolution: resolution,
    totalCards: cards.reduce((acc, c) => acc + c.count, 0),
    cardsList: cards.map((c) => ({
      code: c.card.code,
      name: c.card.name,
      suit: c.card.suit,
      rank: c.card.rank,
      character: c.card.character,
      count: c.count
    }))
  };
  folder.file('manifest.json', JSON.stringify(manifest, null, 2));

  if (onProgress) onProgress(95, 'Compactando arquivo ZIP...');

  const content = await zip.generateAsync({ type: 'blob' }, (metadata) => {
    if (onProgress) onProgress(95 + Math.round(metadata.percent * 0.05), 'Compactando...');
  });

  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${deckName.replace(/\s+/g, '_')}_${resolution}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  if (onProgress) onProgress(100, 'Download concluído!');
}

/**
 * Generates an A4 Printable Sheet (3x3 grid = 9 cards per sheet)
 */
export async function downloadPrintSheet(
  cards: CardData[],
  pageNumber: number = 1
): Promise<void> {
  const pageSize = 9;
  const pageCards = cards.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
  if (pageCards.length === 0) return;

  // A4 at 300 DPI: 2480 x 3508 px
  const pageWidth = 2480;
  const pageHeight = 3508;
  const canvas = document.createElement('canvas');
  canvas.width = pageWidth;
  canvas.height = pageHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Dark or white print background - print standard is pure white or parchment
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, pageWidth, pageHeight);

  // 3 columns, 3 rows
  const marginX = 140;
  const marginY = 160;
  const gapX = 40;
  const gapY = 50;

  const cardW = Math.floor((pageWidth - marginX * 2 - gapX * 2) / 3); // ~680px
  const cardH = Math.floor(cardW * (1120 / 640)); // ~1190px

  // Draw Header info on print sheet
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText('Baralho dos Deuses Sombrios - Folha de Impressão A4 (Corte 3x3)', marginX, 90);
  ctx.font = '24px sans-serif';
  ctx.fillStyle = '#6b7280';
  ctx.fillText(`Página ${pageNumber} de ${Math.ceil(cards.length / pageSize)} • Cartas ${ (pageNumber - 1) * pageSize + 1 } a ${Math.min(pageNumber * pageSize, cards.length)}`, marginX, 130);

  ctx.imageSmoothingEnabled = false;

  for (let idx = 0; idx < pageCards.length; idx++) {
    const card = pageCards[idx];
    const col = idx % 3;
    const row = Math.floor(idx / 3);

    const x = marginX + col * (cardW + gapX);
    const y = marginY + row * (cardH + gapY);

    try {
      const img = await loadImage(`/assets/deck/${card.file}`);
      ctx.drawImage(img, x, y, cardW, cardH);

      // Draw dashed cutting crop marks
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 2, y - 2, cardW + 4, cardH + 4);
    } catch (e) {
      console.error('Print sheet draw error', e);
    }
  }

  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `Folha_Impressao_A4_Pagina_${pageNumber}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
