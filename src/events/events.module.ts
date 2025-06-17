import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { DatabaseModule } from '../database/database.module';

@Module({
	imports: [BlockchainModule, DatabaseModule],
	controllers: [],
	providers: [EventsService],
	exports: [EventsService],
})
export class EventsModule {}
