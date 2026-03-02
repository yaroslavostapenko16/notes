-- MySQL Database Script for Notes Application
-- Database: u757840095_note
-- Created for Hostinger Deployment

-- Drop existing tables if they exist
DROP TABLE IF EXISTS `notes`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `note_history`;

-- Create Users Table
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_username` (`username`),
  INDEX `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create Notes Table
CREATE TABLE `notes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `title` VARCHAR(255),
  `content` LONGTEXT,
  `color` VARCHAR(7) DEFAULT '#FFFFFF',
  `is_pinned` BOOLEAN DEFAULT FALSE,
  `is_archived` BOOLEAN DEFAULT FALSE,
  `is_deleted` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `image_url` VARCHAR(255),
  `reminder_date` DATETIME,
  `tags` VARCHAR(500),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_is_archived` (`is_archived`),
  INDEX `idx_is_deleted` (`is_deleted`),
  INDEX `idx_is_pinned` (`is_pinned`),
  INDEX `idx_created_at` (`created_at`),
  FULLTEXT `ft_search` (`title`, `content`, `tags`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create Notes History Table for Undo/Restore functionality
CREATE TABLE `note_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `note_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `content` LONGTEXT,
  `title` VARCHAR(255),
  `action` VARCHAR(50),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_note_id` (`note_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create Labels Table for organizing notes
CREATE TABLE `labels` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `color` VARCHAR(7) DEFAULT '#999999',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_user_id` (`user_id`),
  UNIQUE KEY `unique_user_label` (`user_id`, `name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create Note Labels Junction Table
CREATE TABLE `note_labels` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `note_id` INT NOT NULL,
  `label_id` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`label_id`) REFERENCES `labels`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_note_label` (`note_id`, `label_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create Collaborators Table for shared notes
CREATE TABLE `collaborators` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `note_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `permission_level` ENUM('view', 'edit', 'admin') DEFAULT 'view',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_note_user` (`note_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample user (optional)
INSERT INTO `users` (`username`, `email`, `password`) VALUES 
('admin', 'admin@example.com', SHA2('admin123', 256));

-- Insert sample notes
INSERT INTO `notes` (`user_id`, `title`, `content`, `color`, `is_pinned`) VALUES 
(1, 'Welcome to Notes', 'This is your first note. Click on any note to edit it. You can change colors, pin important notes, or archive them when done.', '#FFE082', TRUE),
(1, 'Quick Tasks', 'Remember to:\n- Create new notes\n- Organize by labels\n- Search for content\n- Share with others', '#C5E1A5', FALSE),
(1, 'Meeting Notes', 'Discussion points from today:\n1. Product roadmap\n2. Timeline and milestones\n3. Resource allocation', '#FFCCBC', FALSE);

-- Create indexes for better performance
CREATE INDEX idx_notes_updated ON `notes`(`updated_at` DESC, `user_id`);
CREATE INDEX idx_notes_pinned_archived ON `notes`(`is_pinned` DESC, `is_archived`, `user_id`);
