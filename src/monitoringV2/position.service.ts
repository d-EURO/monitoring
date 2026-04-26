import { Injectable, Logger } from '@nestjs/common';
import { PositionOpenedEvent, PositionState } from './types';
import { AppConfigService } from '../config/config.service';
import { PositionV2ABI, MintingHubV2ABI, ADDRESS, ERC20ABI } from '@deuro/eurocoin';
import { ethers } from 'ethers';
import { ProviderService } from './provider.service';
import { PositionRepository } from './prisma/repositories/position.repository';
import { EventsRepository } from './prisma/repositories/events.repository';
import { TelegramService } from './telegram.service';

// Anything below is suspicious for a clone — the WFPS attacker used a 36-second clone.
const MINI_LIFETIME_THRESHOLD_SECONDS = 86_400n; // 1 day

@Injectable()
export class PositionService {
	private readonly logger = new Logger(PositionService.name);
	private existingPositions = new Set<string>(); // Just track addresses

	constructor(
		private readonly config: AppConfigService,
		private readonly positionRepo: PositionRepository,
		private readonly eventsRepo: EventsRepository,
		private readonly providerService: ProviderService
	) {}

	async initialize(): Promise<void> {
		const addresses = await this.positionRepo.findAddresses();
		this.existingPositions = new Set(addresses.map((a) => a.toLowerCase()));
		this.logger.log(`Loaded ${this.existingPositions.size} existing positions`);
	}

	async syncPositions(): Promise<void> {
		const positionOpenedArgs = await this.eventsRepo.getPositions();
		if (positionOpenedArgs.length === 0) return;

		// Fetch on-chain data
		const positionStates = await this.fetchPositionData(positionOpenedArgs);

		// Persist
		const newStates = positionStates.filter((p) => p.limit !== undefined);
		const existingStates = positionStates.filter((p) => p.limit === undefined);
		if (newStates.length > 0) await this.positionRepo.createMany(newStates);
		if (existingStates.length > 0) await this.positionRepo.updateMany(existingStates);

		// Update cache
		for (const position of positionStates) this.existingPositions.add(position.address.toLowerCase());
		this.logger.log(`Successfully synced ${positionStates.length} position states`);
	}

	private async fetchPositionData(positionOpenedArgs: PositionOpenedEvent[]): Promise<Partial<PositionState>[]> {
		const multicallProvider = this.providerService.multicallProvider;
		const mintingHub = new ethers.Contract(ADDRESS[this.config.blockchainId].mintingHubGateway, MintingHubV2ABI, multicallProvider);

		const deniedPositions = await this.eventsRepo.getDeniedPositions();

		const calls: Array<() => Promise<any>> = [];
		for (const event of positionOpenedArgs) {
			const address = event.address.toLowerCase();
			const isNew = !this.existingPositions.has(address);
			const position = new ethers.Contract(address, PositionV2ABI, multicallProvider);
			const collateralToken = new ethers.Contract(event.collateral, ERC20ABI, multicallProvider);

			// Fixed fields
			if (isNew) {
				calls.push(() => position.limit());
				calls.push(() => position.owner());
				calls.push(() => position.original());
				calls.push(() => position.collateral());
				calls.push(() => position.minimumCollateral());
				calls.push(() => position.riskPremiumPPM());
				calls.push(() => position.reserveContribution());
				calls.push(() => position.challengePeriod());
				calls.push(() => position.start());
				calls.push(() => position.expiration());
			}

			// Dynamic fields
			calls.push(() => position.price());
			calls.push(() => position.virtualPrice());
			calls.push(() => position.getCollateralRequirement());
			calls.push(() => position.principal());
			calls.push(() => position.getInterest());
			calls.push(() => position.getDebt());
			calls.push(() => position.fixedAnnualRatePPM());
			calls.push(() => position.lastAccrual());
			calls.push(() => position.cooldown());
			calls.push(() => position.challengedAmount());
			calls.push(() => position.availableForMinting());
			calls.push(() => position.availableForClones());
			calls.push(() => position.isClosed());
			calls.push(() => mintingHub.expiredPurchasePrice(address));
			calls.push(() => collateralToken.balanceOf(address));
		}

		const responses = await this.providerService.callBatch(calls, 3);

		let idx = 0;
		const results: Partial<PositionState>[] = [];
		for (const event of positionOpenedArgs) {
			const address = event.address.toLowerCase();
			const isNew = !this.existingPositions.has(address);

			const state: Partial<PositionState> = {
				address,
				timestamp: new Date(),
			};

			if (isNew) {
				// Fixed fields
				state.limit = BigInt(responses[idx++]);
				state.owner = responses[idx++];
				state.original = responses[idx++];
				state.collateral = responses[idx++];
				state.minimumCollateral = BigInt(responses[idx++]);
				state.riskPremiumPpm = Number(responses[idx++]);
				state.reserveContribution = Number(responses[idx++]);
				state.challengePeriod = BigInt(responses[idx++]);
				state.startTimestamp = BigInt(responses[idx++]);
				state.expiration = BigInt(responses[idx++]);
				state.created = event.timestamp;
			}

			// Dynamic fields
			state.price = BigInt(responses[idx++]);
			state.virtualPrice = BigInt(responses[idx++]);
			state.collateralRequirement = BigInt(responses[idx++]);
			state.principal = BigInt(responses[idx++]);
			state.interest = BigInt(responses[idx++]);
			state.debt = BigInt(responses[idx++]);
			state.fixedAnnualRatePpm = Number(responses[idx++]);
			state.lastAccrual = BigInt(responses[idx++]);
			state.cooldown = BigInt(responses[idx++]);
			state.challengedAmount = BigInt(responses[idx++]);
			state.availableForMinting = BigInt(responses[idx++]);
			state.availableForClones = BigInt(responses[idx++]);
			state.isClosed = Boolean(responses[idx++]);
			state.expiredPurchasePrice = BigInt(responses[idx++]);
			state.collateralAmount = BigInt(responses[idx++]);
			state.isDenied = deniedPositions.includes(address);

			results.push(state);
		}

		this.logger.log(`Fetched position data for ${results.length} positions via multicall`);
		return results;
	}

