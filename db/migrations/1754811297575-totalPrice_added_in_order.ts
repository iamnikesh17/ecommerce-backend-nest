import { MigrationInterface, QueryRunner } from "typeorm";

export class TotalPriceAddedInOrder1754811297575 implements MigrationInterface {
    name = 'TotalPriceAddedInOrder1754811297575'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "order" ADD "totalPrice" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "totalPrice"`);
    }

}
