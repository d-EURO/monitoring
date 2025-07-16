import type { HealthStatus as HealthStatusType } from '../types/index';
import { colors, spacing } from '../lib/theme';

interface Props {
  data: HealthStatusType | null;
  loading: boolean;
  error: string | null;
}

function getBlockLagColor(lag: number): string {
  if (lag > 100) return colors.critical;
  if (lag > 50) return colors.highlight;
  return colors.success;
}

export function HealthStatus({ data, loading, error }: Props) {
  if (loading) return <div className={colors.text.secondary}>Loading health status...</div>;
  if (error) return <div className={colors.critical}>Error: {error}</div>;
  if (!data) return null;

  const isHealthy = data.status === 'healthy';
  const statusColor = isHealthy ? colors.success : colors.critical;

  return (
    <div className={`${colors.background} ${colors.table.border} border p-4`}>
      <div className="flex items-center justify-between mb-2">
        <h2 className={`text-sm uppercase tracking-wider ${colors.text.primary}`}>SYSTEM HEALTH</h2>
        <span className={`${statusColor} font-bold`}>
          {isHealthy ? '● ONLINE' : '● OFFLINE'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className={colors.text.secondary}>Last Block:</div>
        <div className={colors.text.primary}>{data.lastProcessedBlock?.toLocaleString() ?? 'N/A'}</div>
        
        <div className={colors.text.secondary}>Current Block:</div>
        <div className={colors.text.primary}>{data.currentBlock.toLocaleString()}</div>
        
        <div className={colors.text.secondary}>Block Lag:</div>
        <div className={getBlockLagColor(data.blockLag)}>{data.blockLag.toLocaleString()}</div>
        
        <div className={colors.text.secondary}>Last Update:</div>
        <div className={colors.text.primary}>{new Date(data.timestamp).toLocaleTimeString()}</div>
      </div>
    </div>
  );
}