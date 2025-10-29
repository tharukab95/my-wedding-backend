import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(private dataSource: DataSource) {}

  async onModuleInit() {
    try {
      this.logger.log('Starting database initialization...');

      // Check if database connection is established
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
        this.logger.log('Database connection established');
      }

      // Run pending migrations
      const pendingMigrations = await this.dataSource.showMigrations();
      if (pendingMigrations) {
        this.logger.log('Running pending migrations...');
        await this.dataSource.runMigrations();
        this.logger.log('Migrations completed successfully');
      } else {
        this.logger.log('No pending migrations found');
      }

      this.logger.log('Database initialization completed successfully');
    } catch (error) {
      this.logger.error('Database initialization failed:', error);
      throw error;
    }
  }

  async getConnectionStatus(): Promise<boolean> {
    return this.dataSource.isInitialized;
  }

  async closeConnection(): Promise<void> {
    if (this.dataSource.isInitialized) {
      await this.dataSource.destroy();
      this.logger.log('Database connection closed');
    }
  }
}
