import { Module } from '@nestjs/common';
import { MulticallService, PriceService } from './services';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
	imports: [BlockchainModule],
	providers: [MulticallService, PriceService],
	exports: [MulticallService, PriceService],
})
export class CommonModule {}
