export const TARGET_FOLDER_ID = '1vDmg8E2TWD67uvmN-mtz9VT84EQqBNbD';
export const DRIVE_FOLDER_URL = `https://drive.google.com/drive/folders/${TARGET_FOLDER_ID}`;

export interface UploadResult {
  fileId: string;
  webViewLink: string;
  name: string;
  folderId?: string;
  folderName?: string;
}

// In-memory cache for date folder IDs to avoid redundant searches
const dateFolderCache: Record<string, string> = {};

/**
 * Helper to find or create a master folder in the user's root Drive as a fallback
 */
async function getOrCreateRootMasterFolder(
  accessToken: string,
  folderName: string = 'WASABI-O Receipts'
): Promise<string> {
  const cacheKey = `root_${folderName}`;
  if (dateFolderCache[cacheKey]) return dateFolderCache[cacheKey];

  try {
    const query = `'root' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true`;
    const res = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.files && data.files.length > 0) {
        dateFolderCache[cacheKey] = data.files[0].id;
        return data.files[0].id;
      }
    }

    // Create master folder in root
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: ['root'],
      }),
    });

    if (createRes.ok) {
      const created = await createRes.json();
      dateFolderCache[cacheKey] = created.id;
      return created.id;
    }
  } catch (err) {
    console.warn('Fallback master folder creation error:', err);
  }

  return 'root';
}

/**
 * Find or create a subfolder for a specific date (e.g. "2026-10-21") inside the parent Drive folder
 * Falls back gracefully to user's root Drive if parentFolderId is not accessible (403/404)
 */
export async function getOrCreateDateFolder(
  dateStr: string,
  accessToken: string,
  parentFolderId: string = TARGET_FOLDER_ID
): Promise<string> {
  const folderName = dateStr || new Date().toISOString().split('T')[0];
  const cacheKey = `${parentFolderId}_${folderName}`;

  if (dateFolderCache[cacheKey]) {
    return dateFolderCache[cacheKey];
  }

  try {
    // 1. Search for existing date folder inside parentFolder
    const query = `'${parentFolderId}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true`;

    const searchRes = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        const foundId = searchData.files[0].id;
        dateFolderCache[cacheKey] = foundId;
        return foundId;
      }
    } else if (searchRes.status === 404 || searchRes.status === 403) {
      console.warn(`Parent folder ${parentFolderId} returned ${searchRes.status}, falling back to user Drive`);
      const fallbackParent = await getOrCreateRootMasterFolder(accessToken);
      return getOrCreateDateFolder(dateStr, accessToken, fallbackParent);
    }

    // 2. Folder does not exist yet -> create it inside parentFolderId!
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId],
      }),
    });

    if (createRes.ok) {
      const createdData = await createRes.json();
      dateFolderCache[cacheKey] = createdData.id;
      return createdData.id;
    }

    // If creating inside parentFolder failed with 403/404 (e.g. no edit permission in shared folder)
    if (createRes.status === 403 || createRes.status === 404) {
      console.warn(`Creating folder inside ${parentFolderId} returned ${createRes.status}. Using user's personal Drive fallback.`);
      const fallbackParent = await getOrCreateRootMasterFolder(accessToken);
      if (fallbackParent !== parentFolderId) {
        return getOrCreateDateFolder(dateStr, accessToken, fallbackParent);
      }
    }
  } catch (err) {
    console.warn('Date folder lookup error, using fallback:', err);
  }

  return parentFolderId;
}

/**
 * Upload receipt PDF to Google Drive, automatically placing it in a folder separated by date
 */
export async function uploadReceiptPdfToDrive(
  pdfBlob: Blob,
  filename: string,
  accessToken: string,
  dateStr?: string,
  parentFolderId: string = TARGET_FOLDER_ID
): Promise<UploadResult> {
  if (!accessToken) {
    throw new Error('กรุณาเข้าสู่ระบบ Google Workspace ก่อนอัปโหลดไฟล์');
  }

  const folderDate = dateStr || new Date().toISOString().split('T')[0];
  
  // Resolve or create date subfolder (with automatic fallback to root Drive if parent is read-only or 404)
  let targetFolder = await getOrCreateDateFolder(folderDate, accessToken, parentFolderId);

  const performUpload = async (folderToUse: string | null): Promise<UploadResult> => {
    const metadata: Record<string, any> = {
      name: filename,
      mimeType: 'application/pdf',
    };

    if (folderToUse && folderToUse !== 'root') {
      metadata.parents = [folderToUse];
    }

    const boundary = '---------boundary_' + Math.random().toString(36).substring(2);
    // Standard RFC multipart format: first delimiter MUST NOT have leading CRLF
    const firstDelimiter = `--${boundary}\r\n`;
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const requestBody = new Blob(
      [
        firstDelimiter,
        'Content-Type: application/json; charset=UTF-8\r\n\r\n',
        JSON.stringify(metadata),
        delimiter,
        'Content-Type: application/pdf\r\n\r\n',
        pdfBlob,
        closeDelimiter,
      ],
      { type: `multipart/related; boundary=${boundary}` }
    );

    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink&supportsAllDrives=true',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: requestBody,
      }
    );

    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      const detailedMsg = errorJson.error?.message || `Status ${res.status}`;
      
      // If folder permission error (403/404), throw error so caller can try root fallback
      const err = new Error(detailedMsg) as any;
      err.status = res.status;
      throw err;
    }

    const data = await res.json();
    const webViewLink = data.webViewLink || `https://drive.google.com/file/d/${data.id}/view?usp=drivesdk`;

    // Attempt to grant readable permission so the link in Google Sheet works for anyone in the organization
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${data.id}/permissions?supportsAllDrives=true`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone',
        }),
      });
    } catch {
      // Non-fatal if organization policy prohibits public file sharing
    }

    return {
      fileId: data.id,
      webViewLink,
      name: data.name,
      folderId: folderToUse || undefined,
      folderName: folderDate,
    };
  };

  try {
    return await performUpload(targetFolder);
  } catch (err: any) {
    console.warn(`Upload to folder ${targetFolder} failed (${err.message}). Retrying with user's root Drive...`);
    
    // If upload to specific folder failed due to permissions or not found, retry directly in user's root Drive
    if (targetFolder && targetFolder !== 'root') {
      try {
        const rootFolder = await getOrCreateRootMasterFolder(accessToken);
        return await performUpload(rootFolder);
      } catch (fallbackErr: any) {
        // Last attempt: upload without parents directly
        return await performUpload(null);
      }
    }
    
    throw new Error(`Google Drive upload error: ${err.message || 'เกิดข้อผิดพลาดในการบันทึกไฟล์'}`);
  }
}

