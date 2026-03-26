import { registerAs } from '@nestjs/config';
 
export default registerAs('database', () => ({
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  name: process.env.DB_NAME || 'nexora_dev',
  user: process.env.DB_USER || 'nexora',
  password: process.env.DB_PASSWORD || 'nexora_pass',
  ssl: process.env.DB_SSL === 'true',
  logging: process.env.DB_LOGGING === 'true',
}));
 