import { Injectable, Logger } from '@nestjs/common';
import { PrismaClientService } from '../client.service';
import { PositionState } from '../../types';

@Injectable()
export class PositionRepository {
	private readonly logger = new Logger(PositionRepository.name);

	constructor(private readonly prisma: PrismaClientService) {}

	async createMany(positions: Partial<PositionState>[]): Promise<void> {
		if (positions.length === 0) return;

		await this.prisma.$transaction(
			positions.map((p) =>
				this.prisma.positionState.create({
					data: {
						address: p.address!.toLowerCase(),
						limit: p.limit!.toString(),
						owner: p.owner!.toLowerCase(),
						original: p.original!.toLowerCase(),
						collateral: p.collateral!.toLowerCase(),
						minimumCollateral: p.minimumCollateral!.toString(),
						riskPremiumPpm: p.riskPremiumPpm!,
						reserveContribution: p.reserveContribution!,
						challengePeriod: p.challengePeriod!.toString(),
						startTimestamp: p.startTimestamp!.toString(),
						expiration: p.expiration!.toString(),
						created: p.created,
						price: p.price!.toString(),
						virtualPrice: p.virtualPrice!.toString(),
						collateralAmount: p.collateralAmount!.toString(),
						expiredPurchasePrice: p.expiredPurchasePrice!.toString(),
						collateralRequirement: p.collateralRequirement!.toString(),
						principal: p.principal!.toString(),
						interest: p.interest!.toString(),
						debt: p.debt!.toString(),
						fixedAnnualRatePpm: p.fixedAnnualRatePpm!,
						lastAccrual: p.lastAccrual!.toString(),
						cooldown: p.cooldown!.toString(),
						challengedAmount: p.challengedAmount!.toString(),
						availableForMinting: p.availableForMinting!.toString(),
						availableForClones: p.availableForClones!.toString(),
						isClosed: p.isClosed!,
						timestamp: p.timestamp!,
					},
				})
			)
		);

		this.logger.log(`Successfully created ${positions.length} new position states`);
	}

	async updateMany(positions: Partial<PositionState>[]): Promise<void> {
		if (positions.length === 0) return;

		await this.prisma.$transaction(
			positions.map((p) =>
				this.prisma.positionState.update({
					where: { address: p.address!.toLowerCase() },
					data: {
						price: p.price!.toString(),
						virtualPrice: p.virtualPrice!.toString(),
						collateralAmount: p.collateralAmount!.toString(),
						expiredPurchasePrice: p.expiredPurchasePrice!.toString(),
						collateralRequirement: p.collateralRequirement!.toString(),
						principal: p.principal!.toString(),
						interest: p.interest!.toString(),
						debt: p.debt!.toString(),
						fixedAnnualRatePpm: p.fixedAnnualRatePpm!,
						lastAccrual: p.lastAccrual!.toString(),
						cooldown: p.cooldown!.toString(),
						challengedAmount: p.challengedAmount!.toString(),
						availableForMinting: p.availableForMinting!.toString(),
						availableForClones: p.availableForClones!.toString(),
						isClosed: p.isClosed!,
						timestamp: p.timestamp!,
					},
				})
			)
		);

		this.logger.log(`Successfully updated ${positions.length} existing position states`);
	}

	async findAddresses(): Promise<string[]> {
		const positions = await this.prisma.positionState.findMany({
			select: { address: true },
		});
		return positions.map((p) => p.address);
	}
}
