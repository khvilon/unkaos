declare module 'gelf-pro' {
  interface GelfConfig {
    fields?: Record<string, any>;
    adapterName?: string;
    adapterOptions?: {
      host?: string;
      port?: number;
      [key: string]: any;
    };
  }

  interface GelfMessage {
    level?: string;
    shortMessage: string;
    fullMessage?: string;
    timestamp?: number;
    [key: string]: any;
  }

  export function setConfig(config: GelfConfig): void;
  export function message(message: GelfMessage, callback?: (err: Error | null, bytes: number) => void): void;
  export function info(message: string | GelfMessage, extra?: Record<string, any>, callback?: (err: Error | null, bytes: number) => void): void;
  export function error(message: string | GelfMessage, extra?: Record<string, any>, callback?: (err: Error | null, bytes: number) => void): void;
  export function warn(message: string | GelfMessage, extra?: Record<string, any>, callback?: (err: Error | null, bytes: number) => void): void;
  export function debug(message: string | GelfMessage, extra?: Record<string, any>, callback?: (err: Error | null, bytes: number) => void): void;
}
