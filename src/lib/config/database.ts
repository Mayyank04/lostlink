import { env } from './env';

export const databaseConfig = {
  url: env.DATABASE_URL,
  isProduction: env.NODE_ENV === 'production',
  logging: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
} as const;
