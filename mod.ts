import { LOG_COLORS, logMessage } from '@cgi/core-module';
import { syncFile } from './utils/syncHandler.ts';

function parseFlags(): { filePath: string; remotePath?: string } {
  const args = Deno.args;
  let filePath: string | undefined;
  let remotePath: string | undefined;

  for (const arg of args) {
    const [key, value] = arg.split('=');
    if (key === 'file-path') {
      filePath = value;
    } else if (key === 'remote-path') {
      remotePath = value;
    }
  }

  // Ensure filePath is provided
  if (!filePath) {
    logMessage(
      '%cERROR: Missing required flag file-path. \nUsage: %cdeno run sync file-path=<path> [remote-path=<remote>]',
      LOG_COLORS.ERROR,
      LOG_COLORS.COMMAND,
    );
    Deno.exit(1);
  }

  return { filePath, remotePath };
}

// Executes the sync process
const { filePath, remotePath } = parseFlags();
syncFile(filePath, remotePath);

export { syncFile };
