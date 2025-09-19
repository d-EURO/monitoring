import { Module } from '@nestjs/common';
import { AppConfigService } from '../config/config.service';
import { ProviderService } from './provider.service';
import { PrismaClientService } from './prisma/client.service';
import { EventsRepository } from './prisma/repositories/events.repository';
import { SyncStateRepository } from './prisma/repositories/sync-state.repository';
import { ContractRepository } from './prisma/repositories/contract.repository';
import { TokenRepository } from './prisma/repositories/token.repository';
import { PositionRepository } from './prisma/repositories/position.repository';
import { ChallengeRepository } from './prisma/repositories/challenge.repository';
import { ContractService } from './contract.service';
import { EventService } from './event.service';
import { TokenService } from './token.service';
import { PositionService } from './position.service';
import { ChallengeService } from './challenge.service';
import { MonitoringService } from './monitoring.service';
import { SchemaInitService } from './schema-init.service';
import { PriceService } from './price.service';
import { ApiModule } from './api/api.module';

@Module({
	imports: [ApiModule],
	providers: [
		SchemaInitService, // Initialize schema first
		ProviderService,
		PriceService,
		AppConfigService,
		ProviderService,
		PrismaClientService,
		PriceService,
		EventsRepository,
		SyncStateRepository,
		ContractRepository,
		TokenRepository,
		PositionRepository,
		ChallengeRepository,
		ContractService,
		EventService,
		TokenService,
		PositionService,
		ChallengeService,
		MonitoringService,
	],
	exports: [MonitoringService, ContractService, EventService, ApiModule],
})
export class MonitoringV2Module {}
