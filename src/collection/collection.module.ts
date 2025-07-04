import { Module } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { DatabaseModule } from '../database/database.module';
import { BlockchainModule } from '../blockchain/blockchain.module';

// Domain modules
import { DeuroModule } from './deuro/deuro.module';
import { PositionModule } from './position/position.module';
import { ChallengeModule } from './challenge/challenge.module';
import { MinterModule } from './minter/minter.module';

@Module({
	imports: [DatabaseModule, BlockchainModule, DeuroModule, PositionModule, ChallengeModule, MinterModule],
	providers: [MonitoringService],
	exports: [MonitoringService],
})
export class CollectionModule {}
