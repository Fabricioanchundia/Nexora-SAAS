import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  prefix: process.env.API_PREFIX || 'api/v1',
  name: process.env.APP_NAME || 'Nexora API',
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
  certificateEncryptionKey:
    process.env.CERTIFICATE_ENCRYPTION_KEY || 'nexora-dev-key-minimo-32-caracteres!!',
}));