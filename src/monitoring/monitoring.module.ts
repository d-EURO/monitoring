import { Module } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { MonitoringController } from './monitoring.controller';
import { EventsModule } from '../events/events.module';
import { StatesModule } from '../states/states.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { DatabaseModule } from '../database/database.module';

@Module({
	imports: [DatabaseModule, EventsModule, StatesModule, BlockchainModule],
	controllers: [MonitoringController],
	providers: [MonitoringService],
	exports: [MonitoringService],
})
export class MonitoringModule {}
