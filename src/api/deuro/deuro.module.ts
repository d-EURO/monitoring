import { Module } from '@nestjs/common';
import { DeuroController } from './deuro.controller';
import { DeuroService } from './deuro.service';
import { DatabaseModule } from '../../database/database.module';
import { BlockchainModule } from '../../blockchain/blockchain.module';
import { CommonModule } from '../../common/common.module';

@Module({
	imports: [DatabaseModule, BlockchainModule, CommonModule],
	controllers: [DeuroController],
	providers: [DeuroService],
	exports: [DeuroService],
})
export class DeuroModule {}
