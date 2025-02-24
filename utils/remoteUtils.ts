import { LOG_COLORS, logMessage } from '@cgi/core-module';

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

export {
  ensureDirectoryExists,
};
