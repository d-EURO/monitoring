import { Module } from '@nestjs/common';
import { ApiController } from './api.controller';
import { PrismaClientService } from '../prisma/client.service';
import { AppConfigService } from '../../config/config.service';
import { ProviderService } from '../provider.service';

@Module({
	controllers: [ApiController],
	providers: [PrismaClientService, AppConfigService, ProviderService],
})
export class ApiModule {}
