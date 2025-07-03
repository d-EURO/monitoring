import { Module } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { EventsModule } from './events/events.module';
import { StatesModule } from './states/states.module';
import { DatabaseModule } from '../database/database.module';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
	imports: [DatabaseModule, BlockchainModule, EventsModule, StatesModule],
	providers: [MonitoringService],
	exports: [MonitoringService],
})
export class CollectionModule {}