import { LOG_COLORS, IS_CHILD_PROCESS } from '@cgi/core-module';
import { syncFile } from './utils/sync-util.ts';
import { logMessage, setChildProcessFlag } from './utils/log-util.ts';

let isChildProcess: boolean;

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
    '%cError. Usage: `%cdeno run index.ts file-path=<path>%c`',
    LOG_COLORS.ERROR,
    LOG_COLORS.COMMAND,
    LOG_COLORS.ERROR,
  );
  Deno.exit(1);
}

function runSync(filePath: string) {
  syncFile(filePath);
}

// Executes the sync process, identifying if it's a child process using an environment variable
if (import.meta.main) {
  isChildProcess = Deno.env.get(IS_CHILD_PROCESS) === 'true';
  setChildProcessFlag(isChildProcess);

  const filePath = parseFlags();
  runSync(filePath);
}

export {
  runSync,
  syncFile,
};
