import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { dataSourceOptions } from '../db/data-source';

export const databaseConfig: TypeOrmModuleOptions = {
  ...dataSourceOptions,
  // Đè URL thành Pooler port 6543 để chạy App
  url: process.env.DATABASE_URL,
  // Tự động gom hết các class trong thư mục src/entities/
  autoLoadEntities: true,
} as TypeOrmModuleOptions;
