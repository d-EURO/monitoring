import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { MinterStatus, MinterStatusEnum } from '../../common/dto/minter.dto';

@Injectable()
export class MinterService {
	constructor(private readonly db: DatabaseService) {}

	/**
	 * Get all minters with their current status
	 */
	async getAllMinters(): Promise<MinterStatus[]> {
		// Get the latest application for each minter
		const applications = await this.db.fetch<{
			minter: string;
			timestamp: Date;
			application_period: string;
			application_fee: string;
			message: string;
		}>(`
			SELECT minter, timestamp, application_period, application_fee, message
			FROM deuro_minter_applied_events e1
			WHERE timestamp = (
				SELECT MAX(timestamp) 
				FROM deuro_minter_applied_events e2 
				WHERE e2.minter = e1.minter
			)
			ORDER BY timestamp DESC
		`);

		// Get the latest denial for each minter (if any)
		const denials = await this.db.fetch<{
			minter: string;
			timestamp: Date;
			message: string;
		}>(`
			SELECT minter, timestamp, message
			FROM deuro_minter_denied_events d1
			WHERE timestamp = (
				SELECT MAX(timestamp) 
				FROM deuro_minter_denied_events d2 
				WHERE d2.minter = d1.minter
			)
		`);

		// Create a map of denials for quick lookup
		const denialMap = new Map(
			denials.map(d => [d.minter, { date: d.timestamp, message: d.message }])
		);

		// Build minter status list
		return applications.map(app => {
			const denial = denialMap.get(app.minter);
			
			// Determine status
			let status: MinterStatusEnum;
			if (denial && denial.date > app.timestamp) {
				// Denied after this application
				status = MinterStatusEnum.DENIED;
			} else {
				// Check if application period has passed
				const applicationEndTime = new Date(app.timestamp).getTime() + 
					(Number(app.application_period) * 1000);
				const now = Date.now();
				
				status = now < applicationEndTime ? MinterStatusEnum.PENDING : MinterStatusEnum.APPROVED;
			}

			return {
				minter: app.minter,
				status,
				applicationDate: app.timestamp,
				applicationPeriod: app.application_period,
				applicationFee: app.application_fee,
				message: app.message,
				denialDate: denial?.date,
				denialMessage: denial?.message,
			};
		});
	}

	/**
	 * Get minters filtered by status
	 */
	async getMintersByStatus(status: MinterStatusEnum): Promise<MinterStatus[]> {
		const allMinters = await this.getAllMinters();
		return allMinters.filter(m => m.status === status);
	}
}