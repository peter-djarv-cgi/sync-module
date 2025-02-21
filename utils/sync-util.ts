import { basename } from '@std/path';
import { LOG_COLORS, SYSTEM_PATH, getSession, logMessage } from '@cgi/core-module';

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

// Builds the Basic Auth header for file synchronization
function buildAuthHeader(username: string, password: string): string {
  return 'Basic ' + btoa(`${username}:${password}`);
}

// Ensures the project directory exists on the remote server
async function ensureDirectoryExists(remoteDir: string, authHeader: string): Promise<void> {
  const directoryExistsResult = await directoryExists(remoteDir, authHeader);
  if (!directoryExistsResult) {
    logMessage(`%cRemote directory '%c${remoteDir}%c' does not exist. Creating...`,
      LOG_COLORS.INFO,
      LOG_COLORS.FILEPATH,
      LOG_COLORS.INFO,
    );
    const created = await createDirectory(remoteDir, authHeader);
    if (!created) {
      throw new Error('Failed to create directory on server.');
    }
    logMessage('%cDirectory created successfully!', LOG_COLORS.SUCCESS);
  }
}

// Reads the local file content
async function readLocalFile(filePath: string): Promise<Uint8Array> {
  return await Deno.readFile(filePath);
}

// Uploads the file to the remote server using a PUT request
async function uploadFile(fileUrl: string, fileContent: Uint8Array, authHeader: string): Promise<Response> {
  return await fetch(fileUrl, {
    method: 'PUT',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/octet-stream',
    },
    body: fileContent,
  });
}

// Main sync function
async function syncFile(filePath: string) {
  try {
    const SESSION = await getSession();
    const projectConfig = await SESSION.getProjectConfig();
    const credentials = await SESSION.getCredentials();

    const host = projectConfig.host;
    const remoteDir = `${host}${SYSTEM_PATH}`;
    const username = credentials.username;
    const password = credentials.password;

    const authHeader = buildAuthHeader(username, password);

    // Ensure the remote directory exists or create it
    await ensureDirectoryExists(remoteDir, authHeader);

    // Read the local file content
    const fileContent = await readLocalFile(filePath);

    // Construct the full URL for the file on the server
    const fileName = basename(filePath);
    const fileUrl = `${remoteDir}/${fileName}`;

    logMessage(`%cSyncing file: %c${fileName}`, LOG_COLORS.INFO, LOG_COLORS.FILEPATH);

    // Upload the file
    const response = await uploadFile(fileUrl, fileContent, authHeader);

    if (response.ok) {
      logMessage(`%cFile: '%c${fileUrl}%c' synced successfully!`, LOG_COLORS.SUCCESS, LOG_COLORS.FILEPATH, LOG_COLORS.SUCCESS);
      Deno.exit(0); // Indicate success to parent process
    } else {
      logMessage(`%cFailed to sync file: %c${response.status} ${response.statusText}`,
        LOG_COLORS.ERROR,
        LOG_COLORS.INFO,
      );
      Deno.exit(1);
    }
  } catch (error) {
    if (error instanceof Error) {
      logMessage(`%cAn error occurred during file synchronization: ${error.message}`, LOG_COLORS.ERROR);
      logMessage('%cSuggestion: Please verify your authentication credentials and try again.', LOG_COLORS.INFO);
      Deno.exit(1);
    }
  }
}

export {
  syncFile,
};
