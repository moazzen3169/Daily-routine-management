// ============================================
// توابع تبدیل تاریخ به شمسی
// ============================================
function gregorianToJalali(gy, gm, gd) {
    const gDaysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const jDaysInMonth = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
    
    let gy2 = gy - 1600;
    let gm2 = gm - 1;
    let gd2 = gd - 1;
    
    let gDayNo = 365 * gy2 + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400);
    for (let i = 0; i < gm2; i++) gDayNo += gDaysInMonth[i];
    if (gm2 > 1 && ((gy2 % 4 === 0 && gy2 % 100 !== 0) || gy2 % 400 === 0)) gDayNo++;
    gDayNo += gd2;
    
    let jDayNo = gDayNo - 79;
    let jNp = Math.floor(jDayNo / 12053);
    jDayNo %= 12053;
    let jy = 979 + 33 * jNp + 4 * Math.floor(jDayNo / 1461);
    jDayNo %= 1461;
    if (jDayNo >= 366) {
        jy += Math.floor((jDayNo - 1) / 365);
        jDayNo = (jDayNo - 1) % 365;
    }
    let jm = 1;
    for (let i = 0; i < 11 && jDayNo >= jDaysInMonth[i]; i++) {
        jDayNo -= jDaysInMonth[i];
        jm++;
    }
    let jd = jDayNo + 1;
    return [jy, jm, jd];
}

// ============================================
// متغیرهای عمومی
// ============================================
let currentTab = 'routine';
let currentMonth = new Date();
let timerInterval = null;
let timerSeconds = 25 * 60;
let isRunning = false;
let currentMode = 'work';

// ============================================
// مدیریت مودال‌ها
// ============================================
function showTaskModal() {
    const modal = document.getElementById('taskModal');
    if (modal) modal.style.display = 'flex';
}

function hideTaskModal() {
    const modal = document.getElementById('taskModal');
    if (modal) modal.style.display = 'none';
    document.getElementById('newTaskTitle').value = '';
}

function showTimeModal() {
    const modal = document.getElementById('timeModal');
    if (modal) modal.style.display = 'flex';
}

function hideTimeModal() {
    const modal = document.getElementById('timeModal');
    if (modal) modal.style.display = 'none';
    document.getElementById('addMinutesInput').value = '5';
}

// ============================================
// بارگذاری آمار
// ============================================
async function loadStats() {
    try {
        const response = await fetch('api.php?action=get_stats');
        const data = await response.json();
        
        if (data.success) {
            const progressBar = document.querySelector('.progress-bar');
            if (progressBar) progressBar.textContent = data.percentage + '%';
            
            const progressFill = document.querySelector('.Progress-fill');
            if (progressFill) progressFill.style.width = data.percentage + '%';
            
            const taskDoneElement = document.querySelector('.main-data:nth-child(2) .data');
            if (taskDoneElement) taskDoneElement.textContent = data.done;
            
            const allTasksElement = document.querySelector('.main-data:nth-child(3) .data');
            if (allTasksElement) allTasksElement.textContent = data.total;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// ============================================
// بارگذاری کارهای روتین
// ============================================
async function loadRoutineTasks() {
    try {
        const response = await fetch('api.php?action=get_routine_tasks');
        const data = await response.json();
        
        if (data.success) {
            const container = document.querySelector('.routin-tasks');
            if (!container) return;
            
            container.innerHTML = '';
            data.tasks.forEach((task) => {
                const label = document.createElement('label');
                label.className = 'task';
                label.setAttribute('data-id', task.id);
                label.innerHTML = `
                    <input type="checkbox" name="routine-task" data-id="${task.id}" ${task.is_done ? 'checked' : ''}>
                    <span>${escapeHtml(task.task_name)}</span>
                    <button class="delete-task-btn" data-id="${task.id}" data-type="routine"><img src="assets/delete.svg" ></button>
                `;
                container.appendChild(label);
            });
            
            document.querySelectorAll('.routin-tasks input[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', handleRoutineToggle);
            });
            
            document.querySelectorAll('.delete-task-btn[data-type="routine"]').forEach(btn => {
                btn.addEventListener('click', handleDeleteRoutine);
            });
        }
    } catch (error) {
        console.error('Error loading routine tasks:', error);
    }
}

// ============================================
// بارگذاری Todo List
// ============================================
async function loadTodoTasks() {
    try {
        const response = await fetch('api.php?action=get_todo_tasks');
        const data = await response.json();
        
        if (data.success) {
            const container = document.querySelector('.routin-tasks');
            if (!container) return;
            
            container.innerHTML = '';
            data.tasks.forEach(task => {
                const label = document.createElement('label');
                label.className = 'task';
                label.setAttribute('data-id', task.id);
                label.innerHTML = `
                    <input type="checkbox" name="todo-task" data-id="${task.id}" ${task.is_done ? 'checked' : ''}>
                    <span>${escapeHtml(task.task_name)}</span>
                    <button class="delete-task-btn" data-id="${task.id}" data-type="todo">🗑️</button>
                `;
                container.appendChild(label);
            });
            
            document.querySelectorAll('.routin-tasks input[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', handleTodoToggle);
            });
            
            document.querySelectorAll('.delete-task-btn[data-type="todo"]').forEach(btn => {
                btn.addEventListener('click', handleDeleteTodo);
            });
        }
    } catch (error) {
        console.error('Error loading todo tasks:', error);
    }
}

