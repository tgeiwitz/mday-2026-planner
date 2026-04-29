CREATE TABLE `historical_daily_2025` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskDate` varchar(10) NOT NULL,
	`daysBeforeMday` int NOT NULL,
	`lafTasks` int NOT NULL DEFAULT 0,
	`lafAvgFee` decimal(8,2) NOT NULL DEFAULT '0',
	`bcTasks` int NOT NULL DEFAULT 0,
	`bcAvgFee` decimal(8,2) NOT NULL DEFAULT '0',
	`otherTasks` int NOT NULL DEFAULT 0,
	CONSTRAINT `historical_daily_2025_id` PRIMARY KEY(`id`),
	CONSTRAINT `historical_daily_2025_taskDate_unique` UNIQUE(`taskDate`)
);
