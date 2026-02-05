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

async function getUncachableGoogleDriveClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink?: string;
  thumbnailLink?: string;
  createdTime?: string;
}

export async function listFilesInFolder(folderId: string): Promise<DriveFile[]> {
  try {
    const drive = await getUncachableGoogleDriveClient();
    
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, size, webViewLink, thumbnailLink, createdTime)',
      pageSize: 100,
    });

    return (response.data.files || []).map(file => ({
      id: file.id || '',
      name: file.name || '',
      mimeType: file.mimeType || '',
      size: file.size || undefined,
      webViewLink: file.webViewLink || undefined,
      thumbnailLink: file.thumbnailLink || undefined,
      createdTime: file.createdTime || undefined,
    }));
  } catch (error) {
    console.error('[GoogleDrive] Error listing files:', error);
    throw error;
  }
}

export async function downloadFileAsBuffer(fileId: string): Promise<Buffer> {
  try {
    const drive = await getUncachableGoogleDriveClient();
    
    const response = await drive.files.get({
      fileId,
      alt: 'media',
    }, { responseType: 'arraybuffer' });

    return Buffer.from(response.data as ArrayBuffer);
  } catch (error) {
    console.error('[GoogleDrive] Error downloading file:', error);
    throw error;
  }
}

export async function getFileMetadata(fileId: string): Promise<DriveFile | null> {
  try {
    const drive = await getUncachableGoogleDriveClient();
    
    const response = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size, webViewLink, thumbnailLink, createdTime',
    });

    if (!response.data) return null;

    return {
      id: response.data.id || '',
      name: response.data.name || '',
      mimeType: response.data.mimeType || '',
      size: response.data.size || undefined,
      webViewLink: response.data.webViewLink || undefined,
      thumbnailLink: response.data.thumbnailLink || undefined,
      createdTime: response.data.createdTime || undefined,
    };
  } catch (error) {
    console.error('[GoogleDrive] Error getting file metadata:', error);
    throw error;
  }
}

export async function listAllFilesRecursively(folderId: string): Promise<DriveFile[]> {
  const allFiles: DriveFile[] = [];
  
  try {
    const drive = await getUncachableGoogleDriveClient();
    
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, size, webViewLink, thumbnailLink, createdTime)',
      pageSize: 100,
    });

    const files = response.data.files || [];
    
    for (const file of files) {
      if (file.mimeType === 'application/vnd.google-apps.folder') {
        const subFiles = await listAllFilesRecursively(file.id!);
        allFiles.push(...subFiles);
      } else {
        allFiles.push({
          id: file.id || '',
          name: file.name || '',
          mimeType: file.mimeType || '',
          size: file.size || undefined,
          webViewLink: file.webViewLink || undefined,
          thumbnailLink: file.thumbnailLink || undefined,
          createdTime: file.createdTime || undefined,
        });
      }
    }
    
    return allFiles;
  } catch (error) {
    console.error('[GoogleDrive] Error listing files recursively:', error);
    throw error;
  }
}
