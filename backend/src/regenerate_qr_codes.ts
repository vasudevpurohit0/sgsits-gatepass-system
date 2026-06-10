import { PrismaClient } from '@prisma/client';
import QRCode from 'qrcode';
import { minioClient } from './config/minio';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function run() {
  const passes = await prisma.pass.findMany({
    where: {
      qrToken: { not: null }
    }
  });

  console.log(`Found ${passes.length} passes with QR tokens to regenerate...`);

  const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:5173';
  const bucket = process.env.MINIO_BUCKET || 'gatepass-assets';

  for (const pass of passes) {
    if (!pass.qrToken) continue;
    const qrCodeUrl = `${frontendUrl}/terminal?token=${encodeURIComponent(pass.qrToken)}`;
    
    console.log(`Regenerating QR code for pass ${pass.passNumber} pointing to: ${qrCodeUrl}`);

    const qrImageBuffer = await QRCode.toBuffer(qrCodeUrl, {
      type: 'png',
      margin: 1,
      width: 300,
    });

    const objectName = `qr-passes/${pass.id}.png`;
    const metaData = {
      'Content-Type': 'image/png',
    };

    await minioClient.putObject(bucket, objectName, qrImageBuffer, qrImageBuffer.length, metaData);
    console.log(`Uploaded updated QR to MinIO: ${objectName}`);
  }

  console.log('Regeneration complete!');
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