	/**
	 * Detect newly created positions whose (expiration - created) is below the mini-lifetime threshold.
	 * The WFPS forced-sale attack on 2026-04-25 used a clone with a 36-second lifetime — this would
	 * fire a HIGH-severity alert ~5 minutes after such a clone is created.
	 */
	async checkMiniLifetimeClones(telegramService: TelegramService): Promise<void> {
		const candidates = await this.positionRepo.findUnalertedMiniLifetime(MINI_LIFETIME_THRESHOLD_SECONDS);
		if (candidates.length === 0) return;

		const now = BigInt(Math.floor(Date.now() / 1000));
		for (const c of candidates) {
			const lifetime = c.expiration - c.created;
			const principalDeuro = formatDeuro(c.principal);
			const message =
				`Suspicious clone detected\n\n` +
				`Position: \`${c.address}\`\n` +
				`Owner: \`${c.owner}\`\n` +
				`Collateral: \`${c.collateral}\`\n` +
				`Lifetime: *${lifetime}s*  (threshold: ${MINI_LIFETIME_THRESHOLD_SECONDS}s)\n` +
				`Principal: ${principalDeuro} dEURO\n\n` +
				`This pattern matches the WFPS forced-sale attack vector (clone with sub-day lifetime, ` +
				`waiting for decay to drain the equity reserve).\n\n` +
				`Mitigation: open a challenge or call \`buyExpiredCollateral\` once the position enters phase 2.\n\n` +
				`[Etherscan](https://etherscan.io/address/${c.address})`;

			try {
				await telegramService.sendCriticalAlert(message);
				await this.positionRepo.markMiniLifetimeAlerted(c.address, now);
				this.logger.warn(`Mini-lifetime alert sent for ${c.address} (lifetime=${lifetime}s)`);
			} catch (error) {
				this.logger.error(`Failed to send mini-lifetime alert for ${c.address}: ${error?.message}`);
			}
		}
	}

	/**
	 * Detect open positions that are past their expiration with positive debt and have entered
	 * phase 2 of the forced-sale decay (where price drops from 1× to 0× liq-price). Sends one
	 * HIGH-severity alert per position via the dedup column phase2_alerted_at.
	 */
	async checkExpiredInPhase2(telegramService: TelegramService): Promise<void> {
		const now = BigInt(Math.floor(Date.now() / 1000));
		const expired = await this.positionRepo.findExpiredWithDebt(now);
		if (expired.length === 0) return;

		for (const p of expired) {
			if (p.phase2AlertedAt !== null) continue; // already alerted
			const timePassed = now - p.expiration;
			if (timePassed < p.challengePeriod) continue; // still in phase 1 (price > liq)

			// In phase 2 — useful arbitrage window. Clamp progress at 100% in case the cycle
			// runs after both decay phases have fully elapsed (decay price = 0).
			const principalDeuro = formatDeuro(p.principal);
			const decayPrice = BigInt(p.expiredPurchasePrice);
			const liqPrice = BigInt(p.price);
			const decayPct = liqPrice > 0n ? Number((decayPrice * 10000n) / liqPrice) / 100 : 0;
			const rawPhase2Pct = Number(((timePassed - p.challengePeriod) * 100n) / p.challengePeriod);
			const phase2Pct = Math.min(rawPhase2Pct, 100);
			const phaseLabel = rawPhase2Pct >= 100 ? 'phase 2 complete (decay reached 0)' : `phase 2 progress: ${phase2Pct}%`;

			const message =
				`Expired position in forced-sale decay\n\n` +
				`Position: \`${p.address}\`\n` +
				`Collateral: \`${p.collateral}\`\n` +
				`Principal: ${principalDeuro} dEURO\n` +
				`Time past expiration: ${timePassed}s  (challengePeriod: ${p.challengePeriod}s)\n` +
				`${phaseLabel} — price decays linearly from liq to 0\n` +
				`Current decay price: ${decayPct.toFixed(2)}% of liq\n\n` +
				`Without intervention, the equity reserve covers the gap between forced-sale ` +
				`proceeds and outstanding principal. A defender can call ` +
				`\`MintingHub.buyExpiredCollateral\` now to repay the debt at decay price.\n\n` +
				`[Etherscan](https://etherscan.io/address/${p.address})`;

			try {
				await telegramService.sendCriticalAlert(message);
				await this.positionRepo.markPhase2Alerted(p.address, now);
				this.logger.warn(`Phase-2 alert sent for ${p.address} (timePassed=${timePassed}s)`);
			} catch (error) {
				this.logger.error(`Failed to send phase-2 alert for ${p.address}: ${error?.message}`);
			}
		}
	}
}

/** Format an 18-decimal dEURO principal string with two decimal places and locale separators. */
function formatDeuro(principalRaw: string): string {
	const cents = BigInt(principalRaw) / 10n ** 16n;
	return (Number(cents) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