// ============================================
// Event Handlers برای تسک‌ها
// ============================================
async function handleRoutineToggle(e) {
    const checkbox = e.target;
    const taskId = checkbox.getAttribute('data-id');
    const isDone = checkbox.checked;
    
    try {
        const formData = new URLSearchParams();
        formData.append('action', 'toggle_routine');
        formData.append('task_id', taskId);
        formData.append('is_done', isDone);
        
        const response = await fetch('api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
        });
        const result = await response.json();
        
        if (!result.success) {
            checkbox.checked = !isDone;
        } else {
            loadStats();
        }
    } catch (error) {
        console.error('Error:', error);
        checkbox.checked = !isDone;
    }
}

async function handleTodoToggle(e) {
    const checkbox = e.target;
    const taskId = checkbox.getAttribute('data-id');
    const isDone = checkbox.checked;
    
    try {
        const formData = new URLSearchParams();
        formData.append('action', 'toggle_todo');
        formData.append('task_id', taskId);
        formData.append('is_done', isDone);
        
        const response = await fetch('api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
        });
        const result = await response.json();
        
        if (!result.success) {
            checkbox.checked = !isDone;
        }
    } catch (error) {
        console.error('Error:', error);
        checkbox.checked = !isDone;
    }
}

async function handleDeleteRoutine(e) {
    const btn = e.target;
    const taskId = btn.getAttribute('data-id');
    
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
        const formData = new URLSearchParams();
        formData.append('action', 'delete_routine_task');
        formData.append('task_id', taskId);
        
        const response = await fetch('api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
        });
        const result = await response.json();
        
        if (result.success) {
            loadRoutineTasks();
            loadStats();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function handleDeleteTodo(e) {
    const btn = e.target;
    const taskId = btn.getAttribute('data-id');
    
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
        const formData = new URLSearchParams();
        formData.append('action', 'delete_todo_task');
        formData.append('task_id', taskId);
        
        const response = await fetch('api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
        });
        const result = await response.json();
        
        if (result.success) {
            loadTodoTasks();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// ============================================
// اضافه کردن تسک جدید از مودال
// ============================================
async function addNewTaskFromModal() {
    const taskName = document.getElementById('newTaskTitle').value.trim();
    if (!taskName) {
        alert('Please enter a task name');
        return;
    }
    
    const action = currentTab === 'routine' ? 'add_routine_task' : 'add_todo_task';
    
    try {
        const formData = new URLSearchParams();
        formData.append('action', action);
        formData.append('task_name', taskName);
        
        const response = await fetch('api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
        });
        const result = await response.json();
        
        if (result.success) {
            hideTaskModal();
            if (currentTab === 'routine') {
                loadRoutineTasks();
                loadStats();
            } else {
                loadTodoTasks();
            }
        } else {
            alert(result.message || 'Error adding task');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error adding task');
    }
}

// ============================================
// تایمر پومودورو با دکمه‌های استاپ و ریستارت
// ============================================
function updateTimerDisplay() {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;
    const timerElement = document.querySelector('.timer');
    const pomodoroTimeElement = document.querySelector('.pomodoro-time');
    
    if (timerElement) {
        timerElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    if (pomodoroTimeElement && !isRunning) {
        pomodoroTimeElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    isRunning = true;
    
    // تغییر نمایش دکمه‌ها
    const startBtn = document.querySelector('.start-btn');
    if (startBtn) startBtn.style.display = 'none';
    
    // اضافه کردن دکمه‌های Stop و Restart
    const pomodoroMain = document.querySelector('.pomodoro-main');
    if (pomodoroMain && !document.querySelector('.pomodoro-actions')) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'pomodoro-actions';
        actionsDiv.innerHTML = `
            <button class="pomodoro-action-btn" id="stopTimerBtn">⏹️ Stop</button>
            <button class="pomodoro-action-btn" id="restartTimerBtn">🔄 Restart</button>
        `;
        pomodoroMain.appendChild(actionsDiv);
    }
    
    timerInterval = setInterval(() => {
        if (timerSeconds > 0) {
            timerSeconds--;
            updateTimerDisplay();
        } else {
            stopTimer();
            if (currentMode === 'work') {
                currentMode = 'rest';
                timerSeconds = 5 * 60;
                document.querySelector('.pomodoro-time').textContent = '05:00';
                alert('✅ Work time finished! Take a 5-minute break.');
            } else {
                currentMode = 'work';
                timerSeconds = 25 * 60;
                document.querySelector('.pomodoro-time').textContent = '25:00';
                alert('☕ Break time finished! Back to work.');
            }
            updateTimerDisplay();
            updatePomodoroUI();
            startTimer();
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    isRunning = false;
    
    // نمایش مجدد دکمه START
    const startBtn = document.querySelector('.start-btn');
    if (startBtn) startBtn.style.display = 'flex';
    
    // حذف دکمه‌های Stop و Restart
    const actionsDiv = document.querySelector('.pomodoro-actions');
    if (actionsDiv) actionsDiv.remove();
}

function restartTimer() {
    stopTimer();
    timerSeconds = currentMode === 'work' ? 25 * 60 : 5 * 60;
    updateTimerDisplay();
    startTimer();
}

function addTimeFromModal() {
    const minutes = parseInt(document.getElementById('addMinutesInput').value);
    if (isNaN(minutes) || minutes < 1) {
        alert('Please enter a valid number of minutes');
        return;
    }
    
    timerSeconds += minutes * 60;
    updateTimerDisplay();
    hideTimeModal();
    
    if (!isRunning) {
        const pomodoroTimeElement = document.querySelector('.pomodoro-time');
        if (pomodoroTimeElement) {
            const mins = Math.floor(timerSeconds / 60);
            const secs = timerSeconds % 60;
            pomodoroTimeElement.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
    }
}

function updatePomodoroUI() {
    const workBtn = document.querySelector('.pomodoro-option:first-child');
    const restBtn = document.querySelector('.pomodoro-option:last-child');
    
    if (currentMode === 'work') {
        workBtn.classList.add('op-active');
        restBtn.classList.remove('op-active');
    } else {
        restBtn.classList.add('op-active');
        workBtn.classList.remove('op-active');
    }
}

// ============================================
// تقویم ماهانه با level برای روزهای خالی و گذشته
// ============================================
async function loadMonthlyCalendar() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    const today = new Date();
    const todayDay = today.getDate();
    const todayMonth = today.getMonth() + 1;
    const todayYear = today.getFullYear();
    
    try {
        const response = await fetch(`api.php?action=get_monthly_stats&year=${year}&month=${month}`);
        const data = await response.json();
        
        if (data.success) {
            const statsMap = {};
            data.stats.forEach(stat => {
                statsMap[stat.jalali_day] = stat.percentage;
            });
            
            const daysInMonth = new Date(year, month, 0).getDate();
            const days = document.querySelectorAll('.calender-day-cart');
            
            days.forEach((day, index) => {
                const dayNum = index + 1;
                
                if (dayNum <= daysInMonth) {
                    // تعیین سطح رنگ بر اساس درصد
                    const percentage = statsMap[dayNum] || 0;
                    let level = 0;
                    if (percentage > 0 && percentage < 25) level = 1;
                    else if (percentage >= 25 && percentage < 50) level = 2;
                    else if (percentage >= 50 && percentage < 75) level = 3;
                    else if (percentage >= 75) level = 4;
                    
                    day.className = `calender-day-cart level-${level}`;
                    
                    // اگر روز گذشته است و درصد 0 دارد، level-0 بده
                    const isPast = (year < todayYear) || 
                                   (year === todayYear && month < todayMonth) ||
                                   (year === todayYear && month === todayMonth && dayNum < todayDay);
                    
                    if (isPast && percentage === 0) {
                        day.className = `calender-day-cart level-0`;
                    }
                    
                    // روزهای آینده
                    const isFuture = (year > todayYear) ||
                                     (year === todayYear && month > todayMonth) ||
                                     (year === todayYear && month === todayMonth && dayNum > todayDay);
                    
                    if (isFuture && percentage === 0) {
                        day.classList.add('future');
                    }
                } else {
                    // روزهای خالی (بیش از تعداد روزهای ماه)
                    day.className = `calender-day-cart level-0 empty-day`;
                    day.style.opacity = '0.3';
                }
            });
        }
    } catch (error) {
        console.error('Error loading monthly calendar:', error);
    }
}

// ============================================
// تغییر تب
// ============================================
function switchTab(tab) {
    currentTab = tab;
    
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(t => t.classList.remove('active'));
    
    if (tab === 'routine') {
        tabs[0].classList.add('active');
        loadRoutineTasks();
    } else {
        tabs[1].classList.add('active');
        loadTodoTasks();
    }
}

// ============================================
// فیلتر کردن کارها
// ============================================
function filterTasks(filter) {
    const tasks = document.querySelectorAll('.task');
    tasks.forEach(task => {
        const checkbox = task.querySelector('input[type="checkbox"]');
        if (!checkbox) return;
        
        if (filter === 'all') {
            task.style.display = 'flex';
        } else if (filter === 'done') {
            task.style.display = checkbox.checked ? 'flex' : 'none';
        } else if (filter === 'not done') {
            task.style.display = !checkbox.checked ? 'flex' : 'none';
        }
    });
}

// ============================================
// Helper Functions
// ============================================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// مقداردهی اولیه
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    // تنظیم تاریخ شمسی
    const now = new Date();
    const [jy, jm, jd] = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    const dateElement = document.querySelector('.date');
    const weekdayElement = document.querySelector('.week-day');
    if (dateElement) dateElement.textContent = `${jy} / ${String(jm).padStart(2, '0')} / ${String(jd).padStart(2, '0')}`;
    if (weekdayElement) weekdayElement.textContent = weekDays[now.getDay()];
    
    // بارگذاری اولیه
    await loadStats();
    await loadRoutineTasks();
    await loadMonthlyCalendar();
    
    // Event Listeners برای تب‌ها
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
            switchTab(index === 0 ? 'routine' : 'todo');
        });
    });
    
    // Event Listener برای دکمه Add Task (باز کردن مودال)
    const addTaskBtn = document.querySelector('.add-task');
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', showTaskModal);
    }
    
    // Event Listeners مودال تسک
    document.getElementById('addTaskConfirm')?.addEventListener('click', addNewTaskFromModal);
    document.getElementById('closeTaskModal')?.addEventListener('click', hideTaskModal);
    document.getElementById('cancelTaskModal')?.addEventListener('click', hideTaskModal);
    
    // Event Listener برای دکمه Add Time (باز کردن مودال زمان)
    const addTimeBtn = document.querySelector('.add-time');
    if (addTimeBtn) {
        addTimeBtn.addEventListener('click', showTimeModal);
    }
    
    // Event Listeners مودال زمان
    document.getElementById('addTimeConfirm')?.addEventListener('click', addTimeFromModal);
    document.getElementById('closeTimeModal')?.addEventListener('click', hideTimeModal);
    document.getElementById('cancelTimeModal')?.addEventListener('click', hideTimeModal);
    
    // Event Listener برای دکمه START پومودورو
    const startBtn = document.querySelector('.start-btn');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            if (isRunning) {
                stopTimer();
                startBtn.textContent = 'START';
            } else {
                startTimer();
                startBtn.textContent = 'STOP';
            }
        });
    }
    
    // Event Listeners برای دکمه‌های Stop و Restart (دینامیک)
    document.addEventListener('click', (e) => {
        if (e.target.id === 'stopTimerBtn') {
            stopTimer();
            const startBtn = document.querySelector('.start-btn');
            if (startBtn) startBtn.textContent = 'START';
        }
        if (e.target.id === 'restartTimerBtn') {
            restartTimer();
        }
    });
    
    // Event Listener برای فیلتر
    const sortSelect = document.querySelector('.task-sort');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            filterTasks(e.target.value);
        });
    }
    
    // بستن مودال با کلیک روی overlay
    window.addEventListener('click', (e) => {
        const taskModal = document.getElementById('taskModal');
        const timeModal = document.getElementById('timeModal');
        if (e.target === taskModal) hideTaskModal();
        if (e.target === timeModal) hideTimeModal();
    });
    
    // تغییر ماه در تقویم
    const prevMonthBtn = document.querySelector('.calender-head .prev-month');
    const nextMonthBtn = document.querySelector('.calender-head .next-month');
    
    if (!prevMonthBtn || !nextMonthBtn) {
        const calenderHead = document.querySelector('.calender-head');
        if (calenderHead && !calenderHead.querySelector('.prev-month')) {
            const prevBtn = document.createElement('button');
            prevBtn.innerHTML = '‹';
            prevBtn.className = 'month-nav-btn prev-month';
            prevBtn.style.cssText = 'background: none; border: none; color: white; font-size: 1.2rem; cursor: pointer; padding: 0 10px;';
            calenderHead.insertBefore(prevBtn, calenderHead.firstChild);
            
            const nextBtn = document.createElement('button');
            nextBtn.innerHTML = '›';
            nextBtn.className = 'month-nav-btn next-month';
            nextBtn.style.cssText = 'background: none; border: none; color: white; font-size: 1.2rem; cursor: pointer; padding: 0 10px;';
            calenderHead.appendChild(nextBtn);
        }
    }
    
    document.querySelectorAll('.prev-month').forEach(btn => {
        btn.addEventListener('click', () => {
            currentMonth.setMonth(currentMonth.getMonth() - 1);
            loadMonthlyCalendar();
        });
    });
    
    document.querySelectorAll('.next-month').forEach(btn => {
        btn.addEventListener('click', () => {
            currentMonth.setMonth(currentMonth.getMonth() + 1);
            loadMonthlyCalendar();
        });
    });
});