import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const cfg    = app.get(ConfigService);
  const port   = cfg.get<number>('app.port', 3000);
  const prefix = cfg.get<string>('app.prefix', 'api/v1');
  const env    = cfg.get<string>('app.nodeEnv', 'development');
  const origin = cfg.get<string>('app.frontendUrl', 'http://localhost:3001');

  // ─── Seguridad ────────────────────────────────────────────────────────────
  app.use(helmet());
  app.use(compression());
  app.enableCors({ origin, credentials: true });
  app.setGlobalPrefix(prefix);

  // ─── Validación global ────────────────────────────────────────────────────
  app.useGlobalPipes(new ValidationPipe({
    whitelist:              true,
    forbidNonWhitelisted:   true,
    transform:              true,
    transformOptions:       { enableImplicitConversion: true },
  }));

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // ─── Swagger (solo en desarrollo) ─────────────────────────────────────────
  if (env !== 'production') {
    const swaggerCfg = new DocumentBuilder()
      .setTitle('Nexora API')
      .setDescription('API de facturación electrónica para Ecuador')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth',         'Autenticación')
      .addTag('companies',    'Empresas')
      .addTag('invoices',     'Facturas')
      .addTag('customers',    'Clientes')
      .addTag('products',     'Productos')
      .addTag('certificates', 'Certificados')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerCfg);
    SwaggerModule.setup(`${prefix}/docs`, app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
    console.log(`📚 Docs: http://localhost:${port}/${prefix}/docs`);
  }

  await app.listen(port);
  console.log(`🚀 Nexora API corriendo en http://localhost:${port}/${prefix}`);
  console.log(`🌍 Ambiente: ${env.toUpperCase()}`);
}

bootstrap();
