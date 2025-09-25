import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPerformanceIndexes1758812338503 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Indexes for matrimonial_ads table
        await queryRunner.query(`CREATE INDEX "IDX_matrimonial_ads_status_type" ON "matrimonial_ads" ("status", "type")`);
        await queryRunner.query(`CREATE INDEX "IDX_matrimonial_ads_boosted_submitted" ON "matrimonial_ads" ("isBoosted", "boostedAt", "submittedAt")`);
        await queryRunner.query(`CREATE INDEX "IDX_matrimonial_ads_age_location" ON "matrimonial_ads" ("age", "location")`);
        await queryRunner.query(`CREATE INDEX "IDX_matrimonial_ads_religion_education" ON "matrimonial_ads" ("religion", "education")`);
        await queryRunner.query(`CREATE INDEX "IDX_matrimonial_ads_expires_at" ON "matrimonial_ads" ("expiresAt")`);
        
        // Indexes for interest_requests table
        await queryRunner.query(`CREATE INDEX "IDX_interest_requests_from_user" ON "interest_requests" ("fromUserId")`);
        await queryRunner.query(`CREATE INDEX "IDX_interest_requests_to_ad" ON "interest_requests" ("toAdId")`);
        await queryRunner.query(`CREATE INDEX "IDX_interest_requests_status" ON "interest_requests" ("status")`);
        
        // Indexes for matches table
        await queryRunner.query(`CREATE INDEX "IDX_matches_user1_user2" ON "matches" ("user1Id", "user2Id")`);
        await queryRunner.query(`CREATE INDEX "IDX_matches_ad1_ad2" ON "matches" ("ad1Id", "ad2Id")`);
        await queryRunner.query(`CREATE INDEX "IDX_matches_status" ON "matches" ("status")`);
        
        // Indexes for looking_for_preferences table
        await queryRunner.query(`CREATE INDEX "IDX_looking_for_preferences_ad_id" ON "looking_for_preferences" ("matrimonialAdId")`);
        await queryRunner.query(`CREATE INDEX "IDX_looking_for_preferences_age_range" ON "looking_for_preferences" ("minAge", "maxAge")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes for matrimonial_ads table
        await queryRunner.query(`DROP INDEX "IDX_matrimonial_ads_status_type"`);
        await queryRunner.query(`DROP INDEX "IDX_matrimonial_ads_boosted_submitted"`);
        await queryRunner.query(`DROP INDEX "IDX_matrimonial_ads_age_location"`);
        await queryRunner.query(`DROP INDEX "IDX_matrimonial_ads_religion_education"`);
        await queryRunner.query(`DROP INDEX "IDX_matrimonial_ads_expires_at"`);
        
        // Drop indexes for interest_requests table
        await queryRunner.query(`DROP INDEX "IDX_interest_requests_from_user"`);
        await queryRunner.query(`DROP INDEX "IDX_interest_requests_to_ad"`);
        await queryRunner.query(`DROP INDEX "IDX_interest_requests_status"`);
        
        // Drop indexes for matches table
        await queryRunner.query(`DROP INDEX "IDX_matches_user1_user2"`);
        await queryRunner.query(`DROP INDEX "IDX_matches_ad1_ad2"`);
        await queryRunner.query(`DROP INDEX "IDX_matches_status"`);
        
        // Drop indexes for looking_for_preferences table
        await queryRunner.query(`DROP INDEX "IDX_looking_for_preferences_ad_id"`);
        await queryRunner.query(`DROP INDEX "IDX_looking_for_preferences_age_range"`);
    }

}
