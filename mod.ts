import { LOG_COLORS, logMessage } from '@cgi/core-module';
import { syncFile } from './utils/sync-util.ts';

function parseFlags(): string {
  const args = Deno.args;

  for (const arg of args) {
    const [key, value] = arg.split('=');
    if (key === 'file-path') {
      return value;
    }
  }

  // If the flag is not provided, log an error and exit
  logMessage(
    '%cERROR: Missing flag file-path. \nUsage: %cdeno run sync file-path=<path>',
    LOG_COLORS.ERROR,
    LOG_COLORS.COMMAND,
  );
  Deno.exit(1);
}

// Executes the sync process
const filePath = parseFlags();
syncFile(filePath);

export {
  syncFile,
};
