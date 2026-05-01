CREATE TABLE `merchant_day_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`merchant` enum('LAF','BC','SMC','SMR') NOT NULL,
	`noteDate` date NOT NULL,
	`note` text,
	`updatedBy` varchar(128),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `merchant_day_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `merchant_share_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(64) NOT NULL,
	`merchant` enum('LAF','BC','SMC','SMR') NOT NULL,
	`label` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`revokedAt` timestamp,
	`lastUsedAt` timestamp,
	CONSTRAINT `merchant_share_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `merchant_share_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `wodely_routes_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`wodelyRouteId` int NOT NULL,
	`routeName` varchar(128),
	`statusId` varchar(32),
	`startTime` timestamp,
	`endTime` timestamp,
	`actualStartTime` timestamp,
	`actualEndTime` timestamp,
	`driverUserId` varchar(64),
	`driverFullName` varchar(128),
	`startAddress` varchar(255),
	`endAddress` varchar(255),
	`distance` int,
	`duration` int,
	`routeDate` date NOT NULL,
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	`removedAt` timestamp,
	CONSTRAINT `wodely_routes_cache_id` PRIMARY KEY(`id`),
	CONSTRAINT `wodely_routes_cache_wodelyRouteId_unique` UNIQUE(`wodelyRouteId`)
);
--> statement-breakpoint
CREATE TABLE `zone_task_history_2025` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskDate` date NOT NULL,
	`merchant` enum('LAF','BC','SMC','SMR') NOT NULL,
	`zoneId` int NOT NULL,
	`taskCount` int NOT NULL DEFAULT 0,
	`avgFee` decimal(10,2) NOT NULL DEFAULT '0',
	CONSTRAINT `zone_task_history_2025_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `routes` MODIFY COLUMN `merchant` enum('LAF','BC','SMC','SMR') NOT NULL;--> statement-breakpoint
ALTER TABLE `timeblocks` MODIFY COLUMN `wave` enum('Wave 1','Wave 2');--> statement-breakpoint
ALTER TABLE `wodely_task_cache` MODIFY COLUMN `merchant` enum('LAF','BC','SMC','SMR') NOT NULL;--> statement-breakpoint
ALTER TABLE `driver_timeblocks` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `drivers` ADD `payPctOverride` decimal(5,4);--> statement-breakpoint
ALTER TABLE `drivers` ADD `payFloorOverride` decimal(10,2);--> statement-breakpoint
ALTER TABLE `drivers` ADD `payMaxOverride` decimal(10,2);--> statement-breakpoint
ALTER TABLE `drivers` ADD `hourlyTargetMin` decimal(6,2);--> statement-breakpoint
ALTER TABLE `drivers` ADD `hourlyTargetMax` decimal(6,2);--> statement-breakpoint
ALTER TABLE `drivers` ADD `maxCapacity` int;--> statement-breakpoint
ALTER TABLE `drivers` ADD `targetDuration` int;--> statement-breakpoint
ALTER TABLE `drivers` ADD `targetStops` int;--> statement-breakpoint
ALTER TABLE `drivers` ADD `vehicleType` enum('sedan','van') DEFAULT 'sedan' NOT NULL;--> statement-breakpoint
ALTER TABLE `routes` ADD `bookingType` enum('Direct','Flex') DEFAULT 'Direct' NOT NULL;--> statement-breakpoint
ALTER TABLE `routes` ADD `estRouteBasePay` decimal(10,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `routes` ADD `estTotalDriverPay` decimal(10,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `routes` ADD `wodelyAdjustment` decimal(10,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `routes` ADD `maxCapacity` int;--> statement-breakpoint
ALTER TABLE `routes` ADD `targetDuration` int;--> statement-breakpoint
ALTER TABLE `routes` ADD `targetStops` int;--> statement-breakpoint
ALTER TABLE `routes` ADD `hourlyTargetMin` decimal(6,2);--> statement-breakpoint
ALTER TABLE `routes` ADD `hourlyTargetMax` decimal(6,2);--> statement-breakpoint
ALTER TABLE `routes` ADD `vehicleType` enum('sedan','van');--> statement-breakpoint
ALTER TABLE `routes` ADD `assignmentConfirmed` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `routes` ADD `assignmentConfirmedAt` timestamp;--> statement-breakpoint
ALTER TABLE `timeblocks` ADD `merchant` enum('LAF','BC','SMC','SMR','Flex') DEFAULT 'Flex' NOT NULL;--> statement-breakpoint
ALTER TABLE `timeblocks` ADD `bookingType` enum('Direct','Flex') DEFAULT 'Flex' NOT NULL;--> statement-breakpoint
ALTER TABLE `timeblocks` ADD `routeStart` varchar(8);--> statement-breakpoint
ALTER TABLE `timeblocks` ADD `pickupDwell` int DEFAULT 15 NOT NULL;--> statement-breakpoint
ALTER TABLE `timeblocks` ADD `mileageRate` decimal(6,3) DEFAULT '0.670' NOT NULL;--> statement-breakpoint
ALTER TABLE `timeblocks` ADD `targetRoutes` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `timeblocks` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `wodely_task_cache` ADD `routePlanId` int;--> statement-breakpoint
ALTER TABLE `wodely_task_cache` ADD `routeSortId` int;--> statement-breakpoint
ALTER TABLE `wodely_task_cache` ADD `routeName` varchar(128);--> statement-breakpoint
ALTER TABLE `wodely_task_cache` ADD `driverName` varchar(128);--> statement-breakpoint
ALTER TABLE `wodely_task_cache` ADD `taskStatusId` int;--> statement-breakpoint
ALTER TABLE `zone_metrics` ADD `laf_volume_2025` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `zone_metrics` ADD `bc_volume_2025` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `zone_metrics` ADD `travelTimeSource` enum('global','lastYear','sixtyDay','y2026') DEFAULT 'global' NOT NULL;