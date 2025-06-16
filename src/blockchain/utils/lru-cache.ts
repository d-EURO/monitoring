export class LRUCache {
	private cache = new Map<number, any>();
	private readonly maxSize: number;

	constructor(maxSize: number = 10000) {
		this.maxSize = maxSize;
	}

	get(itemKey: number): any {
		const value = this.cache.get(itemKey);
		if (value !== undefined) {
			this.cache.delete(itemKey);
			this.cache.set(itemKey, value);
		}
		return value;
	}

	set(itemKey: number, value: any): void {
		if (this.cache.has(itemKey)) {
			this.cache.delete(itemKey);
		} else if (this.cache.size >= this.maxSize) {
			const firstKey = this.cache.keys().next().value;
			if (firstKey !== undefined) this.cache.delete(firstKey);
		}

		this.cache.set(itemKey, value);
	}

	has(itemKey: number): boolean {
		return this.cache.has(itemKey);
	}

	size(): number {
		return this.cache.size;
	}

	clear(): void {
		this.cache.clear();
	}
}
