import { basename } from '@std/path';

import { debugMessage, SESSION, SYSTEM_PATH } from '@peter-djarv-cgi/core-module';

async function directoryExists(url: string, authHeader: string): Promise<boolean> {
  const response = await fetch(url, {
    method: 'PROPFIND',
    headers: {
      'Authorization': authHeader,
      'Depth': '1',
    },
  });
  return response.ok;
}

async function createDirectory(url: string, authHeader: string): Promise<boolean> {
  const response = await fetch(url, {
    method: 'MKCOL',
    headers: {
      'Authorization': authHeader,
    },
  });
  return response.ok;
}

// Sync file function
export async function syncFile(filePath: string) {
  try {
    // Fetch credentials from session
    if (!SESSION.projectConfig) {
      return;
    }
    const host = SESSION.projectConfig.host;
    const name = SESSION.projectConfig.name;
    const remoteDir = `${host}${SYSTEM_PATH}`;
    const credentials = await SESSION.getCredentials(name);
    const username = credentials.username;
    const password = credentials.password;

    const buildAuthHeader = (username: string, password: string): string => {
      return 'Basic ' + btoa(`${username}:${password}`);
    };

    const authHeader = buildAuthHeader(username, password);

    // Ensure the directory exists
    const directoryExistsResult = await directoryExists(remoteDir, authHeader);
    if (!directoryExistsResult) {
      debugMessage(`Remote directory '${remoteDir}' does not exist. Creating...`);
      const created = await createDirectory(remoteDir, authHeader);
      if (!created) {
        throw new Error('Failed to create directory on server.');
      }
      debugMessage('Directory created successfully!');
    }

    // Read the local file
    const fileContent = await Deno.readFile(filePath); // requires allow-read

    // Construct the full URL for the file on the server
    const fileName = basename(filePath);
    const fileUrl = `${remoteDir}/${fileName}`;

    debugMessage(`Syncing file: ${fileName}`);

    // Upload the file using PUT
    const response = await fetch(fileUrl, {
      method: 'PUT',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/octet-stream',
      },
      body: fileContent,
    });

    if (response.ok) {
      debugMessage(`File: '${fileUrl}' synced successfully!`);
    } else {
      debugMessage(`Failed to sync file: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      debugMessage(`An error occurred during file synchronization: ${error.message}`);
      debugMessage('Suggestion: Please verify your authentication credentials and try again.');
    }
  }
}
