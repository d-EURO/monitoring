import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { CommonModule } from '../common/common.module';
import { ContractRegistryService } from './contract-registry.service';
import { EventCollectorService } from './event-collector.service';
import { StateUpdaterService } from './state-updater.service';
import { MonitoringService } from './monitoring.service';

@Module({
	imports: [DatabaseModule, BlockchainModule, CommonModule],
	providers: [
		ContractRegistryService,
		EventCollectorService,
		StateUpdaterService,
		MonitoringService
	],
	exports: [MonitoringService, ContractRegistryService, EventCollectorService]
})
export class MonitoringModule {}