import { useEffect, useMemo, useState } from 'react';
import type { HealthStatus, DeuroState, Position, Collateral, Challenge, Minter, Bridge } from '../types';

export interface DataState<T> {
	data?: T;
	error?: string;
}

export interface UseApiResult {
	health?: DataState<HealthStatus>;
	deuro?: DataState<DeuroState>;
	positions?: DataState<Position[]>;
	collateral?: DataState<Collateral[]>;
	challenges?: DataState<Challenge[]>;
	minters?: DataState<Minter[]>;
	bridges?: DataState<Bridge[]>;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const REFRESH_INTERVAL = 60000; // 1 minute

export function useApi(): UseApiResult {
	const [health, setHealth] = useState<DataState<HealthStatus>>();
	const [deuro, setDeuro] = useState<DataState<DeuroState>>();
	const [positions, setPositions] = useState<DataState<Position[]>>();
	const [collateral, setCollateral] = useState<DataState<Collateral[]>>();
	const [challenges, setChallenges] = useState<DataState<Challenge[]>>();
	const [minters, setMinters] = useState<DataState<Minter[]>>();
	const [bridges, setBridges] = useState<DataState<Bridge[]>>();

	useEffect(() => {
		fetchAllData();
		const interval = setInterval(fetchAllData, REFRESH_INTERVAL);
		return () => clearInterval(interval);
	}, []);

	async function fetchAllData(): Promise<void> {
		const healthResult = await fetchData('health', setHealth);
		if (!healthResult) return;

		await Promise.all([
			fetchData('deuro', setDeuro),
			fetchData('positions', setPositions),
			fetchData('collateral', setCollateral),
			fetchData('challenges', setChallenges),
			fetchData('minters', setMinters),
			fetchData('minters/bridges?all=true', setBridges),
		]);
	}

	async function fetchData<T>(endpoint: string, setState: (state: DataState<T>) => void) {
		try {
			const data: T = await fetchApi(`/${endpoint}`);
			setState({ data });
			return true;
		} catch (error: any) {
			setState({ error: error?.message || 'Unknown error' });
			return false;
		}
	}

	async function fetchApi<T>(endpoint: string): Promise<T> {
		console.log(`Fetching ${endpoint}...`);
		const response = await fetch(`${API_BASE_URL}${endpoint}`);
		if (!response?.ok) throw new Error(`API Error: ${response.statusText}`);
		return await response.json();
	}

	return useMemo(
		() => ({
			health,
			deuro,
			positions,
			collateral,
			challenges,
			minters,
			bridges,
		}),
		[health, deuro, positions, collateral, challenges, minters, bridges]
	);
}
