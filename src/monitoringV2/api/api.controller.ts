import { Controller, Get } from '@nestjs/common';
import { PrismaClientService } from '../prisma/client.service';
import {
	ChallengeResponse,
	ChallengeStatus,
	CollateralResponse,
	HealthResponse,
	PositionResponse,
	PositionStatus,
} from '../../../shared/types';
import type { Token, PositionState } from '@prisma/client';

const deuroDecimals = 18;

@Controller()
export class ApiController {
	constructor(private readonly prisma: PrismaClientService) {}

	@Get('health')
	async health(): Promise<HealthResponse> {
		const lastBlock = await this.prisma.syncState.findFirst();
		return {
			status: 'ok',
			lastProcessedBlock: lastBlock?.lastProcessedBlock || 0,
			updatedAt: lastBlock?.updatedAt?.toISOString() || 'unknown',
		};
	}

	@Get('positions')
	async getPositions(): Promise<PositionResponse[]> {
		const positions = await this.prisma.positionState.findMany();
		const tokens = await this.prisma.token.findMany();
		const tokenMap = new Map<string, Token>(tokens.map((t) => [t.address.toLowerCase(), t]));

		return positions.map((p) => {
			const token = tokenMap.get(p.collateral.toLowerCase());
			const collateralDecimals = token?.decimals || 18;
			const pricePrecision = 36 - collateralDecimals;

			const marketPrice = token?.price ? Number(token.price.toString()) : 0;
			const formattedVirtualPrice = Number(p.virtualPrice.toFixed(0)) / Math.pow(10, pricePrecision);
			const collateralizationRatio =
				formattedVirtualPrice > 0 && marketPrice > 0 ? ((marketPrice / formattedVirtualPrice) * 100).toFixed(2) : '0';

			const currentTime = Math.floor(Date.now() / 1000);
			const status =
				p.isClosed && p.collateralAmount.gte(p.minimumCollateral)
					? PositionStatus.DENIED
					: currentTime < Number(p.startTimestamp)
						? PositionStatus.PROPOSED
						: p.isClosed
							? PositionStatus.CLOSED
							: p.challengedAmount.toFixed(0) !== '0'
								? PositionStatus.CHALLENGED
								: Number(collateralizationRatio) < 100
									? PositionStatus.UNDERCOLLATERALIZED
									: Number(p.cooldown) > currentTime
										? PositionStatus.COOLDOWN
										: Number(p.expiration) <= currentTime
											? PositionStatus.EXPIRED
											: PositionStatus.OPEN;

			return {
				address: p.address,
				status,
				owner: p.owner,
				original: p.original,
				collateral: p.collateral,
				collateralSymbol: token?.symbol || 'UNKNOWN',
				collateralBalance: (Number(p.collateralAmount.toFixed(0)) / Math.pow(10, collateralDecimals)).toString(),
				minimumCollateral: (Number(p.minimumCollateral.toFixed(0)) / Math.pow(10, collateralDecimals)).toString(),
				price: (Number(p.price.toFixed(0)) / Math.pow(10, pricePrecision)).toString(),
				virtualPrice: formattedVirtualPrice.toString(),
				expiredPurchasePrice: (Number(p.expiredPurchasePrice.toFixed(0)) / Math.pow(10, pricePrecision)).toString(),
				collateralRequirement: (Number(p.collateralRequirement.toFixed(0)) / Math.pow(10, deuroDecimals)).toString(),
				debt: (Number(p.debt.toFixed(0)) / Math.pow(10, deuroDecimals)).toString(),
				interest: (Number(p.interest.toFixed(0)) / Math.pow(10, deuroDecimals)).toString(),
				principal: (Number(p.principal.toFixed(0)) / Math.pow(10, deuroDecimals)).toString(),
				limitAmount: (Number(p.limit.toFixed(0)) / Math.pow(10, deuroDecimals)).toString(),
				availableForMinting: (Number(p.availableForMinting.toFixed(0)) / Math.pow(10, deuroDecimals)).toString(),
				availableForClones: (Number(p.availableForClones.toFixed(0)) / Math.pow(10, deuroDecimals)).toString(),
				challengedAmount: (Number(p.challengedAmount.toFixed(0)) / Math.pow(10, deuroDecimals)).toString(),
				riskPremiumPpm: p.riskPremiumPpm,
				reserveContribution: p.reserveContribution,
				fixedAnnualRatePpm: p.fixedAnnualRatePpm,
				start: p.startTimestamp.toFixed(0),
				cooldown: p.cooldown.toFixed(0),
				expiration: p.expiration.toFixed(0),
				challengePeriod: p.challengePeriod.toFixed(0),
				isClosed: p.isClosed,
				created: p.created.toISOString(),
				marketPrice: marketPrice.toString(),
				collateralizationRatio: collateralizationRatio,
			};
		});
	}

