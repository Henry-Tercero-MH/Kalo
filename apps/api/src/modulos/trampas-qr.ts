/**
 * PDF imprimible con los códigos QR de las trampas de picudo.
 */
import { MARCA_DEMO } from '@kalo/shared';
import { and, asc, eq, isNull } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import type { Ejecutor } from '../db/cliente';
import { lotes, trampas } from '../db/esquema';

export async function generarPdfTrampas(db: Ejecutor, fincaId: string): Promise<Buffer> {
  const filas = await db
    .select({ codigo: trampas.codigo_qr, nombre: trampas.nombre, lote: lotes.codigo })
    .from(trampas)
    .innerJoin(lotes, eq(lotes.id, trampas.lote_id))
    .where(and(eq(trampas.finca_id, fincaId), isNull(trampas.deleted_at)))
    .orderBy(asc(trampas.codigo_qr));

  const doc = new PDFDocument({ size: 'LETTER', margin: 36 });
  const partes: Buffer[] = [];
  doc.on('data', (b: Buffer) => partes.push(b));
  const fin = new Promise<Buffer>((ok) => doc.on('end', () => ok(Buffer.concat(partes))));

  doc.font('Helvetica-Bold').fontSize(16).text('INVERSIONES KALO — TRAMPAS DE PICUDO');
  doc.moveTo(36, doc.y + 4).lineTo(576, doc.y + 4).lineWidth(2).stroke('#000000');
  doc.moveDown(0.6).font('Helvetica').fontSize(9).fillColor('#6f6a62').text(`Códigos ${MARCA_DEMO} — datos ficticios`);

  const ancho = 170;
  const alto = 200;
  let x = 36;
  let y = doc.y + 12;
  for (const t of filas) {
    if (y + alto > 756) {
      doc.addPage();
      x = 36;
      y = 36;
    }
    const png = await QRCode.toBuffer(t.codigo, { margin: 1, width: 300, errorCorrectionLevel: 'M' });
    doc.rect(x, y, ancho, alto).lineWidth(1).stroke('#e2ded7');
    doc.image(png, x + 20, y + 10, { width: ancho - 40 });
    doc.fillColor('#141311').font('Helvetica-Bold').fontSize(11).text(t.codigo.replace('KALO-TRAMPA:', ''), x, y + 150, { width: ancho, align: 'center' });
    doc.font('Helvetica').fontSize(9).fillColor('#3a3733').text(`${t.nombre} · Lote ${t.lote}`, x, y + 168, { width: ancho, align: 'center' });
    x += ancho + 10;
    if (x + ancho > 576) {
      x = 36;
      y += alto + 10;
    }
  }
  doc.end();
  return fin;
}

export default async function rutasTrampasQr(app: FastifyInstance) {
  app.get(
    '/qr.pdf',
    { preHandler: app.requiere('trampas:ver'), schema: { tags: ['trampas'], summary: 'PDF con QR imprimibles de las trampas' } },
    async (req, reply) => {
      const pdf = await generarPdfTrampas(app.db, req.usuario!.fincaId);
      return reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', 'inline; filename="trampas-qr-DEMO.pdf"')
        .send(pdf);
    },
  );
}
