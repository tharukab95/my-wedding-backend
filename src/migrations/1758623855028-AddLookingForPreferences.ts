import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLookingForPreferences1758623855028
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "looking_for_preferences" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "matrimonialAdId" uuid NOT NULL, "migrationPlans" character varying, "skinTone" character varying, "minAge" character varying, "maxAge" character varying, "preferredEducation" character varying, "preferredProfessions" json, "preferredHabits" json, "additionalPreferences" json, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_looking_for_preferences_matrimonial_ad" UNIQUE ("matrimonialAdId"), CONSTRAINT "PK_looking_for_preferences_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "looking_for_preferences" ADD CONSTRAINT "FK_looking_for_preferences_matrimonial_ad" FOREIGN KEY ("matrimonialAdId") REFERENCES "matrimonial_ads"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "looking_for_preferences" DROP CONSTRAINT "FK_looking_for_preferences_matrimonial_ad"`,
    );
    await queryRunner.query(`DROP TABLE "looking_for_preferences"`);
  }
}
