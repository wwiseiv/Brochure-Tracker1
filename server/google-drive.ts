// Google Drive Integration for AI Coaching Enhancement
// Connection: google-drive integration

import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-drive',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Drive not connected');
  }
  return accessToken;
}

// Get a fresh Google Drive client (never cache - tokens expire)
export async function getGoogleDriveClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

// Get Google Docs client for reading document content
export async function getGoogleDocsClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.docs({ version: 'v1', auth: oauth2Client });
}

// User's specific coaching folder from Google Drive
// https://drive.google.com/drive/folders/1_QYPCqf_VX31noF7II0aCTALvz8v0_a0
const COACHING_FOLDER_ID = '1_QYPCqf_VX31noF7II0aCTALvz8v0_a0';

// Get the coaching folder ID (uses the user's specific folder)
export async function getCoachingFolderId(): Promise<string | null> {
  return COACHING_FOLDER_ID;
}

// List all documents in a folder (non-recursive)
async function listFilesInFolder(folderId: string): Promise<Array<{id: string, name: string, mimeType: string}>> {
  try {
    const drive = await getGoogleDriveClient();
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType)',
      spaces: 'drive',
      pageSize: 1000
    });

    return (response.data.files || []).map(f => ({
      id: f.id || '',
      name: f.name || '',
      mimeType: f.mimeType || ''
    }));
  } catch (error) {
    console.error('Error listing files in folder:', error);
    return [];
  }
}

// Recursively list all documents in the coaching folder and all subfolders
export async function listCoachingDocuments(): Promise<Array<{id: string, name: string, mimeType: string, path?: string}>> {
  try {
    const folderId = await getCoachingFolderId();
    if (!folderId) return [];

    const allFiles: Array<{id: string, name: string, mimeType: string, path?: string}> = [];
    
    const processFolder = async (currentFolderId: string, currentPath: string = ''): Promise<void> => {
      const files = await listFilesInFolder(currentFolderId);
      
      for (const file of files) {
        if (file.mimeType === 'application/vnd.google-apps.folder') {
          // Recursively process subfolders
          const subPath = currentPath ? `${currentPath}/${file.name}` : file.name;
          console.log(`Scanning subfolder: ${subPath}`);
          await processFolder(file.id, subPath);
        } else {
          // Add file with its path
          allFiles.push({
            ...file,
            path: currentPath
          });
        }
      }
    };

    await processFolder(folderId);
    console.log(`Found ${allFiles.length} total files in folder tree`);
    return allFiles;
  } catch (error) {
    console.error('Error listing coaching documents:', error);
    return [];
  }
}

// Read content from a Google Doc
export async function readGoogleDoc(docId: string): Promise<string> {
  try {
    const docs = await getGoogleDocsClient();
    const response = await docs.documents.get({ documentId: docId });
    
    // Extract text content from the document
    let content = '';
    const body = response.data.body?.content || [];
    
    for (const element of body) {
      if (element.paragraph?.elements) {
        for (const textElement of element.paragraph.elements) {
          if (textElement.textRun?.content) {
            content += textElement.textRun.content;
          }
        }
      }
    }
    
    return content.trim();
  } catch (error) {
    console.error('Error reading Google Doc:', error);
    return '';
  }
}

// Read content from a plain text file
export async function readTextFile(fileId: string): Promise<string> {
  try {
    const drive = await getGoogleDriveClient();
    const response = await drive.files.get({
      fileId,
      alt: 'media'
    }, { responseType: 'text' });
    
    return String(response.data);
  } catch (error) {
    console.error('Error reading text file:', error);
    return '';
  }
}

// Read content from a PDF file (exports as text)
export async function readPdfFile(fileId: string, fileName: string): Promise<string> {
  try {
    const drive = await getGoogleDriveClient();
    
    // Download the PDF file as arraybuffer
    const response = await drive.files.get({
      fileId,
      alt: 'media'
    }, { responseType: 'arraybuffer' });
    
    // Convert buffer to string and extract readable text
    const buffer = Buffer.from(response.data as ArrayBuffer);
    const text = extractTextFromPdfBuffer(buffer);
    
    if (text.trim()) {
      console.log(`Extracted ${text.length} chars from PDF: ${fileName}`);
      return text;
    }
    
    // If no text extracted, return file metadata as placeholder
    return `[PDF Document: ${fileName}]`;
  } catch (error) {
    console.error('Error reading PDF file:', error);
    return '';
  }
}

