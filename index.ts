import { basename } from 'jsr:@std/path';

import { SESSION, LOG_COLORS, SYSTEM_PATH } from '@peter-djarv-cgi/core-module';

let isChildProcess: boolean;

function logMessage(message: string, ...styles: string[]) {
  if (!isChildProcess) {
    // Do not log message if the script is running as a child process
    console.log('%c' + message, ...styles);
  }
}

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

function parseFlags(): string {
  const args = Deno.args;
  const flags: { [key: string]: string } = {};

  for (const arg of args) {
    const [key, value] = arg.split('=');
    if (key.startsWith('--')) {
      flags[key.slice(2)] = value;
    }
  }

  const filePath = flags['file-path'];
  isChildProcess = flags['child-process'] === 'true';

  if (!filePath) {
    logMessage('%cUsage: `%cdeno run index.ts --file-path=<path> --child-process=true/false%c`',
      LOG_COLORS.ERROR,
      LOG_COLORS.COMMAND,
      LOG_COLORS.ERROR,
    );
    Deno.exit(1);
  }

  return filePath;
}

// Sync file function
async function syncFile() {
  try {
    const filePath = parseFlags();

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

    // Read the local file
    const fileContent = await Deno.readFile(filePath); // requires allow-read

    // Construct the full URL for the file on the server
    const fileName = basename(filePath);
    const fileUrl = `${remoteDir}/${fileName}`;

    logMessage(
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
      logMessage(`%cFile: '%c${fileUrl}%c' synced successfully!`,
        LOG_COLORS.SUCCESS,
        LOG_COLORS.FILEPATH,
        LOG_COLORS.SUCCESS,
      );
    } else {
      logMessage(`%cFailed to sync file: %c${response.status} ${response.statusText}`,
        LOG_COLORS.ERROR,
        LOG_COLORS.INFO,
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      logMessage(`%cAn error occurred during file synchronization: ${error.message}`, LOG_COLORS.ERROR);
      logMessage('%cSuggestion: Please verify your authentication credentials and try again.', LOG_COLORS.WARNING);
    }
  }
}

// Export the syncFile function
export { syncFile };

// Group all the functionality into a single object `syncModule`
export const syncModule = {
  syncFile,
};
