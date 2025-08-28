import { Module } from '@nestjs/common';
import { ProviderService } from './provider.service';
import { CoreContractsService } from './core-contracts.service';

@Module({
	providers: [ProviderService, CoreContractsService],
	exports: [ProviderService, CoreContractsService],
})
export class BlockchainModule {}
