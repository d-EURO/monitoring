import { Module } from '@nestjs/common';
import { MulticallService } from './services';

@Module({
	providers: [MulticallService],
	exports: [MulticallService],
})
export class CommonModule {}