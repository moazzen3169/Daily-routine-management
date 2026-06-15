<?php
error_reporting(E_ALL);
ini_set('display_errors', 0); // تغییر به 0 برای جلوگیری از نمایش خطاهای HTML
header('Content-Type: application/json; charset=utf-8');
date_default_timezone_set('Asia/Tehran');

// اتصال به دیتابیس
$db_file = __DIR__ . '/routine.sqlite';

try {
    $pdo = new PDO("sqlite:$db_file");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

$action = $_POST['action'] ?? $_GET['action'] ?? '';

// ============================================
// تابع به‌روزرسانی آمار روزانه
// ============================================
function updateDailyStats($pdo, $date = null) {
    if (!$date) $date = date('Y-m-d');
    
    // محاسبه آمار امروز - فقط تسک‌های روتین
    $stmt = $pdo->query("SELECT COUNT(*) as total, SUM(CASE WHEN is_done = 1 THEN 1 ELSE 0 END) as done FROM routine_tasks");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $total = (int)($result['total'] ?? 0);
    $done = (int)($result['done'] ?? 0);
    $percentage = $total > 0 ? round(($done / $total) * 100) : 0;
    
    // ذخیره در دیتابیس (SQLite syntax)
    $stmt = $pdo->prepare("
        INSERT INTO daily_stats (stat_date, completed_count, total_count, percentage) 
        VALUES (?, ?, ?, ?)
        ON CONFLICT(stat_date) DO UPDATE SET
        completed_count = excluded.completed_count,
        total_count = excluded.total_count,
        percentage = excluded.percentage
    ");
    $stmt->execute([$date, $done, $total, $percentage]);
    
    return ['total' => $total, 'done' => $done, 'percentage' => $percentage];
}

// ============================================
// تابع ریست تسک‌های روزانه
// ============================================
function resetDailyTasks($pdo) {
    // 1. اول آمار روز قبل رو ذخیره کن
    $yesterday = date('Y-m-d', strtotime('-1 day'));
    updateDailyStats($pdo, $yesterday);
    
    // 2. ریست کردن تسک‌های روتین
    $stmt = $pdo->prepare("UPDATE routine_tasks SET is_done = 0");
    $stmt->execute();
    
    // 3. ذخیره آمار امروز (بعد از ریست)
    updateDailyStats($pdo, date('Y-m-d'));
    
    return true;
}

// ============================================
// آمار
// ============================================
if ($action == 'get_stats') {
    $stmt = $pdo->query("SELECT COUNT(*) as total, SUM(is_done) as done FROM routine_tasks");
    $stats = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'percentage' => $stats['total'] > 0 ? round(($stats['done'] / $stats['total']) * 100) : 0,
        'done' => (int)$stats['done'],
        'total' => (int)$stats['total']
    ]);
    
// ============================================
// ریست روزانه
// ============================================
} elseif ($action == 'reset_daily_tasks') {
    $result = resetDailyTasks($pdo);
    echo json_encode(['success' => $result]);
    
// ============================================
// بررسی و ریست خودکار
// ============================================
} elseif ($action == 'check_and_reset') {
    $lastResetDate = $_POST['last_date'] ?? '';
    $today = date('Y-m-d');
    
    if ($lastResetDate !== $today) {
        resetDailyTasks($pdo);
        echo json_encode(['success' => true, 'reset' => true, 'new_date' => $today]);
    } else {
        echo json_encode(['success' => true, 'reset' => false]);
    }
    
// ============================================
// Routine Tasks
// ============================================
} elseif ($action == 'get_routine_tasks') {
    $stmt = $pdo->query("SELECT * FROM routine_tasks ORDER BY task_order");
    $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'tasks' => $tasks]);
    
} elseif ($action == 'add_routine_task') {
    $taskName = trim($_POST['task_name'] ?? '');
    
    if (empty($taskName)) {
        echo json_encode(['success' => false, 'message' => 'Task name cannot be empty']);
        exit;
    }
    
    $stmt = $pdo->query("SELECT MAX(task_order) as max_order FROM routine_tasks");
    $maxOrder = $stmt->fetch(PDO::FETCH_ASSOC)['max_order'] ?? 0;
    $newOrder = $maxOrder + 1;
    
    $stmt = $pdo->prepare("INSERT INTO routine_tasks (task_name, task_order) VALUES (?, ?)");
    $result = $stmt->execute([$taskName, $newOrder]);
    
    if ($result) {
        $newId = $pdo->lastInsertId();
        updateDailyStats($pdo);
        echo json_encode(['success' => true, 'id' => $newId, 'task_name' => $taskName]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Database insert failed']);
    }
    
} elseif ($action == 'update_routine_task') {
    $taskId = $_POST['task_id'] ?? 0;
    $taskName = trim($_POST['task_name'] ?? '');
    
    if (empty($taskName)) {
        echo json_encode(['success' => false, 'message' => 'Task name cannot be empty']);
        exit;
    }
    
    $stmt = $pdo->prepare("UPDATE routine_tasks SET task_name = ? WHERE id = ?");
    $result = $stmt->execute([$taskName, $taskId]);
    
    echo json_encode(['success' => $result]);
    
} elseif ($action == 'toggle_routine') {
    $taskId = $_POST['task_id'] ?? 0;
    $isDone = ($_POST['is_done'] ?? 'false') == 'true' ? 1 : 0;
    
    $stmt = $pdo->prepare("UPDATE routine_tasks SET is_done = ? WHERE id = ?");
    $result = $stmt->execute([$isDone, $taskId]);
    
    if ($result) {
        updateDailyStats($pdo);
    }
    
    echo json_encode(['success' => $result]);
    
} elseif ($action == 'delete_routine_task') {
    $taskId = $_POST['task_id'] ?? 0;
    
    $stmt = $pdo->prepare("DELETE FROM routine_tasks WHERE id = ?");
    $result = $stmt->execute([$taskId]);
    
    if ($result) {
        updateDailyStats($pdo);
    }
    
    echo json_encode(['success' => $result]);
    
// ============================================
// Todo Tasks
// ============================================
} elseif ($action == 'get_todo_tasks') {
    $stmt = $pdo->query("SELECT * FROM todo_tasks ORDER BY id DESC");
    $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'tasks' => $tasks]);
    
} elseif ($action == 'add_todo_task') {
    $taskName = trim($_POST['task_name'] ?? '');
    
    if (empty($taskName)) {
        echo json_encode(['success' => false, 'message' => 'Task name cannot be empty']);
        exit;
    }
    
    $stmt = $pdo->prepare("INSERT INTO todo_tasks (task_name) VALUES (?)");
    $result = $stmt->execute([$taskName]);
    
    if ($result) {
        $newId = $pdo->lastInsertId();
        echo json_encode(['success' => true, 'id' => $newId, 'task_name' => $taskName]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Database insert failed']);
    }
    
} elseif ($action == 'update_todo_task') {
    $taskId = $_POST['task_id'] ?? 0;
    $taskName = trim($_POST['task_name'] ?? '');
    
    if (empty($taskName)) {
        echo json_encode(['success' => false, 'message' => 'Task name cannot be empty']);
        exit;
    }
    
    $stmt = $pdo->prepare("UPDATE todo_tasks SET task_name = ? WHERE id = ?");
    $result = $stmt->execute([$taskName, $taskId]);
    
    echo json_encode(['success' => $result]);
    
} elseif ($action == 'toggle_todo') {
    $taskId = $_POST['task_id'] ?? 0;
    $isDone = ($_POST['is_done'] ?? 'false') == 'true' ? 1 : 0;
    
    $stmt = $pdo->prepare("UPDATE todo_tasks SET is_done = ? WHERE id = ?");
    $result = $stmt->execute([$isDone, $taskId]);
    
    echo json_encode(['success' => $result]);
    
} elseif ($action == 'delete_todo_task') {
    $taskId = $_POST['task_id'] ?? 0;
    
    $stmt = $pdo->prepare("DELETE FROM todo_tasks WHERE id = ?");
    $result = $stmt->execute([$taskId]);
    
    echo json_encode(['success' => $result]);
    
// ============================================
// Movies
// ============================================
} elseif ($action == 'get_movies') {
    $stmt = $pdo->query("SELECT * FROM movies ORDER BY id DESC");
    $movies = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'movies' => $movies]);
    
} elseif ($action == 'add_movie') {
    $movieName = trim($_POST['movie_name'] ?? '');
    
    if (empty($movieName)) {
        echo json_encode(['success' => false, 'message' => 'Movie name cannot be empty']);
        exit;
    }
    
    $stmt = $pdo->prepare("INSERT INTO movies (movie_name) VALUES (?)");
    $result = $stmt->execute([$movieName]);
    
    if ($result) {
        $newId = $pdo->lastInsertId();
        echo json_encode(['success' => true, 'id' => $newId, 'movie_name' => $movieName]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Database insert failed']);
    }
    
} elseif ($action == 'update_movie') {
    $movieId = $_POST['movie_id'] ?? 0;
    $movieName = trim($_POST['movie_name'] ?? '');
    
    if (empty($movieName)) {
        echo json_encode(['success' => false, 'message' => 'Movie name cannot be empty']);
        exit;
    }
    
    $stmt = $pdo->prepare("UPDATE movies SET movie_name = ? WHERE id = ?");
    $result = $stmt->execute([$movieName, $movieId]);
    
    echo json_encode(['success' => $result]);
    
} elseif ($action == 'toggle_movie') {
    $movieId = $_POST['movie_id'] ?? 0;
    $isWatched = ($_POST['is_watched'] ?? 'false') == 'true' ? 1 : 0;
    
    $stmt = $pdo->prepare("UPDATE movies SET is_watched = ? WHERE id = ?");
    $result = $stmt->execute([$isWatched, $movieId]);
    
    echo json_encode(['success' => $result]);
    
} elseif ($action == 'delete_movie') {
    $movieId = $_POST['movie_id'] ?? 0;
    
    $stmt = $pdo->prepare("DELETE FROM movies WHERE id = ?");
    $result = $stmt->execute([$movieId]);
    
    echo json_encode(['success' => $result]);
    
// ============================================
// Books
// ============================================
} elseif ($action == 'get_books') {
    $stmt = $pdo->query("SELECT * FROM books ORDER BY id DESC");
    $books = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'books' => $books]);
    
} elseif ($action == 'add_book') {
    $bookName = trim($_POST['book_name'] ?? '');
    
    if (empty($bookName)) {
        echo json_encode(['success' => false, 'message' => 'Book name cannot be empty']);
        exit;
    }
    
    $stmt = $pdo->prepare("INSERT INTO books (book_name) VALUES (?)");
    $result = $stmt->execute([$bookName]);
    
    if ($result) {
        $newId = $pdo->lastInsertId();
        echo json_encode(['success' => true, 'id' => $newId, 'book_name' => $bookName]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Database insert failed']);
    }
    
} elseif ($action == 'update_book') {
    $bookId = $_POST['book_id'] ?? 0;
    $bookName = trim($_POST['book_name'] ?? '');
    
    if (empty($bookName)) {
        echo json_encode(['success' => false, 'message' => 'Book name cannot be empty']);
        exit;
    }
    
    $stmt = $pdo->prepare("UPDATE books SET book_name = ? WHERE id = ?");
    $result = $stmt->execute([$bookName, $bookId]);
    
    echo json_encode(['success' => $result]);
    
} elseif ($action == 'toggle_book') {
    $bookId = $_POST['book_id'] ?? 0;
    $isRead = ($_POST['is_read'] ?? 'false') == 'true' ? 1 : 0;
    
    $stmt = $pdo->prepare("UPDATE books SET is_read = ? WHERE id = ?");
    $result = $stmt->execute([$isRead, $bookId]);
    
    echo json_encode(['success' => $result]);
    
} elseif ($action == 'delete_book') {
    $bookId = $_POST['book_id'] ?? 0;
    
    $stmt = $pdo->prepare("DELETE FROM books WHERE id = ?");
    $result = $stmt->execute([$bookId]);
    
    echo json_encode(['success' => $result]);
    
// ============================================
// Monthly Stats
// ============================================
} elseif ($action == 'get_calendar_stats') {
    $days = $_GET['days'] ?? 365;
    $startDate = date('Y-m-d', strtotime("-$days days"));
    $today = date('Y-m-d');

    $stmt = $pdo->prepare("
        SELECT stat_date, percentage, completed_count, total_count
        FROM daily_stats
        WHERE stat_date BETWEEN ? AND ?
        ORDER BY stat_date ASC
    ");
    $stmt->execute([$startDate, $today]);
    $stats = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'stats' => $stats]);

} elseif ($action == 'get_monthly_stats') {
    $year = $_GET['year'] ?? date('Y');
    $month = $_GET['month'] ?? date('m');
    $startDate = "$year-$month-01";
    $endDate = date('Y-m-t', strtotime($startDate));
    
    $stmt = $pdo->prepare("
        SELECT stat_date, percentage, completed_count, total_count
        FROM daily_stats 
        WHERE stat_date BETWEEN ? AND ?
        ORDER BY stat_date
    ");
    $stmt->execute([$startDate, $endDate]);
    $stats = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $result = [];
    foreach ($stats as $stat) {
        $dayNum = (int)substr($stat['stat_date'], 8, 2);
        $result[] = [
            'jalali_day' => $dayNum,
            'stat_date' => $stat['stat_date'],
            'percentage' => (int)$stat['percentage'],
            'completed' => (int)$stat['completed_count'],
            'total' => (int)$stat['total_count']
        ];
    }
    
    echo json_encode(['success' => true, 'stats' => $result]);
    
} else {
    echo json_encode(['success' => false, 'message' => 'Unknown action: ' . $action]);
}
?>