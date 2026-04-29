CREATE TABLE `forecast_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`snapshotRunId` int NOT NULL,
	`forecastDate` date NOT NULL,
	`dayName` varchar(16) NOT NULL,
	`laf2026Goal` int NOT NULL DEFAULT 0,
	`bc2026Goal` int NOT NULL DEFAULT 0,
	`lafConfirmed` int NOT NULL DEFAULT 0,
	`bcConfirmed` int NOT NULL DEFAULT 0,
	`maxLafCapacity` int NOT NULL DEFAULT 0,
	`maxBcCapacity` int NOT NULL DEFAULT 0,
	`routesPlanned` int NOT NULL DEFAULT 0,
	`routesConfirmed` int NOT NULL DEFAULT 0,
	`revenue` decimal(12,2) NOT NULL DEFAULT '0',
	`driverPay` decimal(12,2) NOT NULL DEFAULT '0',
	CONSTRAINT `forecast_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `snapshot_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`triggerType` enum('auto','manual') NOT NULL DEFAULT 'manual',
	`label` varchar(128),
	`totalRoutes` int NOT NULL DEFAULT 0,
	`totalConfirmedLaf` int NOT NULL DEFAULT 0,
	`totalConfirmedBc` int NOT NULL DEFAULT 0,
	`totalGoalLaf` int NOT NULL DEFAULT 0,
	`totalGoalBc` int NOT NULL DEFAULT 0,
	`totalRevenue` decimal(12,2) NOT NULL DEFAULT '0',
	`totalDriverPay` decimal(12,2) NOT NULL DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `snapshot_runs_id` PRIMARY KEY(`id`)
);
