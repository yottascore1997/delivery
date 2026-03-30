-- Add main category -> subcategory structure for master catalog

-- 1) Main category table
CREATE TABLE `MasterMainCategory` (
  `id` VARCHAR(191) NOT NULL,
  `key` VARCHAR(32) NOT NULL,
  `name` VARCHAR(80) NOT NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  UNIQUE INDEX `MasterMainCategory_key_key`(`key`),
  INDEX `MasterMainCategory_sortOrder_idx`(`sortOrder`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2) MasterCategory: add mainCategoryId + backfill from old `vertical`
ALTER TABLE `MasterCategory` ADD COLUMN `mainCategoryId` VARCHAR(191) NULL;

-- Create main categories from existing verticals
INSERT IGNORE INTO `MasterMainCategory` (`id`, `key`, `name`, `sortOrder`)
SELECT DISTINCT
  REPLACE(UUID(), '-', ''),
  `vertical`,
  CONCAT(UCASE(LEFT(`vertical`, 1)), SUBSTRING(`vertical`, 2)),
  0
FROM `MasterCategory`;

-- Backfill mainCategoryId using the old vertical
UPDATE `MasterCategory` mc
JOIN `MasterMainCategory` mmc ON mmc.`key` = mc.`vertical`
SET mc.`mainCategoryId` = mmc.`id`;

-- Ensure not null now that backfill is done
ALTER TABLE `MasterCategory` MODIFY COLUMN `mainCategoryId` VARCHAR(191) NOT NULL;

-- Drop old indexes based on `vertical`
DROP INDEX `MasterCategory_vertical_name_key` ON `MasterCategory`;
DROP INDEX `MasterCategory_vertical_sortOrder_idx` ON `MasterCategory`;

-- Drop old column
ALTER TABLE `MasterCategory` DROP COLUMN `vertical`;

-- Add new indexes + FK
CREATE INDEX `MasterCategory_mainCategoryId_sortOrder_idx`
  ON `MasterCategory`(`mainCategoryId`, `sortOrder`);
CREATE UNIQUE INDEX `MasterCategory_mainCategoryId_name_key`
  ON `MasterCategory`(`mainCategoryId`, `name`);

ALTER TABLE `MasterCategory`
  ADD CONSTRAINT `MasterCategory_mainCategoryId_fkey`
  FOREIGN KEY (`mainCategoryId`) REFERENCES `MasterMainCategory`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

