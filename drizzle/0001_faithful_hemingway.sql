CREATE TABLE `daily_forecast` (
	`id` int AUTO_INCREMENT NOT NULL,
	`forecastDate` date NOT NULL,
	`dayName` varchar(16) NOT NULL,
	`phase` varchar(32) NOT NULL DEFAULT 'Standard',
	`laf2025Actual` int NOT NULL DEFAULT 0,
	`bc2025Actual` int NOT NULL DEFAULT 0,
	`laf60DayTrend` int NOT NULL DEFAULT 0,
	`bc60DayTrend` int NOT NULL DEFAULT 0,
	`laf2026Goal` int NOT NULL DEFAULT 0,
	`bc2026Goal` int NOT NULL DEFAULT 0,
	`lafConfirmed` int NOT NULL DEFAULT 0,
	`bcConfirmed` int NOT NULL DEFAULT 0,
	`maxLafCapacity` int NOT NULL DEFAULT 0,
	`maxBcCapacity` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `daily_forecast_id` PRIMARY KEY(`id`),
	CONSTRAINT `daily_forecast_forecastDate_unique` UNIQUE(`forecastDate`)
);
--> statement-breakpoint
CREATE TABLE `driver_timeblocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`driverId` int NOT NULL,
	`timeblockId` int NOT NULL,
	`assignmentStatus` enum('Signed Up','Scheduled') NOT NULL DEFAULT 'Signed Up',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `driver_timeblocks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `drivers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`status` enum('Confirmed','Pending','Placeholder') NOT NULL DEFAULT 'Pending',
	`driverType` enum('Lead','New') NOT NULL DEFAULT 'Lead',
	`timePerStopDiff` decimal(5,2) NOT NULL DEFAULT '0',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `drivers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `global_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settingKey` varchar(64) NOT NULL,
	`settingValue` varchar(255) NOT NULL,
	`description` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `global_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `global_settings_settingKey_unique` UNIQUE(`settingKey`)
);
--> statement-breakpoint
CREATE TABLE `route_zones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`routeId` int NOT NULL,
	`zoneId` int NOT NULL,
	`taskCount` int NOT NULL DEFAULT 0,
	CONSTRAINT `route_zones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `routes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`routeCode` varchar(32) NOT NULL,
	`timeblockId` int NOT NULL,
	`merchant` enum('LAF','BC') NOT NULL,
	`driverId` int,
	`stops` int NOT NULL DEFAULT 0,
	`estDuration` int NOT NULL DEFAULT 0,
	`estMileage` decimal(8,2) NOT NULL DEFAULT '0',
	`estRouteFee` decimal(10,2) NOT NULL DEFAULT '0',
	`estDriverPay` decimal(10,2) NOT NULL DEFAULT '0',
	`estMileagePay` decimal(10,2) NOT NULL DEFAULT '0',
	`estPlatformFee` decimal(10,2) NOT NULL DEFAULT '0',
	`payFloorOverride` decimal(8,2),
	`payMaxOverride` decimal(8,2),
	`holidayPerStopSurcharge` decimal(6,2) NOT NULL DEFAULT '0',
	`driverBonus` decimal(8,2) NOT NULL DEFAULT '0',
	`status` enum('Budgeted','Planned','Confirmed','Processed','Routed','Completed') NOT NULL DEFAULT 'Budgeted',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `routes_id` PRIMARY KEY(`id`),
	CONSTRAINT `routes_routeCode_unique` UNIQUE(`routeCode`)
);
--> statement-breakpoint
CREATE TABLE `timeblocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`blockDate` date NOT NULL,
	`dayName` varchar(16) NOT NULL,
	`wave` enum('Wave 1','Wave 2') NOT NULL,
	`label` varchar(128) NOT NULL,
	`lafPickupTime` varchar(8),
	`bcPickupTime` varchar(8),
	`availabilityStart` varchar(8) NOT NULL,
	`availabilityEnd` varchar(8) NOT NULL,
	`estRoutePay` decimal(8,2) NOT NULL DEFAULT '0',
	`estDuration` int NOT NULL DEFAULT 0,
	`bonus` decimal(8,2) NOT NULL DEFAULT '0',
	`minPayFloor` decimal(8,2) NOT NULL DEFAULT '150',
	`maxPayFloor` decimal(8,2) NOT NULL DEFAULT '250',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `timeblocks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `zone_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`zoneId` int NOT NULL,
	`zoneName` varchar(128),
	`travelTimeLastYear` decimal(8,2) NOT NULL DEFAULT '0',
	`distanceLastYear` decimal(8,2) NOT NULL DEFAULT '0',
	`lafFeeLastYear` decimal(8,2) NOT NULL DEFAULT '0',
	`bcFeeLastYear` decimal(8,2) NOT NULL DEFAULT '0',
	`travelTime60Day` decimal(8,2) NOT NULL DEFAULT '0',
	`distance60Day` decimal(8,2) NOT NULL DEFAULT '0',
	`lafFee60Day` decimal(8,2) NOT NULL DEFAULT '0',
	`bcFee60Day` decimal(8,2) NOT NULL DEFAULT '0',
	`travelTime2026` decimal(8,2) NOT NULL DEFAULT '0',
	`distance2026` decimal(8,2) NOT NULL DEFAULT '0',
	`lafFee2026` decimal(8,2) NOT NULL DEFAULT '0',
	`bcFee2026` decimal(8,2) NOT NULL DEFAULT '0',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `zone_metrics_id` PRIMARY KEY(`id`),
	CONSTRAINT `zone_metrics_zoneId_unique` UNIQUE(`zoneId`)
);
