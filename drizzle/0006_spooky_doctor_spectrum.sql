CREATE TABLE `route_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`routeId` int NOT NULL,
	`event` varchar(48) NOT NULL,
	`payload` text,
	`at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `route_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `routes` ADD `plannedDriverPay` decimal(10,2);--> statement-breakpoint
ALTER TABLE `routes` ADD `plannedLockedAt` timestamp;--> statement-breakpoint
ALTER TABLE `routes` ADD `needsReview` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `routes` ADD `reviewReason` text;--> statement-breakpoint
ALTER TABLE `routes` ADD `actualStopsReturned` int;--> statement-breakpoint
ALTER TABLE `routes` ADD `completionNotes` text;--> statement-breakpoint
ALTER TABLE `routes` ADD `completedAt` timestamp;