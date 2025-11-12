import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Security
  app.use(helmet());

  // CORS configuration
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
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

  // API prefix
  app.setGlobalPrefix('api');

  // Swagger documentation
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Idea Communicator API')
      .setDescription('API for Idea Communicator - AI-powered communication app')
      .setVersion('0.1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management')
      .addTag('groups', 'Group management')
      .addTag('messages', 'Messaging')
      .addTag('calls', 'Video/Audio calls')
      .addTag('recordings', 'Recording management')
      .addTag('ai', 'AI processing')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`
    ╔═══════════════════════════════════════════════╗
    ║   Idea Communicator API                       ║
    ╠═══════════════════════════════════════════════╣
    ║   🚀 Server running on: http://localhost:${port}  ║
    ║   📚 API Docs: http://localhost:${port}/api/docs ║
    ║   🌍 Environment: ${process.env.NODE_ENV || 'development'}                ║
    ╚═══════════════════════════════════════════════╝
  `);
}

bootstrap();
