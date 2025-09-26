import pdfParse from 'pdf-parse';
import { createWorker } from 'tesseract.js';
// Use require for pdf-poppler to bypass module resolution issues
const { poppler } = require('pdf-poppler'); 
import path from 'path';
import fs from 'fs';

/**
 * Extracts text from a PDF buffer using a hybrid approach.
 * It first tries standard text extraction. If that fails, it converts the
 * PDF to images and uses Tesseract.js OCR.
 * @param {Buffer} buffer - The PDF file buffer.
 * @returns {Promise<string>} - The extracted text content.
 */
export const extractTextFromPdf = async (buffer: Buffer): Promise<string> => {
  try {
    // Attempt 1: Fast standard text extraction
    const data = await pdfParse(buffer);
    if (data.text && data.text.trim().length > 10) {
      console.log('✅ Extracted text using standard parser.');
      return data.text;
    }

    // Attempt 2: Fallback to OCR
    console.log('Standard parsing failed, attempting OCR...');
    
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    const tempPdfPath = path.join(tempDir, `temp_pdf_${Date.now()}.pdf`);
    fs.writeFileSync(tempPdfPath, buffer);

    const options = {
      format: 'png',
      out_dir: tempDir,
      out_prefix: path.basename(tempPdfPath, path.extname(tempPdfPath)),
      page: null
    };

    await poppler.pdfToCairo(tempPdfPath, options);
    
    const imageFiles = fs.readdirSync(tempDir).filter(file => file.startsWith(options.out_prefix) && file.endsWith('.png'));
    
    const worker = await createWorker('eng');
    let fullText = '';
    
    for (const imageFile of imageFiles) {
      const imagePath = path.join(tempDir, imageFile);
      const { data: { text } } = await worker.recognize(imagePath);
      fullText += text + '\n';
    }
    
    await worker.terminate();

    // Clean up temporary files
    fs.unlinkSync(tempPdfPath);
    for (const imageFile of imageFiles) {
      fs.unlinkSync(path.join(tempDir, imageFile));
    }
    
    console.log('✅ Extracted text using Tesseract.js OCR.');
    return fullText;

  } catch (error) {
    console.error('❌ Error during text extraction:', error);
    const tempDir = path.join(__dirname, 'temp');
    if (fs.existsSync(tempDir)) {
      fs.readdirSync(tempDir).forEach(file => fs.unlinkSync(path.join(tempDir, file)));
    }
    throw new Error('Failed to extract text from PDF.');
  }
};