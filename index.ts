import { basename } from '@std/path';

import { SESSION, LOG_COLORS, SYSTEM_PATH } from '@peter-djarv-cgi/core-module';

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
      console.log(`%cRemote directory '%c${remoteDir}%c' does not exist. Creating...`,
        LOG_COLORS.INFO,
        LOG_COLORS.FILEPATH,
        LOG_COLORS.INFO,
      );
      const created = await createDirectory(remoteDir, authHeader);
      if (!created) {
        throw new Error('Failed to create directory on server.');
      }
      console.log('%cDirectory created successfully!', LOG_COLORS.SUCCESS);
    }

    // Read the local file
    const fileContent = await Deno.readFile(filePath); // requires allow-read

    // Construct the full URL for the file on the server
    const fileName = basename(filePath);
    const fileUrl = `${remoteDir}/${fileName}`;

    console.log(
      `%cSyncing file: %c${fileName}`,
      LOG_COLORS.INFO,
      LOG_COLORS.FILEPATH,
    );

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
      console.log(`%cFile: '%c${fileUrl}%c' synced successfully!`,
        LOG_COLORS.SUCCESS,
        LOG_COLORS.FILEPATH,
        LOG_COLORS.SUCCESS,
      );
    } else {
      console.log(`%cFailed to sync file: %c${response.status} ${response.statusText}`,
        LOG_COLORS.ERROR,
        LOG_COLORS.INFO,
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      console.log(`%cAn error occurred during file synchronization: ${error.message}`, LOG_COLORS.ERROR);
      console.log('%cSuggestion: Please verify your authentication credentials and try again.', LOG_COLORS.WARNING);
    }
  }
}
