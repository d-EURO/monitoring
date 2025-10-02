import { useEffect, useState } from 'react';

interface VerificationStatus {
	minters: {
		blockchain: number;
		database: number;
		hasDiscrepancy: boolean;
	};
	positions: {
		blockchain: number;
		database: number;
		hasDiscrepancy: boolean;
	};
}

export function VerificationAlert() {
	const [verification, setVerification] = useState<VerificationStatus | null>(null);

	useEffect(() => {
		const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

		const fetchVerification = async () => {
			try {
				const response = await fetch(`${apiUrl}/verification`);
				if (response.ok) {
					const data = await response.json();
					setVerification(data);
				}
			} catch (err) {
				console.error('Failed to fetch verification status:', err);
			}
		};

		fetchVerification();
		const interval = setInterval(fetchVerification, 60000); // Refresh every minute
		return () => clearInterval(interval);
	}, []);

	if (!verification) return null;

	const { minters, positions } = verification;

	return (
		<>
			{minters.hasDiscrepancy && (
				<div className="bg-red-600 text-white p-3 rounded-xl mb-4 font-bold text-center animate-pulse">
					⚠️ WARNING: Minter database capture incomplete! Blockchain: {minters.blockchain} | Database: {minters.database}
				</div>
			)}
			{positions.hasDiscrepancy && (
				<div className="bg-red-600 text-white p-3 rounded-xl mb-4 font-bold text-center animate-pulse">
					⚠️ WARNING: Position database capture incomplete! Blockchain: {positions.blockchain} | Database: {positions.database}
				</div>
			)}
		</>
	);
}
