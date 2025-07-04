import { Module } from '@nestjs/common';
import { ChallengeController } from './challenge.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
	imports: [DatabaseModule],
	controllers: [ChallengeController],
})
export class ChallengeModule {}
