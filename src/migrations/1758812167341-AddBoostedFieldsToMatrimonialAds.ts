import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBoostedFieldsToMatrimonialAds1758812167341
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "matrimonial_ads" ADD "isBoosted" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "matrimonial_ads" ADD "boostedAt" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "matrimonial_ads" DROP COLUMN "boostedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "matrimonial_ads" DROP COLUMN "isBoosted"`,
    );
  }
}
