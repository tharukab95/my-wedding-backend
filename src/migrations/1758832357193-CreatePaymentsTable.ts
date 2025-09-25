import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePaymentsTable1758832357193 implements MigrationInterface {
    name = 'CreatePaymentsTable1758832357193'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orderId" character varying NOT NULL, "userId" uuid NOT NULL, "adId" uuid NOT NULL, "pricingPlanId" uuid NOT NULL, "amount" numeric(10,2) NOT NULL, "originalAmount" numeric(10,2), "discountPercentage" numeric(5,2), "currency" character varying NOT NULL DEFAULT 'LKR', "status" character varying NOT NULL DEFAULT 'pending', "payherePaymentId" character varying, "payhereMethod" character varying, "paidAt" TIMESTAMP, "expiresAt" TIMESTAMP, "failureReason" text, "payhereResponse" json, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_payments_orderId" UNIQUE ("orderId"), CONSTRAINT "PK_payments_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_payments_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_payments_adId" FOREIGN KEY ("adId") REFERENCES "matrimonial_ads"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_payments_pricingPlanId" FOREIGN KEY ("pricingPlanId") REFERENCES "pricing_plans"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        
        // Create indexes for better performance
        await queryRunner.query(`CREATE INDEX "IDX_payments_userId" ON "payments" ("userId")`);
        await queryRunner.query(`CREATE INDEX "IDX_payments_adId" ON "payments" ("adId")`);
        await queryRunner.query(`CREATE INDEX "IDX_payments_status" ON "payments" ("status")`);
        await queryRunner.query(`CREATE INDEX "IDX_payments_expiresAt" ON "payments" ("expiresAt")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_payments_expiresAt"`);
        await queryRunner.query(`DROP INDEX "IDX_payments_status"`);
        await queryRunner.query(`DROP INDEX "IDX_payments_adId"`);
        await queryRunner.query(`DROP INDEX "IDX_payments_userId"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_payments_pricingPlanId"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_payments_adId"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_payments_userId"`);
        await queryRunner.query(`DROP TABLE "payments"`);
    }
}