// Simple text extraction from PDF buffer
function extractTextFromPdfBuffer(buffer: Buffer): string {
  try {
    const content = buffer.toString('utf-8');
    
    // Extract text between stream markers (common PDF text location)
    const textParts: string[] = [];
    
    // Look for text in parentheses (PDF text objects)
    const parenRegex = /\(([^)]+)\)/g;
    let match;
    while ((match = parenRegex.exec(content)) !== null) {
      const text = match[1]
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '')
        .replace(/\\t/g, ' ')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\');
      
      // Filter out binary/control characters
      const cleaned = text.replace(/[^\x20-\x7E\n]/g, ' ').trim();
      if (cleaned.length > 2) {
        textParts.push(cleaned);
      }
    }
    
    // Also look for BT...ET text blocks with Tj operators
    const tjRegex = /\[([^\]]+)\]\s*TJ/g;
    while ((match = tjRegex.exec(content)) !== null) {
      const parts = match[1].split(/\(|\)/);
      for (const part of parts) {
        const cleaned = part.replace(/[^\x20-\x7E\n]/g, ' ').trim();
        if (cleaned.length > 2 && !/^[-\d\s.]+$/.test(cleaned)) {
          textParts.push(cleaned);
        }
      }
    }
    
    // Dedupe and join
    const uniqueParts = Array.from(new Set(textParts));
    return uniqueParts.join(' ').replace(/\s+/g, ' ').trim();
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return '';
  }
}

// Read Google Sheets as text
export async function readGoogleSheet(fileId: string): Promise<string> {
  try {
    const drive = await getGoogleDriveClient();
    
    // Export sheet as CSV
    const response = await drive.files.export({
      fileId,
      mimeType: 'text/csv'
    }, { responseType: 'text' });
    
    return String(response.data);
  } catch (error) {
    console.error('Error reading Google Sheet:', error);
    return '';
  }
}

// Read Google Slides as text
export async function readGoogleSlides(fileId: string): Promise<string> {
  try {
    const drive = await getGoogleDriveClient();
    
    // Export slides as plain text
    const response = await drive.files.export({
      fileId,
      mimeType: 'text/plain'
    }, { responseType: 'text' });
    
    return String(response.data);
  } catch (error) {
    console.error('Error reading Google Slides:', error);
    return '';
  }
}

// Read Word document (.docx) as text
async function readWordDocument(fileId: string): Promise<string> {
  try {
    const drive = await getGoogleDriveClient();
    
    // Download the file content
    const response = await drive.files.get({
      fileId,
      alt: 'media'
    }, { responseType: 'arraybuffer' });
    
    const buffer = Buffer.from(response.data as ArrayBuffer);
    
    // Extract text from docx (simplified - looks for text in XML)
    const content = buffer.toString('utf-8');
    const textParts: string[] = [];
    
    // Look for text between XML tags (docx is a zip of XML files)
    const textRegex = /<w:t[^>]*>([^<]+)<\/w:t>/g;
    let match;
    while ((match = textRegex.exec(content)) !== null) {
      textParts.push(match[1]);
    }
    
    return textParts.join(' ').replace(/\s+/g, ' ').trim();
  } catch (error) {
    console.error('Error reading Word document:', error);
    return '';
  }
}

// Read PowerPoint (.pptx) as text
async function readPowerPoint(fileId: string): Promise<string> {
  try {
    const drive = await getGoogleDriveClient();
    
    // Download the file content
    const response = await drive.files.get({
      fileId,
      alt: 'media'
    }, { responseType: 'arraybuffer' });
    
    const buffer = Buffer.from(response.data as ArrayBuffer);
    
    // Extract text from pptx (simplified - looks for text in XML)
    const content = buffer.toString('utf-8');
    const textParts: string[] = [];
    
    // Look for text between XML tags
    const textRegex = /<a:t>([^<]+)<\/a:t>/g;
    let match;
    while ((match = textRegex.exec(content)) !== null) {
      textParts.push(match[1]);
    }
    
    return textParts.join(' ').replace(/\s+/g, ' ').trim();
  } catch (error) {
    console.error('Error reading PowerPoint:', error);
    return '';
  }
}

