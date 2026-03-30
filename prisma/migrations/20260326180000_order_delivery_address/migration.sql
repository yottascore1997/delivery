-- UserAddress for customer saved delivery location
CREATE TABLE `UserAddress` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `label` VARCHAR(32) NOT NULL DEFAULT 'Home',
    `address` TEXT NOT NULL,
    `latitude` DOUBLE NOT NULL,
    `longitude` DOUBLE NOT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `UserAddress_userId_idx`(`userId`),
    INDEX `UserAddress_userId_isDefault_idx`(`userId`, `isDefault`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `UserAddress` ADD CONSTRAINT `UserAddress_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Snapshot on each order (Swiggy-style delivery pin). Matches Prisma `String @db.Text` → LONGTEXT on MySQL.
ALTER TABLE `Order` ADD COLUMN `deliveryAddress` LONGTEXT NOT NULL;
ALTER TABLE `Order` ADD COLUMN `deliveryLat` DOUBLE NOT NULL DEFAULT 0;
ALTER TABLE `Order` ADD COLUMN `deliveryLng` DOUBLE NOT NULL DEFAULT 0;