/**
 * Get or create a dedicated "WASABI-O Product Images" folder in Google Drive
 */
export async function getOrCreateProductImagesFolder(
  accessToken: string,
  parentFolderId: string = TARGET_FOLDER_ID
): Promise<string> {
  const folderName = 'WASABI-O Product Images';
  const cacheKey = `${parentFolderId}_product_images`;

  if (dateFolderCache[cacheKey]) {
    return dateFolderCache[cacheKey];
  }

  try {
    const query = `'${parentFolderId}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true`;

    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        const foundId = searchData.files[0].id;
        dateFolderCache[cacheKey] = foundId;
        return foundId;
      }
    } else if (searchRes.status === 404 || searchRes.status === 403) {
      const fallbackParent = await getOrCreateRootMasterFolder(accessToken);
      return getOrCreateProductImagesFolder(accessToken, fallbackParent);
    }

    // Create product images folder
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId],
      }),
    });

    if (createRes.ok) {
      const createdData = await createRes.json();
      dateFolderCache[cacheKey] = createdData.id;
      return createdData.id;
    }

    if (createRes.status === 403 || createRes.status === 404) {
      const fallbackParent = await getOrCreateRootMasterFolder(accessToken);
      if (fallbackParent !== parentFolderId) {
        return getOrCreateProductImagesFolder(accessToken, fallbackParent);
      }
    }
  } catch (err) {
    console.warn('Product images folder lookup error:', err);
  }

  return parentFolderId;
}

/**
 * Upload a product image to Google Drive, returning direct view/thumbnail links
 */
export async function uploadProductImageToDrive(
  imageSource: Blob | File | string,
  filename: string,
  accessToken: string,
  parentFolderId: string = TARGET_FOLDER_ID
): Promise<{ fileId: string; webViewLink: string; directLink: string }> {
  if (!accessToken) {
    throw new Error('กรุณาเข้าสู่ระบบ Google เพื่อบันทึกรูปภาพลง Google Drive');
  }

  // Convert base64 dataUrl to Blob if string was passed
  let imageBlob: Blob;
  let mimeType = 'image/jpeg';

  if (typeof imageSource === 'string') {
    if (imageSource.startsWith('data:')) {
      const parts = imageSource.split(',');
      const match = parts[0].match(/:(.*?);/);
      mimeType = match ? match[1] : 'image/jpeg';
      const byteCharacters = atob(parts[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      imageBlob = new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
    } else {
      throw new Error('Invalid image format');
    }
  } else {
    imageBlob = imageSource;
    mimeType = imageSource.type || 'image/jpeg';
  }

  const targetFolder = await getOrCreateProductImagesFolder(accessToken, parentFolderId);

  const performUpload = async (folderToUse: string | null) => {
    const safeName = filename.endsWith('.jpg') || filename.endsWith('.png') || filename.endsWith('.jpeg')
      ? filename
      : `${filename}.jpg`;

    const metadata: Record<string, any> = {
      name: safeName,
      mimeType,
    };

    if (folderToUse && folderToUse !== 'root') {
      metadata.parents = [folderToUse];
    }

    const boundary = '---------boundary_' + Math.random().toString(36).substring(2);
    const firstDelimiter = `--${boundary}\r\n`;
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const requestBody = new Blob(
      [
        firstDelimiter,
        'Content-Type: application/json; charset=UTF-8\r\n\r\n',
        JSON.stringify(metadata),
        delimiter,
        `Content-Type: ${mimeType}\r\n\r\n`,
        imageBlob,
        closeDelimiter,
      ],
      { type: `multipart/related; boundary=${boundary}` }
    );

    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,thumbnailLink&supportsAllDrives=true',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: requestBody,
      }
    );

    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      const detailedMsg = errorJson.error?.message || `Status ${res.status}`;
      const err = new Error(detailedMsg) as any;
      err.status = res.status;
      throw err;
    }

    const data = await res.json();
    const webViewLink = data.webViewLink || `https://drive.google.com/file/d/${data.id}/view?usp=drivesdk`;
    const directLink = `https://drive.google.com/thumbnail?id=${data.id}&sz=w800`;

    // Make image readable so other users / machines can view the image
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${data.id}/permissions?supportsAllDrives=true`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone',
        }),
      });
    } catch {
      // Ignore permission policy errors
    }

    return {
      fileId: data.id,
      webViewLink,
      directLink,
    };
  };

  try {
    return await performUpload(targetFolder);
  } catch (err: any) {
    console.warn(`Product image upload to folder ${targetFolder} failed. Retrying root...`, err);
    if (targetFolder && targetFolder !== 'root') {
      try {
        const rootFolder = await getOrCreateRootMasterFolder(accessToken);
        return await performUpload(rootFolder);
      } catch {
        return await performUpload(null);
      }
    }
    throw err;
  }
}