// Read file content based on mime type
async function readFileContent(file: {id: string, name: string, mimeType: string}): Promise<string> {
  try {
    switch (file.mimeType) {
      case 'application/vnd.google-apps.document':
        return await readGoogleDoc(file.id);
      
      case 'application/vnd.google-apps.spreadsheet':
        return await readGoogleSheet(file.id);
      
      case 'application/vnd.google-apps.presentation':
        return await readGoogleSlides(file.id);
      
      case 'application/pdf':
        return await readPdfFile(file.id, file.name);
      
      // Word documents
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      case 'application/msword':
        return await readWordDocument(file.id);
      
      // PowerPoint presentations
      case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      case 'application/vnd.ms-powerpoint':
        return await readPowerPoint(file.id);
      
      case 'text/plain':
      case 'text/markdown':
      case 'text/csv':
        return await readTextFile(file.id);
      
      case 'application/json':
        return await readTextFile(file.id);
      
      default:
        // Try to read as text for unknown types
        if (file.mimeType?.startsWith('text/')) {
          return await readTextFile(file.id);
        }
        console.log(`Skipping unsupported file type: ${file.mimeType} (${file.name})`);
        return '';
    }
  } catch (error) {
    console.error(`Error reading file ${file.name}:`, error);
    return '';
  }
}

// Get all coaching content from Drive
export async function getAllCoachingContent(): Promise<{documents: Array<{name: string, content: string, path?: string}>}> {
  try {
    const files = await listCoachingDocuments();
    const documents: Array<{name: string, content: string, path?: string}> = [];

    console.log(`Processing ${files.length} files from Drive...`);
    
    for (const file of files) {
      const content = await readFileContent(file);
      
      if (content && content.length > 10) {
        const displayName = file.path ? `${file.path}/${file.name}` : file.name;
        documents.push({ name: displayName, content, path: file.path });
        console.log(`Loaded: ${displayName} (${content.length} chars)`);
      }
    }

    console.log(`Successfully loaded ${documents.length} documents`);
    return { documents };
  } catch (error) {
    console.error('Error getting coaching content:', error);
    return { documents: [] };
  }
}

// Build a knowledge context from Drive documents for AI prompts
export async function buildDriveKnowledgeContext(): Promise<string> {
  try {
    const { documents } = await getAllCoachingContent();
    
    if (documents.length === 0) {
      return '';
    }

    let context = '\n\n--- CUSTOM TRAINING MATERIALS FROM GOOGLE DRIVE ---\n';
    context += 'The following materials have been provided by the sales team:\n\n';

    for (const doc of documents) {
      // Limit each document to prevent token overload
      const truncatedContent = doc.content.substring(0, 3000);
      context += `### ${doc.name}\n${truncatedContent}\n\n`;
    }

    context += '--- END CUSTOM TRAINING MATERIALS ---\n';
    
    return context;
  } catch (error) {
    console.error('Error building drive knowledge context:', error);
    return '';
  }
}

// Check if Google Drive is connected
export async function isDriveConnected(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}

// Sync all documents from Google Drive to the database
export async function syncDriveToDatabase(): Promise<{synced: number, errors: string[], total: number}> {
  const { storage } = await import('./storage');
  const files = await listCoachingDocuments();
  let synced = 0;
  const errors: string[] = [];

  console.log(`Starting sync of ${files.length} files from Drive folder tree...`);

  for (const file of files) {
    try {
      const content = await readFileContent(file);
      
      if (content && content.length > 10) {
        const displayName = file.path ? `${file.path}/${file.name}` : file.name;
        
        await storage.upsertTrainingDocument({
          driveFileId: file.id,
          name: displayName,
          content,
          mimeType: file.mimeType,
          isActive: true,
        });
        synced++;
        console.log(`Synced: ${displayName}`);
      } else {
        console.log(`Skipped (no content): ${file.name} (${file.mimeType})`);
      }
    } catch (error) {
      const errorMsg = `Failed to sync ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }
  }

  console.log(`Sync complete: ${synced}/${files.length} files synced`);
  return { synced, errors, total: files.length };
}
