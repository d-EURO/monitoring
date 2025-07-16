import { useState, useEffect } from 'react';
import { api } from './lib/api';
import type { 
  HealthStatus as HealthStatusType,
  DeuroState,
  Position,
  Collateral,
  Challenge,
  Minter,
  Bridge
} from './types/index';

// Import components
import { HealthStatus } from './components/HealthStatus';
import { SystemOverview } from './components/SystemOverview';
import { PositionsTable } from './components/PositionsTable';
import { CollateralTable } from './components/CollateralTable';
import { ChallengesTable } from './components/ChallengesTable';
import { MintersTable } from './components/MintersTable';
import { BridgesTable } from './components/BridgesTable';

const REFRESH_INTERVAL = 30000; // 30 seconds

function App() {
  // State for all data
  const [health, setHealth] = useState<{ data: HealthStatusType | null; loading: boolean; error: string | null }>({ data: null, loading: true, error: null });
  const [deuro, setDeuro] = useState<{ data: DeuroState | null; loading: boolean; error: string | null }>({ data: null, loading: true, error: null });
  const [positions, setPositions] = useState<{ data: Position[] | null; loading: boolean; error: string | null }>({ data: null, loading: true, error: null });
  const [collateral, setCollateral] = useState<{ data: Collateral[] | null; loading: boolean; error: string | null }>({ data: null, loading: true, error: null });
  const [challenges, setChallenges] = useState<{ data: Challenge[] | null; loading: boolean; error: string | null }>({ data: null, loading: true, error: null });
  const [minters, setMinters] = useState<{ data: Minter[] | null; loading: boolean; error: string | null }>({ data: null, loading: true, error: null });
  const [bridges, setBridges] = useState<{ data: Bridge[] | null; loading: boolean; error: string | null }>({ data: null, loading: true, error: null });
  
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch functions
  const fetchHealth = async () => {
    try {
      const data = await api.health();
      setHealth({ data, loading: false, error: null });
    } catch (error) {
      setHealth({ data: null, loading: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const fetchDeuro = async () => {
    try {
      const data = await api.deuro();
      setDeuro({ data, loading: false, error: null });
    } catch (error) {
      setDeuro({ data: null, loading: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const fetchPositions = async () => {
    try {
      const data = await api.positions();
      setPositions({ data, loading: false, error: null });
    } catch (error) {
      setPositions({ data: null, loading: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const fetchCollateral = async () => {
    try {
      const data = await api.collateral();
      setCollateral({ data, loading: false, error: null });
    } catch (error) {
      setCollateral({ data: null, loading: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const fetchChallenges = async () => {
    try {
      const data = await api.challenges();
      setChallenges({ data, loading: false, error: null });
    } catch (error) {
      setChallenges({ data: null, loading: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const fetchMinters = async () => {
    try {
      const data = await api.minters();
      setMinters({ data, loading: false, error: null });
    } catch (error) {
      setMinters({ data: null, loading: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const fetchBridges = async () => {
    try {
      const data = await api.bridges();
      setBridges({ data, loading: false, error: null });
    } catch (error) {
      setBridges({ data: null, loading: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  // Fetch all data
  const fetchAllData = async () => {
    setLastUpdate(new Date());
    await Promise.all([
      fetchHealth(),
      fetchDeuro(),
      fetchPositions(),
      fetchCollateral(),
      fetchChallenges(),
      fetchMinters(),
      fetchBridges(),
    ]);
  };

  // Initial fetch and interval setup
  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-gray-100">
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl uppercase tracking-wider font-bold text-gray-100">dEURO PROTOCOL MONITOR</h1>
          <div className="text-sm text-gray-500">
            Last update: {lastUpdate.toLocaleTimeString()}
          </div>
        </div>

        {/* Health Status */}
        <HealthStatus {...health} />

        {/* System Overview */}
        <SystemOverview {...deuro} />

        {/* Positions Table */}
        <PositionsTable {...positions} collateralData={collateral.data} />

        {/* Collateral Table */}
        <CollateralTable {...collateral} />

        {/* Challenges Table */}
        <ChallengesTable {...challenges} positionData={positions.data} collateralData={collateral.data}/>

        {/* Minters Table */}
        <MintersTable {...minters} />

        {/* Bridges Table */}
        <BridgesTable {...bridges} />

        {/* Footer */}
        <div className="text-center text-xs text-gray-600 py-4">
          Monitoring API: http://localhost:3001
        </div>
      </div>
    </div>
  );
}

export default App;