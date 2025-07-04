import { Module } from '@nestjs/common';
import { PositionController } from './position.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
	imports: [DatabaseModule],
	controllers: [PositionController],
})
export class PositionModule {}
