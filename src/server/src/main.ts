import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api'); // Tất cả route sẽ có tiền tố /api

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
