import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateEntities1758614143733 implements MigrationInterface {
  name = 'UpdateEntities1758614143733';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "firebaseUserId" character varying NOT NULL, "phoneNumber" character varying, "isVerified" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_1ebf192be0cd17d1c6f88367855" UNIQUE ("firebaseUserId"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "preferred_habits" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "matrimonialAdId" uuid NOT NULL, "habit" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_bd220a3a6f060029990ab8b3a7d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "preferred_professions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "matrimonialAdId" uuid NOT NULL, "profession" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ffa968befb032993637a73e1acf" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum" AS ENUM('match', 'interest', 'message', 'system')`,
    );
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "type" "public"."notifications_type_enum" NOT NULL, "title" text NOT NULL, "message" text NOT NULL, "metadata" json, "isRead" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "readAt" TIMESTAMP, CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "senderId" uuid NOT NULL, "receiverId" uuid NOT NULL, "matchId" uuid NOT NULL, "content" text NOT NULL, "isRead" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "readAt" TIMESTAMP, CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "matrimonial_ads" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "currentPhase" integer NOT NULL DEFAULT '1', "status" character varying NOT NULL DEFAULT 'draft', "advertiserType" character varying, "type" character varying, "birthday" date, "birthTime" TIME, "age" integer, "profession" character varying, "height" character varying, "caste" character varying, "religion" character varying, "ethnicity" character varying, "maritalStatus" character varying, "hasChildren" character varying, "location" character varying, "education" character varying, "languages" json, "hobbies" json, "fatherProfession" character varying, "motherProfession" character varying, "familyStatus" character varying, "brothersCount" integer, "sistersCount" integer, "photosCount" integer NOT NULL DEFAULT '0', "hasHoroscope" boolean NOT NULL DEFAULT false, "migrationPlans" character varying, "skinTone" character varying, "minAge" character varying, "maxAge" character varying, "preferredEducation" character varying, "assets" json, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "submittedAt" TIMESTAMP, "expiresAt" TIMESTAMP, CONSTRAINT "PK_d0d2ddf26bc7be5cc28b9d07796" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "matches" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user1Id" uuid NOT NULL, "user2Id" uuid NOT NULL, "ad1Id" uuid NOT NULL, "ad2Id" uuid NOT NULL, "compatibilityScore" double precision NOT NULL DEFAULT '0', "status" character varying NOT NULL DEFAULT 'pending', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "respondedAt" TIMESTAMP, "expiresAt" TIMESTAMP, CONSTRAINT "PK_8a22c7b2e0828988d51256117f4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "interests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "adId" uuid NOT NULL, "status" character varying NOT NULL DEFAULT 'pending', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "respondedAt" TIMESTAMP, CONSTRAINT "PK_a2dc7b6f9a8bcf9e3f9312a879d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."interest_requests_status_enum" AS ENUM('pending', 'accepted', 'rejected', 'expired')`,
    );
    await queryRunner.query(
      `CREATE TABLE "interest_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fromUserId" uuid NOT NULL, "toUserId" uuid NOT NULL, "fromAdId" uuid NOT NULL, "toAdId" uuid NOT NULL, "status" "public"."interest_requests_status_enum" NOT NULL, "compatibilityScore" numeric(5,2) NOT NULL, "porondamScore" numeric(5,2) NOT NULL, "message" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "respondedAt" TIMESTAMP, "expiresAt" TIMESTAMP, CONSTRAINT "PK_7aa400099bea9fef6af2c5bd769" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "contact_exchanges" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "interestRequestId" uuid NOT NULL, "fromUserId" uuid NOT NULL, "toUserId" uuid NOT NULL, "sharedContactInfo" json NOT NULL, "photosShared" boolean NOT NULL DEFAULT false, "horoscopeShared" boolean NOT NULL DEFAULT false, "isMutual" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_9c1722e62763df9064238c36ba" UNIQUE ("interestRequestId"), CONSTRAINT "PK_ad730e62e0f2948289afc0f5b80" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "ad_photos" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "matrimonialAdId" uuid NOT NULL, "fileName" character varying NOT NULL, "filePath" character varying NOT NULL, "fileSize" integer NOT NULL, "mimeType" character varying NOT NULL, "displayOrder" integer NOT NULL DEFAULT '0', "isProfilePhoto" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_86bec958030e4771cd9b14427df" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "ad_horoscopes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "matrimonialAdId" uuid NOT NULL, "fileName" character varying NOT NULL, "filePath" character varying NOT NULL, "fileSize" integer NOT NULL, "mimeType" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_e9feec027ac4b353193cb4df22" UNIQUE ("matrimonialAdId"), CONSTRAINT "PK_5ffe20fcee1368ac86e063debac" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "preferred_habits" ADD CONSTRAINT "FK_72789e6bf6ef2e7ef0d096b36cf" FOREIGN KEY ("matrimonialAdId") REFERENCES "matrimonial_ads"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "preferred_professions" ADD CONSTRAINT "FK_b68c7765ce4bbff191ef401dd91" FOREIGN KEY ("matrimonialAdId") REFERENCES "matrimonial_ads"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_692a909ee0fa9383e7859f9b406" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_2db9cf2b3ca111742793f6c37ce" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_acf951a58e3b9611dd96ce89042" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_5edcb7cc5492029c9de1174aac0" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "matrimonial_ads" ADD CONSTRAINT "FK_675804e0e1096f54eec1b0c02d6" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "matches" ADD CONSTRAINT "FK_490a012c8f323d6f56a9eaf4008" FOREIGN KEY ("user1Id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "matches" ADD CONSTRAINT "FK_171f004c4484d7dc93919cdf439" FOREIGN KEY ("user2Id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "matches" ADD CONSTRAINT "FK_d6eaea9db8d09761cf0f9e3924a" FOREIGN KEY ("ad1Id") REFERENCES "matrimonial_ads"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "matches" ADD CONSTRAINT "FK_d7704faaf577a20c2baffe823c2" FOREIGN KEY ("ad2Id") REFERENCES "matrimonial_ads"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "interests" ADD CONSTRAINT "FK_fb6470f468dbb3882bf3ff01d43" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "interests" ADD CONSTRAINT "FK_e6ab106163322982f2d9f35e016" FOREIGN KEY ("adId") REFERENCES "matrimonial_ads"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "interest_requests" ADD CONSTRAINT "FK_ba7048b5641d941ef205c0c969a" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "interest_requests" ADD CONSTRAINT "FK_da5ba188a9fc37afe601c95387c" FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "interest_requests" ADD CONSTRAINT "FK_8dc308721fac5f46ba40a2819c1" FOREIGN KEY ("fromAdId") REFERENCES "matrimonial_ads"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "interest_requests" ADD CONSTRAINT "FK_0e6d983117426906f58fd28ca74" FOREIGN KEY ("toAdId") REFERENCES "matrimonial_ads"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "contact_exchanges" ADD CONSTRAINT "FK_9c1722e62763df9064238c36bab" FOREIGN KEY ("interestRequestId") REFERENCES "interest_requests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "contact_exchanges" ADD CONSTRAINT "FK_0f9a40a0493e74fc283eec8d8ec" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "contact_exchanges" ADD CONSTRAINT "FK_0b960fe0d8da257d74a69585ae0" FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ad_photos" ADD CONSTRAINT "FK_df273cd57bdc669dec64fd759b4" FOREIGN KEY ("matrimonialAdId") REFERENCES "matrimonial_ads"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ad_horoscopes" ADD CONSTRAINT "FK_e9feec027ac4b353193cb4df22c" FOREIGN KEY ("matrimonialAdId") REFERENCES "matrimonial_ads"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ad_horoscopes" DROP CONSTRAINT "FK_e9feec027ac4b353193cb4df22c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ad_photos" DROP CONSTRAINT "FK_df273cd57bdc669dec64fd759b4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contact_exchanges" DROP CONSTRAINT "FK_0b960fe0d8da257d74a69585ae0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contact_exchanges" DROP CONSTRAINT "FK_0f9a40a0493e74fc283eec8d8ec"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contact_exchanges" DROP CONSTRAINT "FK_9c1722e62763df9064238c36bab"`,
    );
    await queryRunner.query(
      `ALTER TABLE "interest_requests" DROP CONSTRAINT "FK_0e6d983117426906f58fd28ca74"`,
    );
    await queryRunner.query(
      `ALTER TABLE "interest_requests" DROP CONSTRAINT "FK_8dc308721fac5f46ba40a2819c1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "interest_requests" DROP CONSTRAINT "FK_da5ba188a9fc37afe601c95387c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "interest_requests" DROP CONSTRAINT "FK_ba7048b5641d941ef205c0c969a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "interests" DROP CONSTRAINT "FK_e6ab106163322982f2d9f35e016"`,
    );
    await queryRunner.query(
      `ALTER TABLE "interests" DROP CONSTRAINT "FK_fb6470f468dbb3882bf3ff01d43"`,
    );
    await queryRunner.query(
      `ALTER TABLE "matches" DROP CONSTRAINT "FK_d7704faaf577a20c2baffe823c2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "matches" DROP CONSTRAINT "FK_d6eaea9db8d09761cf0f9e3924a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "matches" DROP CONSTRAINT "FK_171f004c4484d7dc93919cdf439"`,
    );
    await queryRunner.query(
      `ALTER TABLE "matches" DROP CONSTRAINT "FK_490a012c8f323d6f56a9eaf4008"`,
    );
    await queryRunner.query(
      `ALTER TABLE "matrimonial_ads" DROP CONSTRAINT "FK_675804e0e1096f54eec1b0c02d6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_5edcb7cc5492029c9de1174aac0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_acf951a58e3b9611dd96ce89042"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_2db9cf2b3ca111742793f6c37ce"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_692a909ee0fa9383e7859f9b406"`,
    );
    await queryRunner.query(
      `ALTER TABLE "preferred_professions" DROP CONSTRAINT "FK_b68c7765ce4bbff191ef401dd91"`,
    );
    await queryRunner.query(
      `ALTER TABLE "preferred_habits" DROP CONSTRAINT "FK_72789e6bf6ef2e7ef0d096b36cf"`,
    );
    await queryRunner.query(`DROP TABLE "ad_horoscopes"`);
    await queryRunner.query(`DROP TABLE "ad_photos"`);
    await queryRunner.query(`DROP TABLE "contact_exchanges"`);
    await queryRunner.query(`DROP TABLE "interest_requests"`);
    await queryRunner.query(
      `DROP TYPE "public"."interest_requests_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "interests"`);
    await queryRunner.query(`DROP TABLE "matches"`);
    await queryRunner.query(`DROP TABLE "matrimonial_ads"`);
    await queryRunner.query(`DROP TABLE "messages"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
    await queryRunner.query(`DROP TABLE "preferred_professions"`);
    await queryRunner.query(`DROP TABLE "preferred_habits"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
