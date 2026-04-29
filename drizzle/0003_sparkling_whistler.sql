CREATE TABLE `wodely_task_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`wodelyTaskId` varchar(64) NOT NULL,
	`merchant` enum('LAF','BC') NOT NULL,
	`deliveryDate` date NOT NULL,
	`zoneId` int,
	`taskFee` decimal(8,2) NOT NULL DEFAULT '0',
	`raw` text,
	`syncedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wodely_task_cache_id` PRIMARY KEY(`id`),
	CONSTRAINT `wodely_task_cache_wodelyTaskId_unique` UNIQUE(`wodelyTaskId`)
);
