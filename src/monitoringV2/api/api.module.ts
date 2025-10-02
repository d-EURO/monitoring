import { Module } from '@nestjs/common';
import { ApiController } from './api.controller';
import { PrismaClientService } from '../prisma/client.service';
import { AppConfigService } from '../../config/config.service';
import { BlockchainVerificationService } from '../blockchain-verification.service';
import { ProviderService } from '../provider.service';

@Module({
	controllers: [ApiController],
	providers: [PrismaClientService, AppConfigService, ProviderService, BlockchainVerificationService],
})
export class ApiModule {}
