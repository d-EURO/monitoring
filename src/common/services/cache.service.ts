import { Injectable, Logger } from '@nestjs/common';

interface CacheEntry<T> {
	data: T;
	expiresAt: number;
}

@Injectable()
export class CacheService {
	private readonly logger = new Logger(CacheService.name);
	private readonly cache = new Map<string, CacheEntry<any>>();
	private readonly TTL_MS = 5 * 60 * 1000; // 5min

	get<T>(key: string): T | null {
		const entry = this.cache.get(key);
		if (!entry) return null;

		if (Date.now() > entry.expiresAt) {
			this.cache.delete(key);
			return null;
		}

		return entry.data as T;
	}

	set<T>(key: string, data: T): void {
		const entry: CacheEntry<T> = {
			data,
			expiresAt: Date.now() + this.TTL_MS,
		};
		this.cache.set(key, entry);
	}

	clear(): void {
		this.cache.clear();
		this.logger.debug('Cache cleared');
	}

	size(): number {
		return this.cache.size;
	}
}
