import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveAgeFieldFromMatrimonialAds1758814475878
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove the age column from matrimonial_ads table
    await queryRunner.query(`ALTER TABLE "matrimonial_ads" DROP COLUMN "age"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add the age column back
    await queryRunner.query(`ALTER TABLE "matrimonial_ads" ADD "age" integer`);
  }
}
