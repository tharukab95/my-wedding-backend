import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveLookingForFieldsFromMatrimonialAds1758624706186 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Remove looking for fields from matrimonial_ads table
        await queryRunner.query(`ALTER TABLE "matrimonial_ads" DROP COLUMN IF EXISTS "migrationPlans"`);
        await queryRunner.query(`ALTER TABLE "matrimonial_ads" DROP COLUMN IF EXISTS "skinTone"`);
        await queryRunner.query(`ALTER TABLE "matrimonial_ads" DROP COLUMN IF EXISTS "minAge"`);
        await queryRunner.query(`ALTER TABLE "matrimonial_ads" DROP COLUMN IF EXISTS "maxAge"`);
        await queryRunner.query(`ALTER TABLE "matrimonial_ads" DROP COLUMN IF EXISTS "preferredEducation"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Add back the looking for fields to matrimonial_ads table
        await queryRunner.query(`ALTER TABLE "matrimonial_ads" ADD "migrationPlans" character varying`);
        await queryRunner.query(`ALTER TABLE "matrimonial_ads" ADD "skinTone" character varying`);
        await queryRunner.query(`ALTER TABLE "matrimonial_ads" ADD "minAge" character varying`);
        await queryRunner.query(`ALTER TABLE "matrimonial_ads" ADD "maxAge" character varying`);
        await queryRunner.query(`ALTER TABLE "matrimonial_ads" ADD "preferredEducation" character varying`);
    }

}
