import { Module } from '@nestjs/common';
import { StatesService } from './states.service';
import { BlockchainModule } from '../../blockchain/blockchain.module';
import { DatabaseModule } from '../../database/database.module';

@Module({
	imports: [BlockchainModule, DatabaseModule],
	providers: [StatesService],
	exports: [StatesService],
})
export class StatesModule {}