	@Get('challenges')
	async getChallenges(): Promise<ChallengeResponse[]> {
		// TODO (later): Create custom Prisma query tokens, positions and challenges in one go
		const tokens = await this.prisma.token.findMany();
		const tokenMap = new Map<string, Token>(tokens.map((t) => [t.address.toLowerCase(), t]));
		const positions = await this.prisma.positionState.findMany();
		const positionMap = new Map<string, PositionState>(positions.map((p) => [p.address.toLowerCase(), p]));
		const challenges = await this.prisma.challengeState.findMany({ orderBy: { startTimestamp: 'desc' } });

		return challenges.map((c) => {
			const position = positionMap.get(c.positionAddress.toLowerCase());
			const token = tokenMap.get(position.collateral.toLowerCase());
			const collateralDecimals = token?.decimals || 18;
			const pricePrecision = 36 - collateralDecimals;

			const currentTime = Math.floor(Date.now() / 1000);
			const challengePeriod = position ? Number(position.challengePeriod.toString()) : 0;
			const auctionStart = c.startTimestamp + BigInt(challengePeriod);
			const auctionEnd = auctionStart + BigInt(challengePeriod);
			const status =
				c.size.toFixed(0) === '0' || currentTime > Number(auctionEnd)
					? ChallengeStatus.ENDED
					: currentTime < Number(auctionStart)
						? ChallengeStatus.AVERTING
						: ChallengeStatus.AUCTION;

			return {
				id: c.challengeId,
				challenger: c.challengerAddress,
				position: c.positionAddress,
				initialSize: (Number(c.initialSize.toFixed(0)) / Math.pow(10, collateralDecimals)).toString(),
				size: (Number(c.size.toFixed(0)) / Math.pow(10, collateralDecimals)).toString(),
				currentPrice: (Number(c.currentPrice.toFixed(0)) / Math.pow(10, pricePrecision)).toString(),
				start: Number(c.startTimestamp),
				liquidationPrice: position ? (Number(position.virtualPrice.toFixed(0)) / Math.pow(10, pricePrecision)).toString() : '0',
				collateral: position?.collateral || '0x0',
				collateralSymbol: token?.symbol || 'UNKNOWN',
				collateralBalance:
					position && token ? (Number(position.collateralAmount.toFixed(0)) / Math.pow(10, collateralDecimals)).toString() : '0',
				challengePeriod: challengePeriod.toString(),
				status,
			};
		});
	}

	@Get('collateral')
	async getCollateral(): Promise<CollateralResponse[]> {
		const tokens = await this.prisma.token.findMany();
		const collaterals = await this.prisma.collateralState.findMany();
		const tokenMap = new Map<string, Token>(tokens.map((t) => [t.address.toLowerCase(), t]));

		return collaterals.map((c) => {
			const token = tokenMap.get(c.tokenAddress.toLowerCase());
			const tokenMarketPrice = token?.price ? Number(token.price.toString()) : 0;
			return {
				collateral: c.tokenAddress,
				symbol: token?.symbol || 'UNKNOWN',
				price: tokenMarketPrice.toString(),
				totalCollateral: (Number(c.totalCollateral.toFixed(0)) / Math.pow(10, token?.decimals || 18)).toString(),
				totalLimit: (Number(c.totalLimit.toFixed(0)) / Math.pow(10, deuroDecimals)).toString(),
				totalAvailableForMinting: (Number(c.totalAvailableForMinting.toFixed(0)) / Math.pow(10, deuroDecimals)).toString(),
				positionCount: c.positionCount,
				timestamp: c.timestamp,
			};
		});
	}

	// TODO: Implement these endpoints when we have the necessary tables
	@Get('deuro')
	async getDeuroState() {
		return null; // Needs system_state table
	}

	@Get('minters')
	async getMinters() {
		return []; // Needs minter_states table
	}

	@Get('minters/bridges')
	async getBridges() {
		return []; // Needs minter_states table with bridge data
	}
}
