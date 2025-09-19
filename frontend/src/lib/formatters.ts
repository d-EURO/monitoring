import { ChallengeStatus, MinterStatus, PositionStatus } from '../../../shared/types';
import { colors } from './theme';

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

export function formatEtherscanUrl(hash: string, type: 'address' | 'tx' = 'address'): string {
	return `https://etherscan.io/${type}/${hash}`;
}

export function formatAddress(address: string, options?: { showKnownLabel?: boolean }): string {
	if (!address || address.length < 10) return address;

	if (options?.showKnownLabel !== false) {
		const knownLabel = KNOWN_ADDRESSES[address.toLowerCase()];
		if (knownLabel) return knownLabel;
	}

	return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function bigintToNumber(value: string | bigint, decimals: number = 18): number {
	const num = typeof value === 'bigint' ? value : BigInt(value);
	const divisor = BigInt(10 ** decimals);
	return Number(num) / Number(divisor);
}

function formatWithSeparators(num: number, precision: number = 2): string {
	const sign = num < 0 ? '-' : '';
	const absNum = Math.abs(num);

	if (absNum > 0 && absNum < 0.01 && precision > 2) {
		const [mantissa, expPart] = absNum.toExponential(precision).split('e');
		const exp = parseInt(expPart, 10);
		const zeroCount = Math.abs(exp) - 1;
		const digits = mantissa.replace('.', '').replace(/0+$/, '');
		return `${sign}0.0${toSubscript(zeroCount)}${digits}`;
	}

	const fixed = absNum.toFixed(precision);
	const [intPart, decPart] = fixed.split('.');
	const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
	return decPart ? `${sign}${formattedInt}.${decPart}` : `${sign}${formattedInt}`;
}

export function formatNumber(value: number | string | bigint, decimals = 0, precision = 2): string {
	const num = decimals ? bigintToNumber(value.toString(), decimals) : parseFloat(value.toString());
	return formatWithSeparators(num, precision);
}

export function formatPercent(value: number | null, precision: number = 2): string {
	if (value === null || isNaN(value)) return '-';
	return `${value.toFixed(precision)}%`;
}

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

export function getStatusColor(status: PositionStatus | MinterStatus | ChallengeStatus): string {
	switch (status) {
		case PositionStatus.OPEN:
		case MinterStatus.APPROVED:
			return colors.success;
		case PositionStatus.CHALLENGED:
		case PositionStatus.UNDERCOLLATERALIZED:
		case PositionStatus.PROPOSED:
		case PositionStatus.COOLDOWN:
		case MinterStatus.PENDING:
		case ChallengeStatus.AUCTION:
			return colors.critical;
		case PositionStatus.EXPIRED:
		case PositionStatus.DENIED:
		case ChallengeStatus.AVERTING:
			return colors.highlight;
		case PositionStatus.CLOSED:
		case MinterStatus.DENIED:
		case ChallengeStatus.ENDED:
			return colors.text.secondary;
	}
}

// helper functions

function toSubscript(n: number) {
	return n
		.toString()
		.split('')
		.map((d) => String.fromCharCode(0x2080 + parseInt(d, 10)))
		.join('');
}
