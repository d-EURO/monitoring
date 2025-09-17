import { Module } from '@nestjs/common';
import { AppConfigService } from '../config/config.service';
import { ProviderService } from '../blockchain/provider.service';
import { PrismaClientService } from './prisma/client.service';
import { EventsRepository } from './prisma/repositories/events.repository';
import { SyncStateRepository } from './prisma/repositories/sync-state.repository';
import { ContractRepository } from './prisma/repositories/contract.repository';
import { TokenRepository } from './prisma/repositories/token.repository';
import { PositionRepository } from './prisma/repositories/position.repository';
import { ContractService } from './contract.service';
import { EventService } from './event.service';
import { TokenService } from './token.service';
import { PositionService } from './position.service';
import { MonitoringServiceV2 } from './monitoring.service';
import { SchemaInitService } from './schema-init.service';

@Module({
	imports: [],
	providers: [
		SchemaInitService, // Initialize schema first
		AppConfigService,
		ProviderService,
		PrismaClientService,
		EventsRepository,
		SyncStateRepository,
		ContractRepository,
		TokenRepository,
		PositionRepository,
		ContractService,
		EventService,
		TokenService,
		PositionService,
		MonitoringServiceV2,
	],
	exports: [MonitoringServiceV2, ContractService, EventService],
})
export class MonitoringV2Module {}