import { Module } from '@nestjs/common';
import { MulticallService, PriceService } from './services';

@Module({
	providers: [MulticallService, PriceService],
	exports: [MulticallService, PriceService],
})
export class CommonModule {}
