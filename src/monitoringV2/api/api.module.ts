import { Module } from '@nestjs/common';
import { ApiController } from './api.controller';
import { PrismaClientService } from '../prisma/client.service';
import { AppConfigService } from '../../config/config.service';

@Module({
	controllers: [ApiController],
	providers: [PrismaClientService, AppConfigService],
})
export class ApiModule {}
