import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';
import { parseCorsOrigins } from './config/config.schema';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global prefix
  app.setGlobalPrefix('api');

  // Enable CORS
  const allowedOrigins = parseCorsOrigins(
    configService.get<string>('CORS_ALLOWED_ORIGINS'),
  );

  app.enableCors({
    origin: allowedOrigins.includes('*') ? true : allowedOrigins,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalInterceptors(new RequestIdInterceptor());

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Cultivo Manager API')
    .setDescription('API para gestión de cultivos con integración IoT')
    .setVersion('1.0')
    .addTag('locations', 'Gestión de salas y secciones')
    .addTag('devices', 'Gestión de dispositivos IoT')
    .addTag('grow', 'Gestión de ciclos, plantas y genéticas')
    .addTag('events', 'Bitácora de eventos')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = configService.get<number>('PORT', 4000);
  await app.listen(port, '0.0.0.0');

  console.log(`🌱 Cultivo Manager Backend running on port ${port}`);
  console.log(`📚 Swagger docs available at http://localhost:${port}/docs`);
}

bootstrap();
