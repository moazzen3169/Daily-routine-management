-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Jun 15, 2026 at 01:14 PM
-- Server version: 8.4.7
-- PHP Version: 8.3.28

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `routine_manager`
--

-- --------------------------------------------------------

--
-- Table structure for table `books`
--

DROP TABLE IF EXISTS `books`;
CREATE TABLE IF NOT EXISTS `books` (
  `id` int NOT NULL AUTO_INCREMENT,
  `book_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_books_read` (`is_read`)
) ENGINE=MyISAM AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `books`
--

INSERT INTO `books` (`id`, `book_name`, `is_read`, `created_at`) VALUES
(2, 'ژزرمینال', 0, '2026-05-18 10:32:58'),
(3, 'قانون جاذبه', 1, '2026-05-18 10:33:10'),
(4, 'اگزیستانسیالیسم و اصالت بشر', 0, '2026-05-18 10:33:25'),
(5, 'درباب حکمت زندگی', 0, '2026-05-18 10:33:43');

-- --------------------------------------------------------

--
-- Table structure for table `daily_stats`
--

DROP TABLE IF EXISTS `daily_stats`;
CREATE TABLE IF NOT EXISTS `daily_stats` (
  `id` int NOT NULL AUTO_INCREMENT,
  `stat_date` date NOT NULL,
  `completed_count` int DEFAULT '0',
  `total_count` int DEFAULT '0',
  `percentage` int DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_date` (`stat_date`)
) ENGINE=MyISAM AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `daily_stats`
--

INSERT INTO `daily_stats` (`id`, `stat_date`, `completed_count`, `total_count`, `percentage`) VALUES
(1, '2026-05-18', 0, 5, 0),
(2, '2026-05-20', 6, 6, 100),
(3, '2026-05-13', 2, 4, 50),
(4, '2026-05-14', 1, 4, 25),
(5, '2026-05-15', 3, 4, 75),
(6, '2026-05-16', 0, 4, 0),
(7, '2026-05-17', 4, 4, 100),
(8, '2026-05-06', 1, 4, 25),
(9, '2026-05-07', 2, 4, 50),
(10, '2026-05-08', 3, 4, 75),
(11, '2026-05-09', 0, 4, 0),
(12, '2026-05-10', 4, 4, 100),
(13, '2026-05-11', 2, 4, 50),
(14, '2026-05-12', 3, 4, 75),
(15, '2026-05-21', 3, 6, 50),
(16, '2026-05-22', 2, 6, 33),
(17, '2026-05-23', 5, 6, 83),
(18, '2026-05-24', 6, 6, 100),
(19, '2026-05-28', 6, 6, 100),
(20, '2026-05-31', 6, 6, 100),
(21, '2026-06-02', 6, 6, 100),
(22, '2026-06-03', 6, 6, 100),
(23, '2026-06-04', 6, 6, 100),
(24, '2026-06-06', 6, 6, 100),
(25, '2026-06-08', 6, 6, 100),
(26, '2026-06-09', 6, 6, 100),
(27, '2026-06-10', 6, 6, 100),
(28, '2026-06-11', 6, 6, 100),
(29, '2026-06-14', 6, 6, 100),
(30, '2026-06-15', 6, 6, 100);

-- --------------------------------------------------------

--
-- Table structure for table `movies`
--

DROP TABLE IF EXISTS `movies`;
CREATE TABLE IF NOT EXISTS `movies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `movie_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_watched` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_movies_watched` (`is_watched`)
) ENGINE=MyISAM AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `movies`
--

INSERT INTO `movies` (`id`, `movie_name`, `is_watched`, `created_at`) VALUES
(2, 'Black Swan 2010', 0, '2026-05-18 10:46:18'),
(3, 'Her 2013', 0, '2026-05-18 10:46:58'),
(4, 'Ex Machina', 0, '2026-05-18 10:47:59'),
(5, 'Arrival 2016', 1, '2026-05-18 10:48:24'),
(6, 'Dallas Buyers Club 2013', 0, '2026-05-18 10:48:32'),
(10, 'babam ve oglum', 1, '2026-05-21 14:29:27');

-- --------------------------------------------------------

--
-- Table structure for table `routine_tasks`
--

DROP TABLE IF EXISTS `routine_tasks`;
CREATE TABLE IF NOT EXISTS `routine_tasks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `task_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_done` tinyint(1) DEFAULT '0',
  `task_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_routine_done` (`is_done`)
) ENGINE=MyISAM AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `routine_tasks`
--

INSERT INTO `routine_tasks` (`id`, `task_name`, `is_done`, `task_order`, `created_at`) VALUES
(9, 'کار', 1, 3, '2026-05-18 10:34:50'),
(8, 'پیادروی یا رویدن', 1, 2, '2026-05-18 10:34:41'),
(7, 'ساعت 7 بیدار شدن', 1, 1, '2026-05-18 10:34:27'),
(10, '30 صفحه کتاب خواندن', 1, 4, '2026-05-18 10:35:08'),
(11, '1 فیلم دیدن', 1, 5, '2026-05-18 10:35:17'),
(12, '1ساعت آزاد', 1, 6, '2026-05-18 10:35:35');

-- --------------------------------------------------------

--
-- Table structure for table `todo_tasks`
--

DROP TABLE IF EXISTS `todo_tasks`;
CREATE TABLE IF NOT EXISTS `todo_tasks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `task_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_done` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_todo_done` (`is_done`)
) ENGINE=MyISAM AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `todo_tasks`
--

INSERT INTO `todo_tasks` (`id`, `task_name`, `is_done`, `created_at`) VALUES
(4, 'جایگذین نظرات واقعی به پروژه sevra', 1, '2026-05-18 10:37:02'),
(5, 'افزودن 1 فونت بهتر برای پروژه  DRM', 1, '2026-05-18 10:39:09'),
(6, 'تغییر آیکون \"دکمه حذف\"', 1, '2026-05-18 10:39:48'),
(7, 'تغییر استایل تسک ها و حالت تیک خورده', 0, '2026-05-18 10:40:20'),
(8, 'glow های بکگراند position fix باشه', 1, '2026-05-18 10:50:27'),
(9, 'مشکل ارتفاع کارت های فیلم و کتاب حل بشه', 1, '2026-05-18 10:50:59'),
(10, 'pomodoro آپدیت بشه', 0, '2026-05-18 15:06:05'),
(12, 'تغییر الگوریتم Monthly Calendar', 0, '2026-05-19 15:24:42');
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
