import { EquityABI } from '@deuro/eurocoin';
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ethers } from 'ethers';
import { ProviderService } from './provider.service';
import { AppConfigService } from 'src/config/config.service';

const nDEPS = '0xc71104001a3ccda1bef1177d765831bd1bfe8ee6';
const DEPS = '0x103747924e74708139a9400e4ab4bea79fffa380';
const FPS = '0x1ba26788dfde592fec8bcb0eaff472a42be341b2';
const WFPS = '0x5052d3cc819f53116641e89b96ff4cd1ee80b182';

const specialTokens = new Map([
	[DEPS, nDEPS],
	[WFPS, FPS],
]);

interface TokenPrice {
	data: {
		id: string;
		type: string;
		attributes: {
			token_prices: {
				[key: string]: string;
			};
		};
	};
}

interface PriceCacheEntry {
	value: string;
	timestamp: number;
}

@Injectable()
export class PriceService {
	private static readonly FX_CACHE_TTL_MS = 3_600_000; // 1 hour — FX rates change slowly
	private readonly CACHE_TTL_MS: number;
	private readonly logger = new Logger(PriceService.name);
	private priceCache = new Map<string, PriceCacheEntry>();
	private pendingFxRates: Promise<{ eur: number; chf: number }> | null = null;

	constructor(
		private readonly providerService: ProviderService,
		private readonly appConfigService: AppConfigService
	) {
		this.CACHE_TTL_MS = this.appConfigService.priceCacheTtlMs;
	}

	async getTokenPricesInEur(addresses: string[]): Promise<{ [key: string]: string }> {
		const requestedSpecialAddresses = addresses.filter((addr) => this.isSpecialToken(addr));
		const standardAddresses = addresses.filter((addr) => !this.isSpecialToken(addr));

		// Fetch everything in parallel for better performance
		const [specialPrices, coinGeckoPrices, usdToEur] = await Promise.all([
			this.getSpecialTokenPrices(requestedSpecialAddresses),
			this.getCoinGeckoPricesInUSD(standardAddresses),
			this.getUsdToEur(),
		]);

		// Convert USD prices to EUR
		const eurPrices: { [key: string]: string } = {};
		for (const [address, price] of Object.entries(coinGeckoPrices)) {
			eurPrices[address] = (Number(price) * usdToEur).toString();
		}

		return { ...eurPrices, ...specialPrices };
	}

	/**
	 * Fetches token prices from GeckoTerminal API with caching
	 * @param addresses Array of token addresses to fetch prices for
	 * @returns Object mapping addresses to prices in USD
	 */
	private async getCoinGeckoPricesInUSD(addresses: string[]): Promise<{ [key: string]: string }> {
		if (addresses.length === 0) return {};

		const cached = this.getFromCache(addresses);
		const remaining = addresses.filter((addr) => !cached[addr]);
		if (remaining.length === 0) {
			this.logger.debug('Returning cached prices for all requested tokens');
			return cached;
		}

		try {
			const response = await axios.get<TokenPrice>(
				`https://api.geckoterminal.com/api/v2/simple/networks/eth/token_price/${remaining.map((a) => a.toLowerCase()).join(',')}`,
				{
					headers: { accept: 'application/json' },
					timeout: 10000, // 10 second timeout
				}
			);

			const apiPrices = response.data.data.attributes.token_prices;
			const normalizedPrices: { [key: string]: string } = {};
			for (const inputAddress of remaining) {
				const price = apiPrices[inputAddress.toLowerCase()];
				if (price) {
					normalizedPrices[inputAddress] = price;
					this.setCache(inputAddress, price);
				}
			}

			this.logger.log(`Fetched prices for ${Object.keys(normalizedPrices).length} tokens from GeckoTerminal`);
			return { ...cached, ...normalizedPrices };
		} catch (error) {
			this.logger.error('Failed to fetch token prices from GeckoTerminal:', error);
			if (cached) {
				this.logger.warn('Returning expired cached prices due to API error');
				return cached;
			}

			return {};
		}
	}

