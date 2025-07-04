import { Module } from '@nestjs/common';
import { DeuroController } from './deuro.controller';
import { DeuroService } from './deuro.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
	imports: [DatabaseModule],
	controllers: [DeuroController],
	providers: [DeuroService],
	exports: [DeuroService],
})
export class DeuroModule {}
