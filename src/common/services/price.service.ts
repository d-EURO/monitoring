import { EquityABI } from '@deuro/eurocoin';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ethers } from 'ethers';
import { BlockchainService } from 'src/blockchain/blockchain.service';

const nDEPS = '0xc71104001A3CCDA1BEf1177d765831Bd1bfE8eE6';
const DEPS = '0x103747924E74708139a9400e4Ab4BEA79FFFA380';
const FPS = '0x1bA26788dfDe592fec8bcB0Eaff472a42BE341B2';
const WFPS = '0x5052D3Cc819f53116641e89b96Ff4cD1EE80B182';

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
	private readonly GECKO_TERMINAL_API_URL = 'https://api.geckoterminal.com/api/v2/simple/networks/eth/token_price';
	private readonly logger = new Logger(PriceService.name);
	private priceCache = new Map<string, PriceCacheEntry>();

	constructor(
		private readonly configService: ConfigService,
		private readonly blockchainService: BlockchainService
	) {
		this.CACHE_TTL_MS = this.configService.get<number>('monitoring.priceCacheTtlMs', 120000); // Default 2 minutes
	}

	async getTokenPricesInEur(addresses: string[]): Promise<{ [key: string]: string }> {
		const specialPrices = await this.getSpecialTokenPrices();
		const standardAddresses = addresses.filter((addr) => !this.isSpecialToken(addr));
		const coinGeckoPrices = await this.getCoinGeckoPricesInUSD(standardAddresses);
		const usdToEur = await this.getUsdToEur();
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
			const response = await axios.get<TokenPrice>(`${this.GECKO_TERMINAL_API_URL}/${remaining.join(',')}`, {
				headers: { accept: 'application/json' },
				timeout: 10000, // 10 second timeout
			});

			const prices = response.data.data.attributes.token_prices;
			for (const [address, price] of Object.entries(prices)) this.setCache(address, price);
			this.logger.log(`Fetched prices for ${Object.keys(prices).length} tokens from GeckoTerminal`);
			return prices;
		} catch (error) {
			this.logger.error('Failed to fetch token prices from GeckoTerminal:', error);
			if (cached) {
				this.logger.warn('Returning expired cached prices due to API error');
				return cached;
			}

			return {};
		}
	}

	private async getSpecialTokenPrices(): Promise<{ [key: string]: string }> {
		const cached = this.getFromCache(Array.from(specialTokens.keys()));
		if (Object.keys(cached).length > 0) {
			this.logger.debug('Returning cached prices for special tokens');
			return cached;
		}

		const prices: { [key: string]: string } = {};
		for (const [token, underlying] of specialTokens) {
			const provider = this.blockchainService.getProvider();
			const equityContract = new ethers.Contract(underlying, EquityABI, provider);
			const nativePrice = await equityContract.price();
			let formattedPrice = ethers.formatUnits(nativePrice, 18);

			// For WFPS, convert CHF to EUR
			if (token === WFPS) {
				const [usdToEur, usdToChf] = await Promise.all([this.getUsdToEur(), this.getUsdToChf()]);
				formattedPrice = String((Number(formattedPrice) / usdToChf) * usdToEur);
			}

			prices[underlying] = formattedPrice;
			prices[token] = formattedPrice;

			this.setCache(token, formattedPrice);
			this.setCache(underlying, formattedPrice);
			this.logger.debug(`Fetched special token price for ${token}: ${formattedPrice}`);
		}

		return prices;
	}

	/**
	 * Fetches USD to EUR conversion rate
	 * @returns USD to EUR exchange rate
	 */
	private async getUsdToEur(): Promise<number> {
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
	private async getUsdToChf(): Promise<number> {
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
		const keys = Array.from(specialTokens.keys()).map((k) => k.toLowerCase());
		return keys.includes(address.toLowerCase());
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
