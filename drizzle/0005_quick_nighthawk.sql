ALTER TABLE `daily_forecast` ADD `lafReforecast` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `daily_forecast` ADD `bcReforecast` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `routes` ADD `plannedMileage` decimal(8,2);--> statement-breakpoint
ALTER TABLE `routes` ADD `plannedDuration` int;--> statement-breakpoint
ALTER TABLE `routes` ADD `driverApproved` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `routes` ADD `driverApprovedAt` timestamp;--> statement-breakpoint
ALTER TABLE `routes` ADD `actualStops` int;--> statement-breakpoint
ALTER TABLE `routes` ADD `actualMileage` decimal(8,2);--> statement-breakpoint
ALTER TABLE `routes` ADD `actualDuration` int;--> statement-breakpoint
ALTER TABLE `routes` ADD `actualDriverPay` decimal(10,2);