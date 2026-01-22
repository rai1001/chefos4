import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

export class PreparationLabelService {
    async generateLabels(params: {
        batchId: string;
        preparationName: string;
        lotCode: string;
        expiryDate?: string | null;
        producedAt: string;
        labelCount: number;
    }) {
        const doc = new PDFDocument({ size: 'A4', margin: 20 });
        const buffers: Buffer[] = [];

        doc.on('data', (chunk) => buffers.push(chunk));

        const qrDataUrl = await QRCode.toDataURL(`prep_batch:${params.batchId}`);
        const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

        const mm = (value: number) => value * 2.83465;
        const margin = mm(10);
        const labelWidth = mm(70);
        const labelHeight = mm(35);
        const columns = 2;
        const rows = Math.floor((doc.page.height - margin * 2) / labelHeight);
        const labelsPerPage = columns * rows;

        for (let index = 0; index < params.labelCount; index += 1) {
            if (index > 0 && index % labelsPerPage === 0) {
                doc.addPage();
            }

            const position = index % labelsPerPage;
            const row = Math.floor(position / columns);
            const column = position % columns;
            const x = margin + column * labelWidth;
            const y = margin + row * labelHeight;

            doc.rect(x, y, labelWidth, labelHeight).stroke();
            doc.fontSize(10).text(params.preparationName, x + 6, y + 4, {
                width: labelWidth - 12,
                ellipsis: true,
            });
            doc.fontSize(8).text(`Lote: ${params.lotCode}`, x + 6, y + 18);
            doc.fontSize(8).text(`Caducidad: ${params.expiryDate || 'N/D'}`, x + 6, y + 28);
            doc.fontSize(8).text(`Prod: ${params.producedAt}`, x + 6, y + 38);

            const qrSize = mm(16);
            doc.image(qrBuffer, x + labelWidth - qrSize - 6, y + 6, {
                width: qrSize,
                height: qrSize,
            });
        }

        doc.end();

        return new Promise<Buffer>((resolve, reject) => {
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', (error) => reject(error));
        });
    }
}
