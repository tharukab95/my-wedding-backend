import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropRedundantPreferredTables1758625297737
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop redundant preferred_professions and preferred_habits tables
    // These are now replaced by JSON arrays in looking_for_preferences table
    await queryRunner.query(`DROP TABLE IF EXISTS "preferred_professions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "preferred_habits"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate the tables (for rollback purposes)
    await queryRunner.query(
      `CREATE TABLE "preferred_professions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "matrimonialAdId" uuid NOT NULL, "profession" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_preferred_professions_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "preferred_habits" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "matrimonialAdId" uuid NOT NULL, "habit" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_preferred_habits_id" PRIMARY KEY ("id"))`,
    );
  }
}
