const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

// Load env variables
dotenv.config();

const { PdfService } = require('./dist/services/pdf.service');

async function main() {
  console.log('Starting SMTP Direct Test from backend folder...');
  console.log('EMAIL_USER:', process.env.EMAIL_USER);
  console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '********' : 'undefined');

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('Error: EMAIL_USER and EMAIL_PASS must be defined in the env');
    process.exit(1);
  }

  // 1. Generate dummy QR code buffer
  const dummyQrToken = 'http://localhost:5173/terminal?token=dummy-token-verification';
  const qrBuffer = await QRCode.toBuffer(dummyQrToken, {
    type: 'png',
    margin: 1,
    width: 300,
  });

  // 2. Setup mock pass details
  const mockPass = {
    passNumber: 'GP-2026-131186',
    passType: 'VISITOR',
    purpose: 'Academic Discussion',
    validFrom: new Date(),
    validTo: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours validity
    allowedGates: ['Main Gate'],
    createdByName: 'Prof. Sharma',
    creatorDept: 'Computer Engineering',
    comingFrom: 'SGSITS Campus Office',
    visitor: {
      name: 'Vasudev Purohit',
      phone: '+919999988888',
      category: 'GENERAL',
    }
  };

  const pdfService = new PdfService();
  let pdfBuffer;
  try {
    pdfBuffer = await pdfService.generatePassPdf(mockPass, qrBuffer);
    console.log('✅ Generated PDF pass. Size:', pdfBuffer.length);
  } catch (err) {
    console.error('❌ PDF Generation failed:', err);
    process.exit(1);
  }

  // 3. Create mailer transport
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // TLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // 4. Send email
  const recipient = 'vasudevpurohit001@gmail.com';
  const subject = 'SGSITS Visitor Pass Approved';
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 25px; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 8px; line-height: 1.6; color: #334155;">
      <p>Dear ${mockPass.visitor.name},</p>
      <p>Your visitor pass has been approved.</p>
      <p><strong>Pass Number:</strong> ${mockPass.passNumber}</p>
      <p>Your visitor pass PDF is attached to this email.</p>
      <p>Please download the PDF and present it at the SGSITS Entry/Exit Gate during your visit.</p>
      <br/>
      <p>Regards,<br/>SGSITS Security Team</p>
    </div>
  `;

  try {
    console.log(`Sending email to ${recipient}...`);
    const info = await transporter.sendMail({
      from: `"SGSITS Security Team" <${process.env.EMAIL_USER}>`,
      to: recipient,
      subject,
      html,
      attachments: [
        {
          filename: `SGSITS-Visitor-Pass-${mockPass.passNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        }
      ]
    });
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
  } catch (err) {
    console.error('❌ Failed to send SMTP email:', err);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
