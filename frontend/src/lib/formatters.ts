// Formatting utilities inspired by terminal table formatters
// Keep it simple and consistent

const KNOWN_ADDRESSES: Record<string, string> = {
  '0x01ae4c18c2677f97bab536c48d6c36858f5c86d7': 'Deployer',
  '0xba3f535bbcccca2a154b573ca6c5a49baae0a3ea': 'DecentralizedEURO',
  '0xc71104001a3ccda1bef1177d765831bd1bfe8ee6': 'Equity',
  '0x167144d66ac1d02eaafca3649ef3305ea31ee5a8': 'PositionFactory',
  '0x4ce0ab2fc21bd27a47a64f594fdf7654ea57dc79': 'PositionRoller',
  '0x05620f4bb92246b4e067ebc0b6f5c7ff6b771702': 'EURA-Bridge',
  '0xd03cd3ea55e67bc61b78a0d70ee93018e2182dbe': 'EURC-Bridge',
  '0x2353d16869f717bfcd22dabc0adbf4dca62c609f': 'EURT-Bridge',
  '0x3ed40fa0e5c803e807ebd51355e388006f9e1fee': 'VEUR-Bridge',
  '0x0423f419de1c44151b6b000e2daa51859c1d5d2a': 'EURS-Bridge',
  '0x3ef3d03efcc1338d6210946f8cf5fb1a8b630341': 'EUROP-Bridge',
  '0xb66a40934a996373fa7602de9820c6bf3e8c9afe': 'EURI-Bridge',
  '0xdc6450e91f49048fbff5f424046985fa03be0130': 'EURe-Bridge',
  '0x20b0a153ff16c7b1e962fd3d3352a00cf019f1a7': 'EURR-Bridge',
  '0x103747924e74708139a9400e4ab4bea79fffa380': 'DEPSWrapper',
  '0x5c49c00f897bd970d964bfb8c3065ae65a180994': 'FrontendGateway',
  '0x073493d73258c4beb6542e8dd3e1b2891c972303': 'SavingsGateway',
  '0x8b3c41c649b9c7085c171cbb82337889b3604618': 'MintingHubGateway',
};

/**
 * Get Etherscan URL for an address or transaction
 */
export function getEtherscanUrl(hash: string, type: 'address' | 'tx' = 'address'): string {
	return `https://etherscan.io/${type}/${hash}`;
}

/**
 * Format an address to show first 6 and last 4 characters or known label
 */
export function formatAddress(address: string, options?: { showKnownLabel?: boolean }): string {
	if (!address || address.length < 10) return address;

	// Check if it's a known address and we should show the label
	if (options?.showKnownLabel !== false) {
		const knownLabel = KNOWN_ADDRESSES[address.toLowerCase()];
		if (knownLabel) return knownLabel;
	}

	return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Convert a bigint value to a number with decimals
 * Useful for calculations where you need the actual numeric value
 */
export function bigintToNumber(value: string | bigint, decimals: number = 18): number {
	const num = typeof value === 'bigint' ? value : BigInt(value);
	const divisor = BigInt(10 ** decimals);
	return Number(num) / Number(divisor);
}

/**
 * Format a number with proper decimal places and thousand separators
 */
export function formatNumber(value: string | bigint, decimals: number = 18, precision: number = 2): string {
	const result = bigintToNumber(value, decimals);

	// Handle very small numbers with exponential notation
	if (Math.abs(result) > 0 && Math.abs(result) < 0.01) {
		return result.toExponential(precision);
	}

	// Format with thousand separators using apostrophe (like terminal)
	const fixed = result.toFixed(precision);
	const [integerPart, decimalPart] = fixed.split('.');
	const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
	return decimalPart ? `${formattedInteger}.${decimalPart}` : formattedInteger;
}

/**
 * Format a currency value (already in correct units, not wei)
 */
export function formatCurrency(value: number | string, precision: number = 2): string {
	const num = typeof value === 'string' ? parseFloat(value) : value;

	if (isNaN(num)) return '-';

	// Handle very small numbers
	if (Math.abs(num) < 0.01) {
		return Number(0).toFixed(precision);
	}

	const fixed = num.toFixed(precision);
	const [integerPart, decimalPart] = fixed.split('.');
	const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
	return decimalPart ? `${formattedInteger}.${decimalPart}` : formattedInteger;
}

/**
 * Format a percentage value
 */
export function formatPercent(value: number | null, precision: number = 2): string {
	if (value === null || isNaN(value)) return '-';
	return `${value.toFixed(precision)}%`;
}

/**
 * Format a date to European format DD.MM.YYYY HH:MM
 */
export function formatDateTime(timestamp: number | Date): string {
	const date = timestamp instanceof Date ? timestamp : new Date(timestamp * 1000);
	const day = date.getDate().toString().padStart(2, '0');
	const month = (date.getMonth() + 1).toString().padStart(2, '0');
	const year = date.getFullYear();
	const hours = date.getHours().toString().padStart(2, '0');
	const minutes = date.getMinutes().toString().padStart(2, '0');
	return `${day}.${month}.${year} ${hours}:${minutes}`;
}

/**
 * Format a countdown timer or duration
 * @param value - Either a future timestamp or seconds remaining
 * @param isSeconds - If true, value is already in seconds; if false, value is a timestamp
 */
export function formatCountdown(value: number | string, isSeconds: boolean = false): string {
	const numValue = typeof value === 'string' ? Number(value) : value;
	const seconds = isSeconds ? numValue : numValue - Math.floor(Date.now() / 1000);

	if (seconds <= 0) return '-';

	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);

	if (days > 0) return `${days}d ${hours}h ${minutes}m`;
	if (hours > 0) return `${hours}h ${minutes}m`;
	return `${minutes}m`;
}

import { colors } from './theme';

/**
 * Get color class based on collateralization ratio
 */
export function getCollateralizationColor(ratio: number | null): string {
	if (!ratio) return colors.text.muted;
	if (ratio >= 120) return colors.success;
	if (ratio >= 105) return colors.highlight;
	return colors.critical;
}

/**
 * Get color class based on status
 */
export function getStatusColor(status: string): string {
	const statusUpper = status.toUpperCase();
	switch (statusUpper) {
		case 'ACTIVE':
		case 'APPROVED':
		case 'OPEN':
			return colors.success;
		case 'CHALLENGED':
		case 'UNDERCOLLATERALIZED':
		case 'CRITICAL':
		case 'DENIED':
		case 'PENDING':
			return colors.critical;
		case 'WARNING':
		case 'COOLDOWN':
			return colors.highlight;
		case 'CLOSED':
		case 'INACTIVE':
			return colors.text.secondary;
		default:
			return colors.text.secondary;
	}
}
