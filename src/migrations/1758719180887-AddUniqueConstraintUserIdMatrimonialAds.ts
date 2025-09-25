import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueConstraintUserIdMatrimonialAds1758719180887
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, clean up duplicate ads - keep only the latest one for each user
    await queryRunner.query(`
            DELETE FROM matrimonial_ads 
            WHERE id NOT IN (
                SELECT DISTINCT ON ("userId") id 
                FROM matrimonial_ads 
                ORDER BY "userId", "createdAt" DESC
            )
        `);

    // Add unique constraint on userId
    await queryRunner.query(
      `ALTER TABLE "matrimonial_ads" ADD CONSTRAINT "UQ_matrimonial_ads_userId" UNIQUE ("userId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the unique constraint
    await queryRunner.query(
      `ALTER TABLE "matrimonial_ads" DROP CONSTRAINT "UQ_matrimonial_ads_userId"`,
    );
  }
}
