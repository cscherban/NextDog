export interface NextDogOptions {
  serviceName?: string;
  url?: string;
}

interface NextConfig {
  experimental?: Record<string, unknown>;
  env?: Record<string, string>;
  [key: string]: unknown;
}

export function withNextDog(config: NextConfig, options?: NextDogOptions): NextConfig {
  if (process.env.NODE_ENV !== 'development') {
    return config;
  }

  const url = options?.url ?? 'http://localhost:6789';
  const serviceName = options?.serviceName ?? 'nextdog-app';

  return {
    ...config,
    env: {
      ...config.env,
      NEXTDOG_URL: url,
      NEXTDOG_SERVICE_NAME: serviceName,
    },
  };
}
