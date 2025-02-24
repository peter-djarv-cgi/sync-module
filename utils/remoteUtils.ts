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

async function createDirectoryRecursive(url: string, authHeader: string): Promise<boolean> {
  // Normalize the URL path to always use forward slashes
  const normalizedUrl = url.replace(/\\/g, '/');
  const urlObj = new URL(normalizedUrl);

  // Define the base path where we start creating directories
  const basePath = `${urlObj.protocol}//${urlObj.host}/webdav/files`;

  // Extract the relative path (excluding the known base path)
  const relativePath = urlObj.pathname.replace('/webdav/files', '').split('/').filter(part => part.length > 0);

  let currentPath = basePath;

  for (const part of relativePath) {
    currentPath += `/${part}`;

    const response = await fetch(currentPath, {
      method: 'MKCOL',
      headers: { 'Authorization': authHeader },
    });

    if (response.ok) {
      continue; // Folder created successfully
    } else if (response.status === 405) {
      // 405 = Directory already exists, continue
      continue;
    } else if (response.status === 409) {
      logMessage(`%cERROR: Parent directory missing for: %c${currentPath}`,
        LOG_COLORS.ERROR,
        LOG_COLORS.FILEPATH,
      );
      return false;
    } else {
      logMessage(`%cERROR: Failed to create directory: %c${currentPath}`,
        LOG_COLORS.ERROR,
        LOG_COLORS.FILEPATH,
      );
      logMessage(`%cStatus: ${response.status}`, LOG_COLORS.ERROR);
      return false;
    }
  }
  return true;
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
    const created = await createDirectoryRecursive(remoteDir, authHeader);
    if (!created) {
      logMessage('%CERROR: Failed to create directory on server.', LOG_COLORS.ERROR);
      Deno.exit(1);
    }
    logMessage('%cDirectory created successfully!', LOG_COLORS.SUCCESS);
  }
}

export {
  ensureDirectoryExists,
};
