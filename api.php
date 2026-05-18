<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json; charset=utf-8');
date_default_timezone_set('Asia/Tehran');

// اتصال به دیتابیس
$host = 'localhost';
$dbname = 'routine_manager';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

$userId = 1;
$action = $_POST['action'] ?? $_GET['action'] ?? '';

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
    
    $stmt = $pdo->prepare("SELECT MAX(task_order) as max_order FROM routine_tasks");
    $stmt->execute();
    $maxOrder = $stmt->fetch(PDO::FETCH_ASSOC)['max_order'] ?? 0;
    $newOrder = $maxOrder + 1;
    
    $stmt = $pdo->prepare("INSERT INTO routine_tasks (task_name, task_order) VALUES (?, ?)");
    $result = $stmt->execute([$taskName, $newOrder]);
    
    if ($result) {
        $newId = $pdo->lastInsertId();
        echo json_encode(['success' => true, 'id' => $newId, 'task_name' => $taskName]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Database insert failed']);
    }
    
} elseif ($action == 'toggle_routine') {
    $taskId = $_POST['task_id'] ?? 0;
    $isDone = ($_POST['is_done'] ?? 'false') == 'true' ? 1 : 0;
    
    $stmt = $pdo->prepare("UPDATE routine_tasks SET is_done = ? WHERE id = ?");
    $result = $stmt->execute([$isDone, $taskId]);
    
    echo json_encode(['success' => $result]);
    
} elseif ($action == 'delete_routine_task') {
    $taskId = $_POST['task_id'] ?? 0;
    
    $stmt = $pdo->prepare("DELETE FROM routine_tasks WHERE id = ?");
    $result = $stmt->execute([$taskId]);
    
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
} elseif ($action == 'get_monthly_stats') {
    $year = $_GET['year'] ?? date('Y');
    $month = $_GET['month'] ?? date('m');
    $startDate = "$year-$month-01";
    $endDate = date('Y-m-t', strtotime($startDate));
    
    $stmt = $pdo->prepare("
        SELECT stat_date, percentage 
        FROM daily_stats 
        WHERE stat_date BETWEEN ? AND ?
    ");
    $stmt->execute([$startDate, $endDate]);
    $stats = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $result = [];
    foreach ($stats as $stat) {
        $dayNum = (int)substr($stat['stat_date'], 8, 2);
        $result[] = [
            'jalali_day' => $dayNum,
            'percentage' => (int)$stat['percentage']
        ];
    }
    
    echo json_encode(['success' => true, 'stats' => $result]);
    
} else {
    echo json_encode(['success' => false, 'message' => 'Unknown action: ' . $action]);
}
?>