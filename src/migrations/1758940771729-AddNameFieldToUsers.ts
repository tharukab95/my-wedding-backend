import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNameFieldToUsers1758940771729 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add name field to users table
    await queryRunner.query(`ALTER TABLE "users" ADD "name" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove name field from users table
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "name"`);
  }
}
