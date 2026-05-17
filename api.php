<?php
require_once 'config.php';

$action = $_POST['action'] ?? $_GET['action'] ?? '';

if ($action == 'get_stats') {
    // دریافت آمار امروز
    $today = date('Y-m-d');
    $stmt = $pdo->prepare("SELECT * FROM daily_stats WHERE stat_date = ?");
    $stmt->execute([$today]);
    $stats = $stmt->fetch();
    
    if (!$stats) {
        $stats = updateDailyStats($pdo);
    }
    
    // دریافت تعداد کارهای روتین و Todo
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM routine_tasks");
    $routineTotal = $stmt->fetch()['total'];
    
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM todo_tasks");
    $todoTotal = $stmt->fetch()['total'];
    
    echo json_encode([
        'success' => true,
        'percentage' => $stats['percentage'],
        'done' => $stats['completed_count'],
        'total' => $stats['total_count'],
        'routine_total' => $routineTotal,
        'todo_total' => $todoTotal
    ]);
    
} elseif ($action == 'get_routine_tasks') {
    $stmt = $pdo->query("SELECT * FROM routine_tasks ORDER BY task_order");
    $tasks = $stmt->fetchAll();
    echo json_encode(['success' => true, 'tasks' => $tasks]);
    
} elseif ($action == 'get_todo_tasks') {
    $stmt = $pdo->query("SELECT * FROM todo_tasks ORDER BY id");
    $tasks = $stmt->fetchAll();
    echo json_encode(['success' => true, 'tasks' => $tasks]);
    
} elseif ($action == 'toggle_routine') {
    $taskId = $_POST['task_id'];
    $isDone = $_POST['is_done'] == 'true' ? 1 : 0;
    
    $stmt = $pdo->prepare("UPDATE routine_tasks SET is_done = ? WHERE id = ?");
    $stmt->execute([$isDone, $taskId]);
    
    // به‌روزرسانی آمار روزانه
    updateDailyStats($pdo);
    
    echo json_encode(['success' => true]);
    
} elseif ($action == 'toggle_todo') {
    $taskId = $_POST['task_id'];
    $isDone = $_POST['is_done'] == 'true' ? 1 : 0;
    
    $stmt = $pdo->prepare("UPDATE todo_tasks SET is_done = ? WHERE id = ?");
    $stmt->execute([$isDone, $taskId]);
    
    echo json_encode(['success' => true]);
    
} elseif ($action == 'add_routine_task') {
    $taskName = trim($_POST['task_name']);
    if (empty($taskName)) {
        echo json_encode(['success' => false, 'message' => 'Task name cannot be empty']);
        exit;
    }
    
    $stmt = $pdo->prepare("SELECT MAX(task_order) as max_order FROM routine_tasks");
    $stmt->execute();
    $maxOrder = $stmt->fetch()['max_order'] ?? 0;
    $newOrder = $maxOrder + 1;
    
    $stmt = $pdo->prepare("INSERT INTO routine_tasks (task_name, task_order) VALUES (?, ?)");
    $stmt->execute([$taskName, $newOrder]);
    $newId = $pdo->lastInsertId();
    
    updateDailyStats($pdo);
    
    echo json_encode(['success' => true, 'id' => $newId, 'task_name' => $taskName]);
    
} elseif ($action == 'add_todo_task') {
    $taskName = trim($_POST['task_name']);
    if (empty($taskName)) {
        echo json_encode(['success' => false, 'message' => 'Task name cannot be empty']);
        exit;
    }
    
    $stmt = $pdo->prepare("INSERT INTO todo_tasks (task_name) VALUES (?)");
    $stmt->execute([$taskName]);
    $newId = $pdo->lastInsertId();
    
    echo json_encode(['success' => true, 'id' => $newId, 'task_name' => $taskName]);
    
} elseif ($action == 'delete_routine_task') {
    $taskId = $_POST['task_id'];
    $stmt = $pdo->prepare("DELETE FROM routine_tasks WHERE id = ?");
    $stmt->execute([$taskId]);
    
    updateDailyStats($pdo);
    
    echo json_encode(['success' => true]);
    
} elseif ($action == 'delete_todo_task') {
    $taskId = $_POST['task_id'];
    $stmt = $pdo->prepare("DELETE FROM todo_tasks WHERE id = ?");
    $stmt->execute([$taskId]);
    
    echo json_encode(['success' => true]);
    
} elseif ($action == 'get_monthly_stats') {
    $year = $_GET['year'] ?? date('Y');
    $month = $_GET['month'] ?? date('m');
    
    $startDate = "$year-$month-01";
    $endDate = date('Y-m-t', strtotime($startDate));
    
    $stmt = $pdo->prepare("
        SELECT stat_date, percentage 
        FROM daily_stats 
        WHERE stat_date BETWEEN ? AND ?
        ORDER BY stat_date
    ");
    $stmt->execute([$startDate, $endDate]);
    $stats = $stmt->fetchAll();
    
    $result = [];
    foreach ($stats as $stat) {
        list($jy, $jm, $jd) = gregorian_to_jalali(
            (int)substr($stat['stat_date'], 0, 4),
            (int)substr($stat['stat_date'], 5, 2),
            (int)substr($stat['stat_date'], 8, 2)
        );
        $result[] = [
            'date' => $stat['stat_date'],
            'jalali_day' => $jd,
            'percentage' => (int)$stat['percentage']
        ];
    }
    
    echo json_encode(['success' => true, 'stats' => $result, 'year' => $year, 'month' => $month]);
    
} elseif ($action == 'reorder_routine') {
    $orders = json_decode($_POST['orders'], true);
    foreach ($orders as $order) {
        $stmt = $pdo->prepare("UPDATE routine_tasks SET task_order = ? WHERE id = ?");
        $stmt->execute([$order['order'], $order['id']]);
    }
    echo json_encode(['success' => true]);
    
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid action']);
}
?>