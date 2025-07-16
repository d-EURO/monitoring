// Simple API client for monitoring data

import type {
  HealthStatus,
  DeuroState,
  Position,
  Collateral,
  Challenge,
  Minter,
  Bridge
} from '../types';

const API_BASE_URL = 'http://localhost:3001';

export class ApiError extends Error {
  status: number;
  
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function fetchApi<T>(endpoint: string): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    
    if (!response.ok) {
      throw new ApiError(response.status, `API Error: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new Error('Network error: Unable to connect to monitoring API');
  }
}

// API endpoints
export const api = {
  health: () => fetchApi<HealthStatus>('/health'),
  deuro: () => fetchApi<DeuroState>('/deuro'),
  positions: () => fetchApi<Position[]>('/positions'),
  collateral: () => fetchApi<Collateral[]>('/collateral'),
  challenges: () => fetchApi<Challenge[]>('/challenges'),
  minters: (status?: string) => 
    fetchApi<Minter[]>(`/minters${status ? `?status=${status}` : ''}`),
  bridges: (all?: boolean) => 
    fetchApi<Bridge[]>(`/minters/bridges${all ? '?all=true' : ''}`),
};