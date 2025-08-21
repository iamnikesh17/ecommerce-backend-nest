import { DataSource, DataSourceOptions } from 'typeorm';

import { config } from 'dotenv';
config();
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  port: +process.env.DB_PORT,
  host: process.env.DB_HOST,
  entities: ['dist/**/*.entity{.ts,.js}'],
  migrations: ['dist/db/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: false,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

const dataSource = new DataSource(dataSourceOptions);
dataSource.initialize();
export default dataSource;
