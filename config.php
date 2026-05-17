<?php
header('Content-Type: application/json; charset=utf-8');
date_default_timezone_set('Asia/Tehran');

$host = 'localhost';
$dbname = 'routine_manager';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    die(json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]));
}

// تابع تبدیل تاریخ میلادی به شمسی
function gregorian_to_jalali($g_y, $g_m, $g_d) {
    $g_days_in_month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    $j_days_in_month = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
    
    $gy = $g_y - 1600;
    $gm = $g_m - 1;
    $gd = $g_d - 1;
    
    $g_day_no = 365 * $gy + floor(($gy + 3) / 4) - floor(($gy + 99) / 100) + floor(($gy + 399) / 400);
    for ($i = 0; $i < $gm; ++$i) $g_day_no += $g_days_in_month[$i];
    if ($gm > 1 && (($gy % 4 == 0 && $gy % 100 != 0) || ($gy % 400 == 0))) $g_day_no++;
    $g_day_no += $gd;
    
    $j_day_no = $g_day_no - 79;
    $j_np = floor($j_day_no / 12053);
    $j_day_no %= 12053;
    $jy = 979 + 33 * $j_np + 4 * floor($j_day_no / 1461);
    $j_day_no %= 1461;
    if ($j_day_no >= 366) {
        $jy += floor(($j_day_no - 1) / 365);
        $j_day_no = ($j_day_no - 1) % 365;
    }
    for ($i = 0; $i < 11 && $j_day_no >= $j_days_in_month[$i]; ++$i) $j_day_no -= $j_days_in_month[$i];
    $jm = $i + 1;
    $jd = $j_day_no + 1;
    
    return [$jy, $jm, $jd];
}

// تابع به‌روزرسانی آمار روزانه
function updateDailyStats($pdo, $date = null) {
    if (!$date) $date = date('Y-m-d');
    
    $stmt = $pdo->prepare("SELECT COUNT(*) as total, SUM(is_done) as done FROM routine_tasks");
    $stmt->execute();
    $result = $stmt->fetch();
    
    $total = $result['total'];
    $done = $result['done'] ?? 0;
    $percentage = $total > 0 ? round(($done / $total) * 100) : 0;
    
    $stmt = $pdo->prepare("
        INSERT INTO daily_stats (stat_date, completed_count, total_count, percentage) 
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
        completed_count = VALUES(completed_count),
        total_count = VALUES(total_count),
        percentage = VALUES(percentage)
    ");
    $stmt->execute([$date, $done, $total, $percentage]);
    
    return ['total' => $total, 'done' => $done, 'percentage' => $percentage];
}
?>