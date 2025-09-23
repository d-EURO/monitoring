import { Injectable, Logger } from '@nestjs/common';
import { ChallengeState, ChallengeStartedEvent } from './types';
import { AppConfigService } from '../config/config.service';
import { MintingHubV2ABI, ADDRESS } from '@deuro/eurocoin';
import { ethers } from 'ethers';
import { ProviderService } from './provider.service';
import { ChallengeRepository } from './prisma/repositories/challenge.repository';
import { EventsRepository } from './prisma/repositories/events.repository';

@Injectable()
export class ChallengeService {
	private readonly logger = new Logger(ChallengeService.name);
	private existingChallenges = new Set<number>();

	constructor(
		private readonly config: AppConfigService,
		private readonly challengeRepo: ChallengeRepository,
		private readonly eventsRepo: EventsRepository,
		private readonly providerService: ProviderService
	) {}

	async initialize(): Promise<void> {
		const challengeIds = await this.challengeRepo.findAllChallengeIds();
		this.existingChallenges = new Set(challengeIds);
		this.logger.log(`Loaded ${this.existingChallenges.size} existing challenges`);
	}

	async syncChallenges(): Promise<void> {
		const challengeStartedEvents = await this.eventsRepo.getChallengeStartedEvents();
		if (challengeStartedEvents.length === 0) return;

		// Fetch on-chain data
		const challengeStates = await this.fetchChallengeData(challengeStartedEvents);

		// Persist
		const newStates = challengeStates.filter((c) => c.challengerAddress !== undefined);
		const existingStates = challengeStates.filter((c) => c.challengerAddress === undefined);
		if (newStates.length > 0) await this.challengeRepo.createMany(newStates);
		if (existingStates.length > 0) await this.challengeRepo.updateMany(existingStates);

		// Update cache
		for (const challenge of challengeStates) this.existingChallenges.add(challenge.challengeId);
		this.logger.log(`Successfully synced ${challengeStates.length} challenge states`);
	}

	private async fetchChallengeData(challengeStartedEvents: ChallengeStartedEvent[]): Promise<Partial<ChallengeState>[]> {
		const multicallProvider = this.providerService.multicallProvider;
		const mintingHub = new ethers.Contract(ADDRESS[this.config.blockchainId].mintingHubGateway, MintingHubV2ABI, multicallProvider);
		const timestamp = new Date();

		// Fetch on-chain data
		const calls: Promise<any>[] = [];
		for (const event of challengeStartedEvents) {
			calls.push(mintingHub.challenges(event.challengeId).catch(() => ({ size: 0n })));
			calls.push(mintingHub.price(event.challengeId).catch(() => 0n));
		}

		// Execute multicall
		const responses = await Promise.all(calls);

		let responseIndex = 0;
		const challenges: Partial<ChallengeState>[] = [];
		for (const event of challengeStartedEvents) {
			const isNew = !this.existingChallenges.has(event.challengeId);
			const challengeData = responses[responseIndex++];
			const currentPrice = responses[responseIndex++];
			const state: Partial<ChallengeState> = {
				challengeId: event.challengeId,
				size: challengeData.size || 0n,
				currentPrice,
				timestamp,
			};

			if (isNew) {
				state.challengerAddress = event.challenger;
				state.positionAddress = event.position;
				state.startTimestamp = event.timestamp;
				state.initialSize = event.size;
			}

			challenges.push(state);
		}

		return challenges;
	}
}
