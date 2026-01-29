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

// List all documents in the coaching folder
export async function listCoachingDocuments(): Promise<Array<{id: string, name: string, mimeType: string}>> {
  try {
    const folderId = await getCoachingFolderId();
    if (!folderId) return [];

    const drive = await getGoogleDriveClient();
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType)',
      spaces: 'drive'
    });

    return (response.data.files || []).map(f => ({
      id: f.id || '',
      name: f.name || '',
      mimeType: f.mimeType || ''
    }));
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

// Get all coaching content from Drive
export async function getAllCoachingContent(): Promise<{documents: Array<{name: string, content: string}>}> {
  try {
    const files = await listCoachingDocuments();
    const documents: Array<{name: string, content: string}> = [];

    for (const file of files) {
      let content = '';
      
      if (file.mimeType === 'application/vnd.google-apps.document') {
        content = await readGoogleDoc(file.id);
      } else if (file.mimeType === 'text/plain') {
        content = await readTextFile(file.id);
      }
      
      if (content) {
        documents.push({ name: file.name, content });
      }
    }

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
export async function syncDriveToDatabase(): Promise<{synced: number, errors: string[]}> {
  const { storage } = await import('./storage');
  const files = await listCoachingDocuments();
  let synced = 0;
  const errors: string[] = [];

  for (const file of files) {
    try {
      let content = '';
      
      if (file.mimeType === 'application/vnd.google-apps.document') {
        content = await readGoogleDoc(file.id);
      } else if (file.mimeType === 'text/plain') {
        content = await readTextFile(file.id);
      }
      
      if (content) {
        await storage.upsertTrainingDocument({
          driveFileId: file.id,
          name: file.name,
          content,
          mimeType: file.mimeType,
          isActive: true,
        });
        synced++;
      }
    } catch (error) {
      const errorMsg = `Failed to sync ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }
  }

  return { synced, errors };
}
