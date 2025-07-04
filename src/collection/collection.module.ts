import { Module } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { DatabaseModule } from '../database/database.module';
import { BlockchainModule } from '../blockchain/blockchain.module';

// Domain modules
import { DeuroModule } from './deuro/deuro.module';
import { PositionsModule } from './positions/positions.module';
import { ChallengesModule } from './challenges/challenges.module';
import { MintersModule } from './minters/minters.module';

@Module({
	imports: [DatabaseModule, BlockchainModule, DeuroModule, PositionsModule, ChallengesModule, MintersModule],
	providers: [MonitoringService],
	exports: [MonitoringService],
})
export class CollectionModule {}
