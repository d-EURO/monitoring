import { Injectable, Logger } from '@nestjs/common';
import { PrismaClientService } from '../client.service';
import { ChallengeState } from '../../types';

@Injectable()
export class ChallengeRepository {
	private readonly logger = new Logger(ChallengeRepository.name);

	constructor(private readonly prisma: PrismaClientService) {}

	async createMany(challenges: Partial<ChallengeState>[]): Promise<void> {
		if (challenges.length === 0) return;

		await this.prisma.$transaction(
			challenges.map((c) =>
				this.prisma.challengeState.create({
					data: {
						challengeId: c.challengeId!,
						challengerAddress: c.challengerAddress!.toLowerCase(),
						positionAddress: c.positionAddress!.toLowerCase(),
						startTimestamp: c.startTimestamp!,
						initialSize: c.initialSize!.toString(),
						size: c.size!.toString(),
						currentPrice: c.currentPrice!.toString(),
						timestamp: c.timestamp!,
					},
				})
			)
		);

		this.logger.log(`Successfully created ${challenges.length} new challenge states`);
	}

	async updateMany(challenges: Partial<ChallengeState>[]): Promise<void> {
		if (challenges.length === 0) return;

		await this.prisma.$transaction(
			challenges.map((c) =>
				this.prisma.challengeState.update({
					where: { challengeId: c.challengeId! },
					data: {
						size: c.size!.toString(),
						currentPrice: c.currentPrice!.toString(),
						timestamp: c.timestamp!,
					},
				})
			)
		);

		this.logger.log(`Successfully updated ${challenges.length} existing challenge states`);
	}

	async findAllChallengeIds(): Promise<number[]> {
		const challenges = await this.prisma.challengeState.findMany({
			select: { challengeId: true },
		});
		return challenges.map((c) => c.challengeId);
	}
}
