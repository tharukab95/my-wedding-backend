import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserAdInteractionTable1758861000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create user_ad_interactions table
    await queryRunner.query(`
      CREATE TABLE "user_ad_interactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "adId" uuid NOT NULL,
        "interactionType" character varying NOT NULL DEFAULT 'viewed',
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_user_ad_interactions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_ad_interactions_user_ad" UNIQUE ("userId", "adId")
      )
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "user_ad_interactions" 
      ADD CONSTRAINT "FK_user_ad_interactions_user" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "user_ad_interactions" 
      ADD CONSTRAINT "FK_user_ad_interactions_ad" 
      FOREIGN KEY ("adId") REFERENCES "matrimonial_ads"("id") ON DELETE CASCADE
    `);

    // Create indexes for better performance
    await queryRunner.query(`
      CREATE INDEX "IDX_user_ad_interactions_userId_interactionType" 
      ON "user_ad_interactions" ("userId", "interactionType")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_ad_interactions_adId_interactionType" 
      ON "user_ad_interactions" ("adId", "interactionType")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_ad_interactions_userId_createdAt" 
      ON "user_ad_interactions" ("userId", "createdAt")
    `);

    // Add trigger to update updatedAt timestamp
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW."updatedAt" = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_user_ad_interactions_updated_at 
      BEFORE UPDATE ON "user_ad_interactions" 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop trigger and function
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS update_user_ad_interactions_updated_at ON "user_ad_interactions"`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS update_updated_at_column()`,
    );

    // Drop indexes
    await queryRunner.query(
      `DROP INDEX "IDX_user_ad_interactions_userId_createdAt"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_user_ad_interactions_adId_interactionType"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_user_ad_interactions_userId_interactionType"`,
    );

    // Drop foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "user_ad_interactions" DROP CONSTRAINT "FK_user_ad_interactions_ad"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_ad_interactions" DROP CONSTRAINT "FK_user_ad_interactions_user"`,
    );

    // Drop table
    await queryRunner.query(`DROP TABLE "user_ad_interactions"`);
  }
}
