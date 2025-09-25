import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSkinColorDrinkingSmokingFields1758720580320
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new Phase 2 fields to matrimonial_ads table
    await queryRunner.query(
      `ALTER TABLE "matrimonial_ads" ADD "skinColor" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "matrimonial_ads" ADD "isDrinking" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "matrimonial_ads" ADD "isSmoking" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the new fields
    await queryRunner.query(
      `ALTER TABLE "matrimonial_ads" DROP COLUMN "isSmoking"`,
    );
    await queryRunner.query(
      `ALTER TABLE "matrimonial_ads" DROP COLUMN "isDrinking"`,
    );
    await queryRunner.query(
      `ALTER TABLE "matrimonial_ads" DROP COLUMN "skinColor"`,
    );
  }
}
