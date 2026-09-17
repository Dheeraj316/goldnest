import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { PrismaService } from './database/prisma.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Defense-in-depth: an unhandled rejection anywhere (a stray fire-and-
  // forget call, a third-party library) otherwise crashes the entire Node
  // process by default — unacceptable for a service moving money. This is a
  // backstop, not a substitute for handling errors at the call site; every
  // fire-and-forget call in this codebase should still .catch() its own
  // errors (see AuditInterceptor for why — this exact class of bug took the
  // whole API down during development).
  process.on('unhandledRejection', (reason) => {
    logger.error(`Unhandled promise rejection: ${reason instanceof Error ? reason.stack : reason}`);
  });

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const configService = app.get(ConfigService);

  app.use(helmet());

  const allowedOrigins = configService.get<string[]>('cors.allowedOrigins') || [];
  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: true,
  });

  // Every endpoint lives under /api/v1/... (spec #71) so future breaking
  // changes get a new version instead of breaking shipped mobile clients.
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);

  if (configService.get<string>('nodeEnv') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(configService.get<string>('appName')!)
      .setDescription('Central backend/API platform for secured lending & gold loan management')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = configService.get<number>('port')!;
  await app.listen(port);
  logger.log(`API listening on port ${port} [${configService.get<string>('nodeEnv')}]`);
}

bootstrap();
