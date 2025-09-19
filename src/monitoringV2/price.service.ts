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
	private readonly CACHE_TTL_MS: number;
	private readonly logger = new Logger(PriceService.name);
	private priceCache = new Map<string, PriceCacheEntry>();

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

	/**
	 * Fetches USD to EUR conversion rate
	 * @returns USD to EUR exchange rate
	 */
	async getUsdToEur(): Promise<number> {
		const cacheKey = 'usd-eur-rate';
		const cached = this.priceCache.get(cacheKey);

		if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
			return Number(cached.value);
		}

		try {
			const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=usd&vs_currencies=eur', {
				headers: { accept: 'application/json' },
				timeout: 10000,
			});

			const rate = Number(response.data.usd.eur);
			this.priceCache.set(cacheKey, { value: String(rate), timestamp: Date.now() });

			this.logger.debug(`USD to EUR rate: ${rate}`);
			return rate;
		} catch (error) {
			this.logger.error('Failed to fetch USD to EUR rate:', error);
			if (cached) return Number(cached.value);
			return 1;
		}
	}

	/**
	 * Fetches USD to CHF conversion rate
	 * @returns USD to CHF exchange rate
	 */
	async getUsdToChf(): Promise<number> {
		const cacheKey = 'usd-chf-rate';
		const cached = this.priceCache.get(cacheKey);

		if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
			return Number(cached.value);
		}

		try {
			const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=usd&vs_currencies=chf', {
				headers: { accept: 'application/json' },
				timeout: 10000,
			});

			const rate = Number(response.data.usd.chf);
			this.priceCache.set(cacheKey, { value: String(rate), timestamp: Date.now() });

			this.logger.debug(`USD to CHF rate: ${rate}`);
			return rate;
		} catch (error) {
			this.logger.error('Failed to fetch USD to CHF rate:', error);
			if (cached) return Number(cached.value);
			return 1;
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
