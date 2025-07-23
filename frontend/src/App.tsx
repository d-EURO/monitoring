import { useApi } from './lib/api.hook';
import { SystemOverview } from './components/SystemOverview';
import { PositionsTable } from './components/PositionsTable';
import { CollateralTable } from './components/CollateralTable';
import { ChallengesTable } from './components/ChallengesTable';
import { MintersTable } from './components/MintersTable';
import { HealthStatus } from './components/HealthStatus';

function App() {
	const { health, deuro, positions, collateral, challenges, minters, bridges } = useApi();

	return (
		<div className="min-h-screen bg-neutral-950 text-gray-100">
			<div className="max-w-7xl mx-auto p-4 space-y-6 text-sm mb-8">
				<HealthStatus {...health} />
				<SystemOverview {...deuro} />
				<PositionsTable data={positions} collateralData={collateral?.data} />
				<CollateralTable {...collateral} />
				<ChallengesTable data={challenges} positionData={positions?.data} collateralData={collateral?.data} />
				<MintersTable data={minters} bridgeData={bridges?.data} />
			</div>
		</div>
	);
}

export default App;
