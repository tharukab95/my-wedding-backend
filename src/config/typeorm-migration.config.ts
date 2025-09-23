import { DataSource } from 'typeorm';
import { typeOrmConfig } from './typeorm.config';

const connectionSource = new DataSource({
  ...typeOrmConfig,
  migrations: [__dirname + '/../migrations/*.{js,ts}'],
});

export default connectionSource;
