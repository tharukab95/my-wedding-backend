import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePricingPlansTable1758832187868
  implements MigrationInterface
{
  name = 'CreatePricingPlansTable1758832187868';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "pricing_plans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "duration" character varying NOT NULL, "price" numeric(10,2) NOT NULL, "currency" character varying NOT NULL DEFAULT 'LKR', "features" json NOT NULL, "popular" boolean NOT NULL DEFAULT false, "isActive" boolean NOT NULL DEFAULT true, "discountPercentage" numeric(5,2), "discountStartDate" TIMESTAMP, "discountEndDate" TIMESTAMP, "discountDescription" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_pricing_plans_id" PRIMARY KEY ("id"))`,
    );

    // Insert default pricing plans
    await queryRunner.query(`
            INSERT INTO "pricing_plans" ("name", "duration", "price", "currency", "features", "popular", "isActive") VALUES
            ('Basic', '2 weeks', 1500.00, 'LKR', '["One matrimonial ad listing", "1 free profile boost", "Standard visibility", "Visible to all searches", "Option to upgrade to featured"]', false, true),
            ('Standard', '1 month', 2500.00, 'LKR', '["One matrimonial ad listing", "3 free profile boosts", "Priority listing", "Featured in ''new ads'' section", "Free extension discount if re-listed"]', true, true),
            ('Premium', '2 months', 4500.00, 'LKR', '["One matrimonial ad listing", "7 free profile boosts", "Top placement priority", "Featured & highlighted", "Newsletter & homepage carousel", "Bonus in-site promotion"]', false, true)
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "pricing_plans"`);
  }
}
