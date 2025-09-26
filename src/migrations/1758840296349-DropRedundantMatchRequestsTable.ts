import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropRedundantMatchRequestsTable1758840296349 implements MigrationInterface {
  name = 'DropRedundantMatchRequestsTable1758840296349';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the redundant match_requests table
    await queryRunner.query(`DROP TABLE IF EXISTS "match_requests"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate the match_requests table if needed (for rollback)
    await queryRunner.query(`
      CREATE TABLE "match_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "requesterUserId" uuid NOT NULL,
        "targetAdId" uuid NOT NULL,
        "message" text,
        "status" character varying NOT NULL DEFAULT 'pending',
        "responseMessage" text,
        "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
        "updatedAt" timestamp without time zone NOT NULL DEFAULT now(),
        "respondedAt" timestamp without time zone,
        "expiresAt" timestamp without time zone,
        CONSTRAINT "PK_7349a97326e887defffe4531598" PRIMARY KEY ("id"),
        CONSTRAINT "FK_2d6b34e5be892a21d620d412a45" FOREIGN KEY ("targetAdId") REFERENCES "matrimonial_ads"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_8d889e792320693e1ceed322d1e" FOREIGN KEY ("requesterUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
  }
}