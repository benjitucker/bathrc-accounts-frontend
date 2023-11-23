/* eslint-disable no-console */
import debug from 'debug';

export function createLog(
  moduleName: string,
  componentName: string,
  level: string,
): debug.Debugger {
  const forceOutput = level === 'error';
  const log = debug(`${moduleName}:${componentName}:${level}${forceOutput ? '*' : ''}`);
  switch (level) {
    case 'warn':
      log.log = console.warn.bind(console);
      break;
    case 'error':
      log.log = console.error.bind(console);
      break;
    case 'debug':
      log.log = console.debug.bind(console);
      break;
    case 'info':
      log.log = console.info.bind(console);
      break;
    default:
      log.log = console.log.bind(console);
      break;
  }
  return log;
}
