// File Parser Service
// Handles PDF, images (OCR), Excel, CSV files

import * as XLSX from 'xlsx';

// ============================================================
// PDF PARSING
// ============================================================
export async function parsePDF(file) {
  try {
    // Dynamic import for PDF.js
    const pdfjsLib = await import('pdfjs-dist');
    
    // Set worker source
    pdfjsLib.GlobalWorkerOptions.workerSrc = 
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js';
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    const pageTexts = [];
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ');
      pageTexts.push(pageText);
      fullText += pageText + '\n\n';
    }
    
    return {
      success: true,
      text: fullText,
      pages: pageTexts,
      pageCount: pdf.numPages,
      type: 'pdf'
    };
  } catch (error) {
    console.error('PDF parsing error:', error);
    return {
      success: false,
      error: error.message,
      type: 'pdf'
    };
  }
}

// ============================================================
// IMAGE OCR
// ============================================================
export async function parseImage(file, onProgress) {
  try {
    const Tesseract = await import('tesseract.js');
    
    const result = await Tesseract.recognize(file, 'eng', {
      logger: m => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(Math.round(m.progress * 100));
        }
      }
    });
    
    return {
      success: true,
      text: result.data.text,
      confidence: result.data.confidence,
      type: 'image'
    };
  } catch (error) {
    console.error('Image OCR error:', error);
    return {
      success: false,
      error: error.message,
      type: 'image'
    };
  }
}

// ============================================================
// EXCEL/CSV PARSING
// ============================================================
export async function parseSpreadsheet(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    let fullText = '';
    const sheets = {};
    
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const textData = XLSX.utils.sheet_to_txt(worksheet);
      
      sheets[sheetName] = {
        data: jsonData,
        text: textData
      };
      
      fullText += `=== ${sheetName} ===\n${textData}\n\n`;
    });
    
    return {
      success: true,
      text: fullText,
      sheets,
      sheetNames: workbook.SheetNames,
      type: 'spreadsheet'
    };
  } catch (error) {
    console.error('Spreadsheet parsing error:', error);
    return {
      success: false,
      error: error.message,
      type: 'spreadsheet'
    };
  }
}

// ============================================================
// TEXT FILE PARSING
// ============================================================
export async function parseTextFile(file) {
  try {
    const text = await file.text();
    return {
      success: true,
      text,
      type: 'text'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      type: 'text'
    };
  }
}

// ============================================================
// MAIN FILE HANDLER
// ============================================================
export async function parseFile(file, onProgress) {
  const fileName = file.name.toLowerCase();
  const fileType = file.type;
  
  // Determine file type and parse accordingly
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return await parsePDF(file);
  }
  
  if (fileType.startsWith('image/') || 
      ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff'].some(ext => fileName.endsWith(ext))) {
    return await parseImage(file, onProgress);
  }
  
  if (fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      fileType === 'application/vnd.ms-excel' ||
      fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
    return await parseSpreadsheet(file);
  }
  
  if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
    return await parseTextFile(file);
  }
  
  // Try as text fallback
  try {
    return await parseTextFile(file);
  } catch {
    return {
      success: false,
      error: 'Unsupported file type',
      type: 'unknown'
    };
  }
}

// ============================================================
// PARSE MULTIPLE FILES
// ============================================================
export async function parseMultipleFiles(files, onProgress) {
  const results = [];
  let completedFiles = 0;
  
  for (const file of files) {
    const result = await parseFile(file, (progress) => {
      if (onProgress) {
        const overallProgress = ((completedFiles + progress / 100) / files.length) * 100;
        onProgress(Math.round(overallProgress), file.name);
      }
    });
    
    results.push({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      ...result
    });
    
    completedFiles++;
    if (onProgress) {
      onProgress(Math.round((completedFiles / files.length) * 100), file.name);
    }
  }
  
  // Combine all text
  const combinedText = results
    .filter(r => r.success && r.text)
    .map(r => `--- ${r.fileName} ---\n${r.text}`)
    .join('\n\n');
  
  return {
    results,
    combinedText,
    successCount: results.filter(r => r.success).length,
    failCount: results.filter(r => !r.success).length
  };
}
