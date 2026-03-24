import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3000);
  const prefix = configService.get<string>('app.prefix', 'api/v1');
  const frontendUrl = configService.get<string>('app.frontendUrl');

  app.setGlobalPrefix(prefix);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // elimina campos no declarados en el DTO
      forbidNonWhitelisted: true, // lanza error si llegan campos extra
      transform: true,          // convierte tipos automáticamente
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  await app.listen(port);
  console.log(`Nexora API running on port ${port}`);
}

bootstrap();