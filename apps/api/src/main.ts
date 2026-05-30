import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT ?? 3000);
  const frontendOrigin = process.env.FRONTEND_ORIGIN ?? '*';

  app.setGlobalPrefix('api');
  app.enableCors({
    origin:
      frontendOrigin === '*'
        ? true
        : frontendOrigin.split(',').map((origin) => origin.trim()),
    credentials: true
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true
      }
    })
  );
  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');
}

void bootstrap();
