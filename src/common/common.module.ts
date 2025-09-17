import { Module } from '@nestjs/common';
import { PriceService } from './services';

@Module({
	imports: [],
	providers: [PriceService],
	exports: [PriceService],
})
export class CommonModule {}
