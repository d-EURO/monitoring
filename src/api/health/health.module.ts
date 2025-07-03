import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { CollectionModule } from '../../collection/collection.module';
import { DatabaseModule } from '../../database/database.module';
import { BlockchainModule } from '../../blockchain/blockchain.module';

@Module({
	imports: [CollectionModule, DatabaseModule, BlockchainModule],
	controllers: [HealthController],
})
export class HealthModule {}