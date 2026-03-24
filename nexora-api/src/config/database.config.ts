import { registerAs } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs('database', () => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  name: process.env.DB_NAME || 'nexora_dev',
  user: process.env.DB_USER || 'nexora',
  password: process.env.DB_PASSWORD || 'nexora_pass',
  ssl: process.env.DB_SSL === 'true',
  logging: process.env.DB_LOGGING === 'true',
}));

export function getDatabaseConfig(
  configService: ConfigService,
): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: configService.get('database.host'),
    port: configService.get<number>('database.port'),
    database: configService.get('database.name'),
    username: configService.get('database.user'),
    password: configService.get('database.password'),
    ssl: configService.get('database.ssl'),
    logging: configService.get('database.logging'),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../../migrations/*{.ts,.js}'],
    // IMPORTANTE: synchronize: false en producción siempre
    // En desarrollo puedes usar true temporalmente pero acostúmbrate a migraciones
    synchronize: configService.get('app.nodeEnv') === 'development',
    migrationsRun: false,
  };
}