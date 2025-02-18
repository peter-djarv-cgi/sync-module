import { DEBUG, LOG_COLORS } from '@cgi/core-module';

let isChildProcess = false;

function setChildProcessFlag(flag: boolean) {
  isChildProcess = flag;
}

function logMessage(message: string, ...styles: string[]) {
  if (!isChildProcess) {
    // Do not log message if the script is running as a child process
    console.log(message, ...styles);
  }
}

function debugMessage(message: string) {
  if (!DEBUG) return; // Only log in debug-mode
  // Log messages without colors if the script is running as a child process
  console.log(
    isChildProcess ? message : `%c${message}`,
    ...(isChildProcess ? [] : [LOG_COLORS.DEBUG])
  );
}

export {
  logMessage,
  debugMessage,
  setChildProcessFlag,
};