	private async getSpecialTokenPrices(requestedAddresses: string[]): Promise<{ [key: string]: string }> {
		if (requestedAddresses.length === 0) return {};

		// Check cache for requested addresses
		const cached = this.getFromCache(requestedAddresses);
		const remaining = requestedAddresses.filter((addr) => !cached[addr]);
		if (remaining.length === 0) return cached;

		const prices: { [key: string]: string } = {};
		for (const requestedAddress of remaining) {
			const formattedAddress = requestedAddress.toLowerCase();
			const underlying = specialTokens.get(formattedAddress);
			if (!underlying) continue; // Not a special token

			// Fetch price from underlying equity contract
			const equityContract = new ethers.Contract(underlying, EquityABI, this.providerService.provider);
			const nativePrice = await equityContract.price();
			let formattedPrice = ethers.formatUnits(nativePrice, 18);

			// For WFPS, convert CHF to EUR
			if (formattedAddress === WFPS) {
				const [usdToEur, usdToChf] = await Promise.all([this.getUsdToEur(), this.getUsdToChf()]);
				formattedPrice = String((Number(formattedPrice) / usdToChf) * usdToEur);
			}

			prices[requestedAddress] = formattedPrice;
			this.setCache(requestedAddress, formattedPrice);
			this.logger.debug(`Fetched special token price for ${requestedAddress}: ${formattedPrice}`);
		}

		return { ...cached, ...prices };
	}

	async getUsdToEur(): Promise<number> {
		return (await this.getFxRates()).eur;
	}

	async getUsdToChf(): Promise<number> {
		return (await this.getFxRates()).chf;
	}

	private async getFxRates(): Promise<{ eur: number; chf: number }> {
		const eurCached = this.priceCache.get('usd-eur-rate');
		const chfCached = this.priceCache.get('usd-chf-rate');
		const now = Date.now();

		if (
			eurCached &&
			chfCached &&
			now - eurCached.timestamp < PriceService.FX_CACHE_TTL_MS &&
			now - chfCached.timestamp < PriceService.FX_CACHE_TTL_MS
		) {
			return { eur: Number(eurCached.value), chf: Number(chfCached.value) };
		}

		// Deduplicate concurrent requests
		if (this.pendingFxRates) return this.pendingFxRates;

		this.pendingFxRates = this.fetchFxRates(eurCached, chfCached);
		try {
			return await this.pendingFxRates;
		} finally {
			this.pendingFxRates = null;
		}
	}

	private async fetchFxRates(
		eurCached: PriceCacheEntry | undefined,
		chfCached: PriceCacheEntry | undefined
	): Promise<{ eur: number; chf: number }> {
		try {
			const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=usd&vs_currencies=eur,chf', {
				headers: { accept: 'application/json' },
				timeout: 10000,
			});

			const eur = Number(response.data.usd.eur);
			const chf = Number(response.data.usd.chf);

			if (Number.isNaN(eur) || Number.isNaN(chf)) {
				this.logger.error('CoinGecko returned non-numeric FX rates', response.data);
				return {
					eur: !Number.isNaN(eur) ? eur : eurCached ? Number(eurCached.value) : 1,
					chf: !Number.isNaN(chf) ? chf : chfCached ? Number(chfCached.value) : 1,
				};
			}

			const now = Date.now();
			this.priceCache.set('usd-eur-rate', { value: String(eur), timestamp: now });
			this.priceCache.set('usd-chf-rate', { value: String(chf), timestamp: now });

			this.logger.debug(`FX rates: USD/EUR=${eur}, USD/CHF=${chf}`);
			return { eur, chf };
		} catch (error) {
			this.logger.error('Failed to fetch FX rates:', error.message || error);
			return {
				eur: eurCached ? Number(eurCached.value) : 1,
				chf: chfCached ? Number(chfCached.value) : 1,
			};
		}
	}

	private isSpecialToken(address: string): boolean {
		return specialTokens.has(address.toLowerCase());
	}

	// Cache management methods

	private getFromCache(addresses: string[]): { [key: string]: string } {
		const prices: { [key: string]: string } = {};
		for (const address of addresses) {
			const cached = this.priceCache.get(address.toLowerCase());
			if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
				prices[address] = cached.value;
			}
		}
		return prices;
	}

	private setCache(address: string, price: string): void {
		const cacheKey = address.toLowerCase();
		this.priceCache.set(cacheKey, { value: price, timestamp: Date.now() });
		this.logger.debug(`Cached price for ${address}: ${price}`);
	}
}
