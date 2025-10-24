export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  source: 'frontend' | 'backend';
  module: string;
  message: string;
  data?: unknown;
}

type LogListener = (entry: LogEntry) => void;

class Logger {
  private listeners = new Set<LogListener>();
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };

  constructor() {
    this.interceptConsole();
  }

  private interceptConsole() {
    const createInterceptor = (level: LogLevel, originalMethod: (...args: unknown[]) => void) => {
      return (...args: unknown[]) => {
        // Call original console method
        originalMethod.apply(console, args);

        // Extract module from stack trace if possible
        const module = this.extractModuleFromStack();

        // Create log entry
        const message = args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');

        const entry: LogEntry = {
          timestamp: new Date().toISOString(),
          level,
          source: 'frontend',
          module: module || 'unknown',
          message,
          data: args.length === 1 ? args[0] : args,
        };

        this.addLog(entry);
      };
    };

    console.log = createInterceptor(LogLevel.INFO, this.originalConsole.log);
    console.info = createInterceptor(LogLevel.INFO, this.originalConsole.info);
    console.warn = createInterceptor(LogLevel.WARN, this.originalConsole.warn);
    console.error = createInterceptor(LogLevel.ERROR, this.originalConsole.error);
    console.debug = createInterceptor(LogLevel.DEBUG, this.originalConsole.debug);
  }

  public getOriginalConsole() {
    return this.originalConsole;
  }

  private extractModuleFromStack(): string | null {
    try {
      const stack = new Error().stack;
      if (!stack) return null;

      // Parse stack trace to find the calling module
      const lines = stack.split('\n');
      // Skip first 3 lines (Error, interceptor, and this method)
      for (let i = 3; i < lines.length; i++) {
        const line = lines[i];
        // Extract file path from stack line
        const match = line.match(/\((.*?):\d+:\d+\)|at (.*?):\d+:\d+/);
        if (match) {
          const path = match[1] || match[2];
          if (path) {
            // Extract filename or meaningful path segment
            const segments = path.split('/');
            const filename = segments[segments.length - 1];

            // Remove query params and file extension
            const cleanName = filename.split('?')[0].replace(/\.(tsx?|jsx?)$/, '');

            // Ignore framework and library files
            if (!cleanName.includes('node_modules') &&
                !cleanName.includes('logger') &&
                !cleanName.includes('vite')) {
              return cleanName;
            }
          }
        }
      }
    } catch (e) {
      // Silently fail if stack parsing doesn't work
    }
    return null;
  }

  private addLog(entry: LogEntry) {
    this.logs.push(entry);

    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    this.emit(entry);
  }

  public log(module: string, level: LogLevel, message: string, data?: unknown) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      source: 'frontend',
      module,
      message,
      data,
    };

    this.addLog(entry);

    if (level === LogLevel.DEBUG) {
      this.originalConsole.debug(`[${module}]`, message, data);
    }
  }

  public debug(module: string, message: string, data?: unknown) {
    this.log(module, LogLevel.DEBUG, message, data);
  }

  public info(module: string, message: string, data?: unknown) {
    this.log(module, LogLevel.INFO, message, data);
  }

  public warn(module: string, message: string, data?: unknown) {
    this.log(module, LogLevel.WARN, message, data);
  }

  public error(module: string, message: string, data?: unknown) {
    this.log(module, LogLevel.ERROR, message, data);
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
  }

  public subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(entry: LogEntry) {
    for (const listener of this.listeners) {
      try {
        listener(entry);
      } catch (error) {
        this.originalConsole.error('Logger listener error:', error);
      }
    }
  }

  public exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const logger = new Logger();
