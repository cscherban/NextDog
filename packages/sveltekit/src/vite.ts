import type { Plugin } from 'vite';

export interface NextDogViteOptions {
  serviceName?: string;
  url?: string;
}

export function nextdog(options?: NextDogViteOptions): Plugin {
  return {
    name: 'nextdog',
    configResolved(config) {
      if (config.mode === 'production') return;
      process.env.NEXTDOG_URL = options?.url ?? 'http://localhost:6789';
      process.env.NEXTDOG_SERVICE_NAME = options?.serviceName ?? 'nextdog-app';
    },
  };
}
