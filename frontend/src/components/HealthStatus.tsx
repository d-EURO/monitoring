import type { HealthStatus as HealthStatusType } from '../types/index';
import { colors } from '../lib/theme';

interface Props {
	data: HealthStatusType | null;
	loading: boolean;
	error: string | null;
}

export function HealthStatus({ data, loading, error }: Props) {
	if (loading) return <div className={colors.text.secondary}>Loading health status...</div>;
	if (error) return <div className={colors.critical}>Error: {error}</div>;
	if (!data) return null;

	const isHealthy = data.status === 'healthy';
	const statusColor = isHealthy ? colors.success : colors.critical;

	return (
		<div className="mt-2 flex items-center gap-2 justify-end">
			<div className=" text-gray-500">{`dEURO protocol monitor - ${data?.blockLag} block${data?.blockLag === 1 ? '' : 's'} behind |`}</div>
			<div className={`text-xs ${statusColor} font-bold`}>{isHealthy ? 'ONLINE' : 'OFFLINE'}</div>
		</div>
	);
}
