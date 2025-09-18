import { Module } from '@nestjs/common';
import { ApiController } from './api.controller';
import { PrismaClientService } from '../prisma/client.service';

@Module({
	controllers: [ApiController],
	providers: [PrismaClientService],
})
export class ApiModule {}