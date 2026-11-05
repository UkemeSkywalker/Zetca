/**
 * A carousel as a PDF, one slide per page: what LinkedIn shows as a
 * swipeable document post. Each page is just a JPEG drawn edge to edge, so
 * the file is written by hand instead of pulling in a PDF library.
 */

import sharp from 'sharp';

export interface PdfPage {
  /** Baseline JPEG bytes in RGB */
  jpeg: Buffer;
  width: number;
  height: number;
}

/** Slide images (PNG or JPEG) as RGB JPEG pages of the same width */
export async function slidesToPages(images: Buffer[], width = 1080): Promise<PdfPage[]> {
  return Promise.all(
    images.map(async (img) => {
      const { data, info } = await sharp(img)
        .resize({ width, withoutEnlargement: false })
        .flatten({ background: '#ffffff' })
        .toColourspace('srgb')
        .jpeg({ quality: 88, progressive: false, chromaSubsampling: '4:4:4' })
        .toBuffer({ resolveWithObject: true });
      return { jpeg: data, width: info.width, height: info.height };
    })
  );
}

/** A PDF with each JPEG filling its own page (pages sized 0.75pt per pixel, i.e. 96 dpi) */
export function pagesToPdf(pages: PdfPage[]): Buffer {
  if (!pages.length) throw new Error('A PDF needs at least one page');
  const parts: Buffer[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (b: Buffer | string) => {
    const buf = typeof b === 'string' ? Buffer.from(b, 'latin1') : b;
    parts.push(buf);
    length += buf.length;
  };
  const object = (n: number, body: (string | Buffer)[]) => {
    offsets[n] = length;
    push(`${n} 0 obj\n`);
    for (const b of body) push(b);
    push('\nendobj\n');
  };

  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  // 1: catalog, 2: page tree, then 3 objects a page: page, contents, image
  const pageRef = (i: number) => 3 + i * 3;
  object(1, ['<< /Type /Catalog /Pages 2 0 R >>']);
  object(2, [`<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_, i) => `${pageRef(i)} 0 R`).join(' ')}] >>`]);
  pages.forEach((p, i) => {
    const w = +(p.width * 0.75).toFixed(2);
    const h = +(p.height * 0.75).toFixed(2);
    const [page, contents, image] = [pageRef(i), pageRef(i) + 1, pageRef(i) + 2];
    object(page, [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 ${image} 0 R >> >> /Contents ${contents} 0 R >>`]);
    const draw = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`;
    object(contents, [`<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`]);
    object(image, [
      `<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`,
      p.jpeg,
      '\nendstream',
    ]);
  });

  const count = 3 + pages.length * 3;
  const xref = length;
  push(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let n = 1; n < count; n++) push(`${String(offsets[n]).padStart(10, '0')} 00000 n \n`);
  push(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return Buffer.concat(parts);
}
