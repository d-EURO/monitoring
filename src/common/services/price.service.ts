import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

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
	prices: { [key: string]: string };
	timestamp: number;
}

@Injectable()
export class PriceService {
	private readonly logger = new Logger(PriceService.name);
	private priceCache = new Map<string, PriceCacheEntry>();
	private readonly CACHE_TTL_MS: number;
	private readonly GECKO_TERMINAL_API_URL = 'https://api.geckoterminal.com/api/v2/simple/networks/eth/token_price';

	constructor(private readonly configService: ConfigService) {
		this.CACHE_TTL_MS = this.configService.get<number>('monitoring.priceCacheTtlMs', 300000);
	}

	/**
	 * Fetches token prices from GeckoTerminal API with caching
	 * @param addresses Array of token addresses to fetch prices for
	 * @returns Object mapping addresses to prices in USD
	 */
	async getTokenPrices(addresses: string[]): Promise<{ [key: string]: string }> {
		if (addresses.length === 0) return {};

		const normalizedAddresses = addresses.map((addr) => addr.toLowerCase());
		const cacheKey = normalizedAddresses.sort().join(',');

		// Check cache first
		const cached = this.priceCache.get(cacheKey);
		if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
			this.logger.debug(`Returning cached prices for ${addresses.length} tokens`);
			return cached.prices;
		}

		try {
			const response = await axios.get<TokenPrice>(`${this.GECKO_TERMINAL_API_URL}/${normalizedAddresses.join(',')}`, {
				headers: { accept: 'application/json' },
				timeout: 10000, // 10 second timeout
			});

			const prices = response.data.data.attributes.token_prices;
			this.priceCache.set(cacheKey, { prices, timestamp: Date.now() });

			this.logger.log(`Fetched prices for ${Object.keys(prices).length} tokens from GeckoTerminal`);
			return prices;
		} catch (error) {
			this.logger.error('Failed to fetch token prices from GeckoTerminal:', error);
			if (cached) {
				this.logger.warn('Returning expired cached prices due to API error');
				return cached.prices;
			}

			return {};
		}
	}

	/**
	 * Fetches USD to EUR conversion rate
	 * @returns USD to EUR exchange rate
	 */
	async getUsdToEur(): Promise<number> {
		const cacheKey = 'usd-eur-rate';
		const cached = this.priceCache.get(cacheKey);

		if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
			return Number(cached.prices['rate']);
		}

		try {
			const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=usd&vs_currencies=eur', {
				headers: { accept: 'application/json' },
				timeout: 10000,
			});

			const rate = Number(response.data.usd.eur);
			this.priceCache.set(cacheKey, { prices: { rate: String(rate) }, timestamp: Date.now() });

			this.logger.debug(`USD to EUR rate: ${rate}`);
			return rate;
		} catch (error) {
			this.logger.error('Failed to fetch USD to EUR rate:', error);
			if (cached) return Number(cached.prices['rate']);
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
			return Number(cached.prices['rate']);
		}

		try {
			const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=usd&vs_currencies=chf', {
				headers: { accept: 'application/json' },
				timeout: 10000,
			});

			const rate = Number(response.data.usd.chf);
			this.priceCache.set(cacheKey, {
				prices: { rate: String(rate) },
				timestamp: Date.now(),
			});

			this.logger.debug(`USD to CHF rate: ${rate}`);
			return rate;
		} catch (error) {
			this.logger.error('Failed to fetch USD to CHF rate:', error);
			if (cached) return Number(cached.prices['rate']);
			return 1;
		}
	}

	clearCache(): void {
		this.priceCache.clear();
		this.logger.debug('Price cache cleared');
	}
}
