import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';

// Đọc file .env
dotenv.config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  // QUAN TRỌNG: Lúc chạy Migration thì phải dùng DIRECT_URL
  url: process.env.DIRECT_URL, 
  
  // Nơi chứa các class Entity (bảng DB)
  entities: ['dist/**/*.entity.js'], 
  
  // Nơi chứa các file Migration (SQL Scripts)
  migrations: ['dist/db/migrations/*.js'], 
  
  // KHÔNG BAO GIỜ bật cái này trên Production, nó sẽ tự động xóa/sửa bảng bừa bãi
  synchronize: false, 
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;