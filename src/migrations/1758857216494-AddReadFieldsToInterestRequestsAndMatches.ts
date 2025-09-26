import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReadFieldsToInterestRequestsAndMatches1758857216494
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add isRead and readAt fields to interest_requests table
    await queryRunner.query(
      `ALTER TABLE "interest_requests" ADD "isRead" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "interest_requests" ADD "readAt" TIMESTAMP`,
    );

    // Add isRead and readAt fields to matches table
    await queryRunner.query(
      `ALTER TABLE "matches" ADD "isRead" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(`ALTER TABLE "matches" ADD "readAt" TIMESTAMP`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove isRead and readAt fields from matches table
    await queryRunner.query(`ALTER TABLE "matches" DROP COLUMN "readAt"`);
    await queryRunner.query(`ALTER TABLE "matches" DROP COLUMN "isRead"`);

    // Remove isRead and readAt fields from interest_requests table
    await queryRunner.query(
      `ALTER TABLE "interest_requests" DROP COLUMN "readAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "interest_requests" DROP COLUMN "isRead"`,
    );
  }
}
