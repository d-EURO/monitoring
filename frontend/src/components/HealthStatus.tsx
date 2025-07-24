import type { HealthStatus } from '../types/index';
import type { DataState } from '../lib/api.hook';
import { colors } from '../lib/theme';
import { useState } from 'react';

export function HealthStatus({ data, error }: DataState<HealthStatus>) {
	const [isReloading, setIsReloading] = useState(false);

	const handleClick = () => {
		setIsReloading(true);
		setTimeout(() => window.location.reload(), 250);
	};

	const isHealthy = (!error && !data) || data?.status === 'healthy';
	const header = data
		? `dEURO Protocol Monitor | ${data.blockLag} block${data.blockLag === 1 ? '' : 's'} behind`
		: 'dEURO Protocol Monitor';

	return (
		<div className="pt-4 px-4 flex flex-row items-center gap-2 justify-between">
			<div className=" text-gray-500">{header}</div>
			{isHealthy ? (
				<div className={`text-xs ${colors.success} font-bold`}>{data ? 'ONLINE' : 'LOADING...'}</div>
			) : (
				<div
					className={`text-xs ${colors.critical} font-bold flex flex-row items-center gap-1 cursor-pointer`}
					onClick={handleClick}
				>
					{`OFFLINE${error ? ': ' + error : ''} -`}
					<SpinningReload isSpinning={isReloading} className="h-4 w-4 inline-block" />
				</div>
			)}
		</div>
	);
}

function SpinningReload({ isSpinning, className = '' }: { isSpinning: boolean; className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			height="16"
			viewBox="0 -960 960 960"
			width="16"
			className={`fill-current ${className}`}
			style={{
				transform: isSpinning ? 'rotate(360deg)' : 'rotate(0deg)',
				transition: 'transform 0.25s linear',
			}}
		>
			<path d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z" />
		</svg>
	);
}
