import { Module } from '@nestjs/common';
import { AppConfigService } from '../config/config.service';
import { ProviderService } from '../blockchain/provider.service';
import { PrismaClientService } from './prisma/client.service';
import { EventsRepository } from './prisma/repositories/events.repository';
import { SyncStateRepository } from './prisma/repositories/sync-state.repository';
import { ContractRepository } from './prisma/repositories/contract.repository';
import { ContractService } from './contract.service';
import { EventService } from './event.service';
import { MonitoringServiceV2 } from './monitoring.service';

@Module({
	imports: [],
	providers: [
		AppConfigService,
		ProviderService,
		PrismaClientService,
		EventsRepository,
		SyncStateRepository,
		ContractRepository,
		ContractService,
		EventService,
		MonitoringServiceV2,
	],
	exports: [MonitoringServiceV2, ContractService, EventService],
})
export class MonitoringV2Module {}