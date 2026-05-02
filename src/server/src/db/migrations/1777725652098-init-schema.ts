import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1777725652098 implements MigrationInterface {
    name = 'InitSchema1777725652098'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."check_ins_sync_status_enum" AS ENUM('synced', 'pending_sync')`);
        await queryRunner.query(`CREATE TABLE "check_ins" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "registration_id" uuid NOT NULL, "staff_id" uuid NOT NULL, "sync_status" "public"."check_ins_sync_status_enum" NOT NULL, "device_id" character varying(100) NOT NULL, "checked_in_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_ec62eb9e9e2b46305f66e50272c" UNIQUE ("registration_id"), CONSTRAINT "REL_ec62eb9e9e2b46305f66e50272" UNIQUE ("registration_id"), CONSTRAINT "PK_fac7f27bc829a454ad477c13f62" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."users_user_role_enum" AS ENUM('student', 'staff', 'admin')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "student_id" character varying(10), "full_name" character varying(100) NOT NULL, "email" character varying NOT NULL, "password_hash" character varying, "user_role" "public"."users_user_role_enum" NOT NULL DEFAULT 'student', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."payments_status_enum" AS ENUM('pending', 'success', 'failed', 'system_failure')`);
        await queryRunner.query(`CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "registration_id" uuid NOT NULL, "idempotency_key" character varying(100), "transaction_id" character varying(255), "status" "public"."payments_status_enum" NOT NULL DEFAULT 'pending', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_dcf8450959aadff1b025a2434d7" UNIQUE ("registration_id"), CONSTRAINT "UQ_59dcef70bd19850783c84f840e5" UNIQUE ("idempotency_key"), CONSTRAINT "REL_dcf8450959aadff1b025a2434d" UNIQUE ("registration_id"), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."registrations_status_enum" AS ENUM('pending', 'confirmed', 'cancelled', 'system_failure', 'checked_in')`);
        await queryRunner.query(`CREATE TABLE "registrations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "workshop_id" uuid NOT NULL, "status" "public"."registrations_status_enum" NOT NULL DEFAULT 'pending', "qr_code" character varying(255), "registered_at" TIMESTAMP NOT NULL DEFAULT now(), "expires_at" TIMESTAMP WITH TIME ZONE, "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_5704d03a9fa1e1dd0467adfa0de" UNIQUE ("qr_code"), CONSTRAINT "PK_6013e724d7b22929da9cd7282d1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_active_registration" ON "registrations" ("workshop_id", "user_id") WHERE status NOT IN ('cancelled', 'system_failure')`);
        await queryRunner.query(`CREATE TABLE "workshops" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(255) NOT NULL, "detail" text NOT NULL, "capacity" integer NOT NULL, "registered_count" integer NOT NULL DEFAULT '0', "price" numeric(10,2) NOT NULL DEFAULT '0', "start_time" TIMESTAMP WITH TIME ZONE NOT NULL, "end_time" TIMESTAMP WITH TIME ZONE NOT NULL, "room" character varying(100) NOT NULL, "speaker" character varying(100) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6d0e82a124f5b53df91c8989848" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_workshops_start_time" ON "workshops" ("start_time") `);
        await queryRunner.query(`ALTER TABLE "check_ins" ADD CONSTRAINT "FK_ec62eb9e9e2b46305f66e50272c" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "check_ins" ADD CONSTRAINT "FK_a8f00d1aa1dfd6f6307e1abe494" FOREIGN KEY ("staff_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_dcf8450959aadff1b025a2434d7" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "registrations" ADD CONSTRAINT "FK_6aacc9b213fd8c881af6c738ecf" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "registrations" ADD CONSTRAINT "FK_baa074efd7d8645f5bce29953e2" FOREIGN KEY ("workshop_id") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "registrations" DROP CONSTRAINT "FK_baa074efd7d8645f5bce29953e2"`);
        await queryRunner.query(`ALTER TABLE "registrations" DROP CONSTRAINT "FK_6aacc9b213fd8c881af6c738ecf"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_dcf8450959aadff1b025a2434d7"`);
        await queryRunner.query(`ALTER TABLE "check_ins" DROP CONSTRAINT "FK_a8f00d1aa1dfd6f6307e1abe494"`);
        await queryRunner.query(`ALTER TABLE "check_ins" DROP CONSTRAINT "FK_ec62eb9e9e2b46305f66e50272c"`);
        await queryRunner.query(`DROP INDEX "public"."idx_workshops_start_time"`);
        await queryRunner.query(`DROP TABLE "workshops"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_active_registration"`);
        await queryRunner.query(`DROP TABLE "registrations"`);
        await queryRunner.query(`DROP TYPE "public"."registrations_status_enum"`);
        await queryRunner.query(`DROP TABLE "payments"`);
        await queryRunner.query(`DROP TYPE "public"."payments_status_enum"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_user_role_enum"`);
        await queryRunner.query(`DROP TABLE "check_ins"`);
        await queryRunner.query(`DROP TYPE "public"."check_ins_sync_status_enum"`);
    }

}
