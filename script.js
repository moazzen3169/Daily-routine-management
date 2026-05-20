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
let editingTask = null;

// ============================================
// Helper Functions
// ============================================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(title, body) {
    if (Notification.permission === 'granted') {
        new Notification(title, { body: body });
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification(title, { body: body });
            }
        });
    }
}

// ============================================
// توابع Export
// ============================================
async function exportData(type, format) {
    let data = [];
    let filename = '';
    
    if (type === 'tasks') {
        if (currentTab === 'routine') {
            const response = await fetch('api.php?action=get_routine_tasks');
            const result = await response.json();
            data = result.success ? result.tasks : [];
            filename = `routine_tasks_${new Date().toISOString().slice(0,19)}`;
        } else {
            const response = await fetch('api.php?action=get_todo_tasks');
            const result = await response.json();
            data = result.success ? result.tasks : [];
            filename = `todo_tasks_${new Date().toISOString().slice(0,19)}`;
        }
    } else if (type === 'movies') {
        const response = await fetch('api.php?action=get_movies');
        const result = await response.json();
        data = result.success ? result.movies : [];
        filename = `movies_${new Date().toISOString().slice(0,19)}`;
    } else if (type === 'books') {
        const response = await fetch('api.php?action=get_books');
        const result = await response.json();
        data = result.success ? result.books : [];
        filename = `books_${new Date().toISOString().slice(0,19)}`;
    }
    
    if (format === 'csv') {
        if (data.length === 0) {
            alert('No data to export');
            return;
        }
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        for (const row of data) {
            const values = headers.map(header => {
                const val = row[header];
                return `"${String(val).replace(/"/g, '""')}"`;
            });
            csvRows.push(values.join(','));
        }
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    } else if (format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// ============================================
// توابع آمار
// ============================================
async function loadStats() {
    try {
        const response = await fetch('api.php?action=get_stats');
        const data = await response.json();
        
        if (data.success) {
            console.log('Stats loaded:', data); // برای دیباگ
            
            // Progress Bar
            const progressBar = document.querySelector('.progress-bar');
            if (progressBar) progressBar.textContent = data.percentage + '%';
            
            // Progress Fill
            const progressFill = document.querySelector('.Progress-fill');
            if (progressFill) progressFill.style.width = data.percentage + '%';
            
            // پیدا کردن همه کارت‌های main-data
            const mainDataElements = document.querySelectorAll('.main-data');
            
            // کارت اول (Progress Today)
            if (mainDataElements[0]) {
                const dataSpan = mainDataElements[0].querySelector('.data');
                if (dataSpan) {
                    dataSpan.innerHTML = data.percentage + '% <div class="Progress-main"><div class="Progress-fill" style="width: ' + data.percentage + '%;"></div></div>';
                }
            }
            
            // کارت دوم (Task Done)
            if (mainDataElements[1]) {
                const dataSpan = mainDataElements[1].querySelector('.data');
                if (dataSpan) dataSpan.textContent = data.done;
            }
            
            // کارت سوم (All Tasks)
            if (mainDataElements[2]) {
                const dataSpan = mainDataElements[2].querySelector('.data');
                if (dataSpan) dataSpan.textContent = data.total;
            }
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// ============================================
// توابع کارهای روتین
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
                label.setAttribute('data-type', 'routine');
                label.innerHTML = `
                    <input type="checkbox" data-id="${task.id}" data-type="routine" ${task.is_done ? 'checked' : ''}>
                    <span class="task-text" data-id="${task.id}" data-type="routine">${escapeHtml(task.task_name)}</span>
                    <button class="delete-task-btn" data-id="${task.id}" data-type="routine"><img src="assets/Vector.svg" alt="delete"></button>
                `;
                container.appendChild(label);
            });
            
            document.querySelectorAll('.routin-tasks input[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', handleRoutineToggle);
            });
            
            document.querySelectorAll('.delete-task-btn[data-type="routine"]').forEach(btn => {
                btn.addEventListener('click', handleDeleteRoutine);
            });
            
            document.querySelectorAll('.task-text[data-type="routine"]').forEach(span => {
                span.addEventListener('dblclick', () => showEditTaskModal(span.getAttribute('data-id'), 'routine', span.textContent));
            });
        }
    } catch (error) {
        console.error('Error loading routine tasks:', error);
    }
}

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
            await loadStats();
            await loadMonthlyCalendar();
        }
        
        // ============================================
// بررسی و ریست خودکار در شروع روز جدید
// ============================================
let lastResetDate = localStorage.getItem('lastResetDate') || '';

async function checkAndResetDailyTasks() {
    const today = new Date().toISOString().slice(0, 10);
    
    // اگر روز عوض شده باشه
    if (lastResetDate !== today) {
        console.log('Day changed! Resetting tasks...');
        
        try {
            const formData = new URLSearchParams();
            formData.append('action', 'reset_daily_tasks');
            
            const response = await fetch('api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString()
            });
            const result = await response.json();
            
            if (result.success) {
                localStorage.setItem('lastResetDate', today);
                lastResetDate = today;
                
                // رفرش کردن تسک‌ها و آمار
                if (currentTab === 'routine') {
                    await loadRoutineTasks();
                } else {
                    await loadTodoTasks();
                }
                await loadStats();
                await loadMonthlyCalendar();
                
                console.log('Tasks reset successfully for new day!');
                if (typeof showNotification === 'function') {
                    showNotification('📅 روز جدید', 'تسک‌های روزانه ریست شدند!');
                }
            }
        } catch (error) {
            console.error('Error resetting tasks:', error);
        }
    }
}

// تابع برای چک کردن هر دقیقه
function startDailyResetChecker() {
    setInterval(() => {
        checkAndResetDailyTasks();
    }, 60000);
    
    window.addEventListener('focus', () => {
        checkAndResetDailyTasks();
    });
}

// تابع برای چک کردن هر دقیقه (برای تشخیص تغییر روز)
function startDailyResetChecker() {
    // چک کردن هر 60 ثانیه
    setInterval(() => {
        checkAndResetDailyTasks();
    }, 60000); // هر دقیقه
    
    // همچنین وقتی صفحه focus میشه (برگشت از تب دیگر)
    window.addEventListener('focus', () => {
        checkAndResetDailyTasks();
    });
}
    } catch (error) {
        console.error('Error:', error);
        checkbox.checked = !isDone;
    }
}

async function handleDeleteRoutine(e) {
    const btn = e.target.closest('.delete-task-btn');
    if (!btn) return;
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
            await loadRoutineTasks();
            await loadStats();
            await loadMonthlyCalendar();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function updateRoutineTask(taskId, newName) {
    try {
        const formData = new URLSearchParams();
        formData.append('action', 'update_routine_task');
        formData.append('task_id', taskId);
        formData.append('task_name', newName);
        
        const response = await fetch('api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
        });
        const result = await response.json();
        
        if (result.success) {
            await loadRoutineTasks();
        } else {
            alert(result.message || 'Error updating task');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error updating task');
    }
}

// ============================================
// توابع Todo List
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
                label.setAttribute('data-type', 'todo');
                label.innerHTML = `
                    <input type="checkbox" data-id="${task.id}" data-type="todo" ${task.is_done ? 'checked' : ''}>
                    <span class="task-text" data-id="${task.id}" data-type="todo">${escapeHtml(task.task_name)}</span>
                    <button class="delete-task-btn" data-id="${task.id}" data-type="todo"><img src="assets/Vector.svg" alt="delete"></button>
                `;
                container.appendChild(label);
            });
            
            document.querySelectorAll('.routin-tasks input[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', handleTodoToggle);
            });
            
            document.querySelectorAll('.delete-task-btn[data-type="todo"]').forEach(btn => {
                btn.addEventListener('click', handleDeleteTodo);
            });
            
            document.querySelectorAll('.task-text[data-type="todo"]').forEach(span => {
                span.addEventListener('dblclick', () => showEditTaskModal(span.getAttribute('data-id'), 'todo', span.textContent));
            });
        }
    } catch (error) {
        console.error('Error loading todo tasks:', error);
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
        } else {
            await loadStats();
        }
    } catch (error) {
        console.error('Error:', error);
        checkbox.checked = !isDone;
    }
}

async function handleDeleteTodo(e) {
    const btn = e.target.closest('.delete-task-btn');
    if (!btn) return;
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
            await loadTodoTasks();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function updateTodoTask(taskId, newName) {
    try {
        const formData = new URLSearchParams();
        formData.append('action', 'update_todo_task');
        formData.append('task_id', taskId);
        formData.append('task_name', newName);
        
        const response = await fetch('api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
        });
        const result = await response.json();
        
        if (result.success) {
            await loadTodoTasks();
        } else {
            alert(result.message || 'Error updating task');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error updating task');
    }
}

// ============================================
// توابع فیلم‌ها
// ============================================
async function loadMovies() {
    try {
        const response = await fetch('api.php?action=get_movies');
        const data = await response.json();
        
        if (data.success) {
            const container = document.querySelector('.movie-list .booklist-task');
            if (!container) return;
            
            container.innerHTML = '';
            data.movies.forEach(movie => {
                const label = document.createElement('label');
                label.className = 'task';
                label.setAttribute('data-movie-id', movie.id);
                label.innerHTML = `
                    <input type="checkbox" class="movie-checkbox" data-id="${movie.id}" ${movie.is_watched ? 'checked' : ''}>
                    <span class="movie-text" data-id="${movie.id}">${escapeHtml(movie.movie_name)}</span>
                    <button class="delete-movie-btn" data-id="${movie.id}"><img src="assets/Vector.svg" alt="delete"></button>
                `;
                container.appendChild(label);
            });
            
            document.querySelectorAll('.movie-checkbox').forEach(checkbox => {
                checkbox.addEventListener('change', handleMovieToggle);
            });
            
            document.querySelectorAll('.delete-movie-btn').forEach(btn => {
                btn.addEventListener('click', handleDeleteMovie);
            });
            
            document.querySelectorAll('.movie-text').forEach(span => {
                span.addEventListener('dblclick', () => showEditMovieModal(span.getAttribute('data-id'), span.textContent));
            });
        }
    } catch (error) {
        console.error('Error loading movies:', error);
    }
}

async function handleMovieToggle(e) {
    const checkbox = e.target;
    const movieId = checkbox.getAttribute('data-id');
    const isWatched = checkbox.checked;
    
    try {
        const formData = new URLSearchParams();
        formData.append('action', 'toggle_movie');
        formData.append('movie_id', movieId);
        formData.append('is_watched', isWatched);
        
        const response = await fetch('api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
        });
        const result = await response.json();
        
        if (!result.success) {
            checkbox.checked = !isWatched;
        }
    } catch (error) {
        console.error('Error:', error);
        checkbox.checked = !isWatched;
    }
}

async function handleDeleteMovie(e) {
    const btn = e.target.closest('.delete-movie-btn');
    if (!btn) return;
    const movieId = btn.getAttribute('data-id');
    
    if (!confirm('Are you sure you want to delete this movie?')) return;
    
    try {
        const formData = new URLSearchParams();
        formData.append('action', 'delete_movie');
        formData.append('movie_id', movieId);
        
        const response = await fetch('api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
        });
        const result = await response.json();
        
        if (result.success) {
            await loadMovies();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function updateMovie(movieId, newName) {
    try {
        const formData = new URLSearchParams();
        formData.append('action', 'update_movie');
        formData.append('movie_id', movieId);
        formData.append('movie_name', newName);
        
        const response = await fetch('api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
        });
        const result = await response.json();
        
        if (result.success) {
            await loadMovies();
        } else {
            alert(result.message || 'Error updating movie');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error updating movie');
    }
}

// ============================================
// توابع کتاب‌ها
// ============================================
async function loadBooks() {
    try {
        const response = await fetch('api.php?action=get_books');
        const data = await response.json();
        
        if (data.success) {
            const container = document.querySelector('.book-list .booklist-task');
            if (!container) return;
            
            container.innerHTML = '';
            data.books.forEach(book => {
                const label = document.createElement('label');
                label.className = 'task';
                label.setAttribute('data-book-id', book.id);
                label.innerHTML = `
                    <input type="checkbox" class="book-checkbox" data-id="${book.id}" ${book.is_read ? 'checked' : ''}>
                    <span class="book-text" data-id="${book.id}">${escapeHtml(book.book_name)}</span>
                    <button class="delete-book-btn" data-id="${book.id}"><img src="assets/Vector.svg" alt="delete"></button>
                `;
                container.appendChild(label);
            });
            
            document.querySelectorAll('.book-checkbox').forEach(checkbox => {
                checkbox.addEventListener('change', handleBookToggle);
            });
            
            document.querySelectorAll('.delete-book-btn').forEach(btn => {
                btn.addEventListener('click', handleDeleteBook);
            });
            
            document.querySelectorAll('.book-text').forEach(span => {
                span.addEventListener('dblclick', () => showEditBookModal(span.getAttribute('data-id'), span.textContent));
            });
        }
    } catch (error) {
        console.error('Error loading books:', error);
    }
}

async function handleBookToggle(e) {
    const checkbox = e.target;
    const bookId = checkbox.getAttribute('data-id');
    const isRead = checkbox.checked;
    
    try {
        const formData = new URLSearchParams();
        formData.append('action', 'toggle_book');
        formData.append('book_id', bookId);
        formData.append('is_read', isRead);
        
        const response = await fetch('api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
        });
        const result = await response.json();
        
        if (!result.success) {
            checkbox.checked = !isRead;
        }
    } catch (error) {
        console.error('Error:', error);
        checkbox.checked = !isRead;
    }
}

async function handleDeleteBook(e) {
    const btn = e.target.closest('.delete-book-btn');
    if (!btn) return;
    const bookId = btn.getAttribute('data-id');
    
    if (!confirm('Are you sure you want to delete this book?')) return;
    
    try {
        const formData = new URLSearchParams();
        formData.append('action', 'delete_book');
        formData.append('book_id', bookId);
        
        const response = await fetch('api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
        });
        const result = await response.json();
        
        if (result.success) {
            await loadBooks();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function updateBook(bookId, newName) {
    try {
        const formData = new URLSearchParams();
        formData.append('action', 'update_book');
        formData.append('book_id', bookId);
        formData.append('book_name', newName);
        
        const response = await fetch('api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
        });
        const result = await response.json();
        
        if (result.success) {
            await loadBooks();
        } else {
            alert(result.message || 'Error updating book');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error updating book');
    }
}

// ============================================
// توابع ویرایش (Modals)
// ============================================
function showEditTaskModal(taskId, type, currentName) {
    editingTask = { id: taskId, type: type, currentName: currentName };
    const modal = document.getElementById('editTaskModal');
    const input = document.getElementById('editTaskTitle');
    if (modal && input) {
        input.value = currentName;
        modal.style.display = 'flex';
        input.focus();
    }
}

function hideEditTaskModal() {
    const modal = document.getElementById('editTaskModal');
    if (modal) modal.style.display = 'none';
    editingTask = null;
}

async function saveEditTask() {
    const input = document.getElementById('editTaskTitle');
    const newName = input?.value.trim();
    
    if (!newName) {
        alert('Task name cannot be empty');
        return;
    }
    
    if (editingTask) {
        if (editingTask.type === 'routine') {
            await updateRoutineTask(editingTask.id, newName);
        } else if (editingTask.type === 'todo') {
            await updateTodoTask(editingTask.id, newName);
        }
    }
    hideEditTaskModal();
}

function showEditMovieModal(movieId, currentName) {
    const newName = prompt('Edit movie name:', currentName);
    if (newName && newName.trim() !== currentName) {
        updateMovie(movieId, newName.trim());
    }
}

function showEditBookModal(bookId, currentName) {
    const newName = prompt('Edit book name:', currentName);
    if (newName && newName.trim() !== currentName) {
        updateBook(bookId, newName.trim());
    }
}

// ============================================
// تایمر پومودورو
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
    
    const startBtn = document.querySelector('.start-btn');
    if (startBtn) startBtn.textContent = 'STOP';
    
    timerInterval = setInterval(() => {
        if (timerSeconds > 0) {
            timerSeconds--;
            updateTimerDisplay();
        } else {
            stopTimer();
            if (currentMode === 'work') {
                currentMode = 'rest';
                timerSeconds = 5 * 60;
                updateTimerDisplay();
                updatePomodoroUI();
                showNotification('✅ Work Complete!', 'Time for a 5-minute break!');
                alert('✅ Work time finished! Take a 5-minute break.');
                startTimer();
            } else {
                currentMode = 'work';
                timerSeconds = 25 * 60;
                updateTimerDisplay();
                updatePomodoroUI();
                showNotification('☕ Break Complete!', 'Time to get back to work!');
                alert('☕ Break time finished! Back to work.');
                startTimer();
            }
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    isRunning = false;
    
    const startBtn = document.querySelector('.start-btn');
    if (startBtn) startBtn.textContent = 'START';
}

function updatePomodoroUI() {
    const workBtn = document.querySelectorAll('.pomodoro-option')[1];
    const restBtn = document.querySelectorAll('.pomodoro-option')[0];
    
    if (workBtn && restBtn) {
        if (currentMode === 'work') {
            workBtn.classList.add('op-active');
            restBtn.classList.remove('op-active');
        } else {
            restBtn.classList.add('op-active');
            workBtn.classList.remove('op-active');
        }
    }
}

// ============================================
// مدیریت مودال تسک
// ============================================
function showTaskModal() {
    const modal = document.getElementById('taskModal');
    if (modal) {
        modal.style.display = 'flex';
        const input = document.getElementById('newTaskTitle');
        if (input) {
            input.value = '';
            input.focus();
        }
    }
}

function hideTaskModal() {
    const modal = document.getElementById('taskModal');
    if (modal) modal.style.display = 'none';
}

async function addTaskFromModal() {
    const input = document.getElementById('newTaskTitle');
    const taskName = input?.value.trim();
    
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
                await loadRoutineTasks();
                await loadStats();
                await loadMonthlyCalendar();
            } else {
                await loadTodoTasks();
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
// مدیریت مودال زمان پومودورو
// ============================================
function showTimeModal() {
    const modal = document.getElementById('timeModal');
    if (modal) {
        modal.style.display = 'flex';
        const input = document.getElementById('addMinutesInput');
        if (input) {
            input.value = '5';
            input.focus();
        }
    }
}

function hideTimeModal() {
    const modal = document.getElementById('timeModal');
    if (modal) modal.style.display = 'none';
}

function addTimeFromModal() {
    const input = document.getElementById('addMinutesInput');
    const minutes = parseInt(input?.value);
    
    if (isNaN(minutes) || minutes < 1) {
        alert('Please enter a valid number of minutes (minimum 1)');
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

// ============================================
// تقویم ماهانه
// ============================================
async function loadMonthlyCalendar() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    
    try {
        const response = await fetch(`api.php?action=get_monthly_stats&year=${year}&month=${month}`);
        const data = await response.json();
        
        if (data.success) {
            const statsMap = {};
            data.stats.forEach(stat => {
                statsMap[stat.jalali_day] = stat.percentage;
            });
            
            const daysInMonth = new Date(year, month, 0).getDate();
            const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
            
            const calendarContainer = document.querySelector('.calender');
            if (!calendarContainer) return;
            
            // حذف روزهای قبلی (به جز عنوان‌ها)
            const titles = document.querySelectorAll('.calender-day-title');
            calendarContainer.innerHTML = '';
            titles.forEach(title => calendarContainer.appendChild(title));
            
            // روزهای خالی ابتدای ماه
            for (let i = 0; i < firstDayOfMonth; i++) {
                const emptyDiv = document.createElement('div');
                emptyDiv.className = 'calender-day-cart level-0';
                calendarContainer.appendChild(emptyDiv);
            }
            
            // روزهای ماه
            for (let day = 1; day <= daysInMonth; day++) {
                const dayDiv = document.createElement('div');
                const percentage = statsMap[day] || 0;
                let level = 0;
                if (percentage > 0 && percentage < 25) level = 1;
                else if (percentage >= 25 && percentage < 50) level = 2;
                else if (percentage >= 50 && percentage < 75) level = 3;
                else if (percentage >= 75) level = 4;
                
                dayDiv.className = `calender-day-cart level-${level}`;
                dayDiv.title = `Day ${day}: ${percentage}% completed`;
                calendarContainer.appendChild(dayDiv);
            }
        }
    } catch (error) {
        console.error('Error loading monthly calendar:', error);
    }
}

// ============================================
// تغییر تب و فیلتر
// ============================================
function switchTab(tab) {
    currentTab = tab;
    
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(t => t.classList.remove('active'));
    
    if (tab === 'routine') {
        if (tabs[0]) tabs[0].classList.add('active');
        loadRoutineTasks();
    } else {
        if (tabs[1]) tabs[1].classList.add('active');
        loadTodoTasks();
    }
}

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
// Event Listeners
// ============================================
function setupFormListeners() {
    // دکمه افزودن تسک
    const addTaskBtn = document.querySelector('.add-task');
    if (addTaskBtn) {
        const newBtn = addTaskBtn.cloneNode(true);
        addTaskBtn.parentNode.replaceChild(newBtn, addTaskBtn);
        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showTaskModal();
        });
    }
    
    // دکمه افزودن زمان پومودورو
    const addTimeBtn = document.querySelector('.add-time');
    if (addTimeBtn) {
        const newTimeBtn = addTimeBtn.cloneNode(true);
        addTimeBtn.parentNode.replaceChild(newTimeBtn, addTimeBtn);
        newTimeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showTimeModal();
        });
    }
    
    // Event Listeners مودال تسک
    const closeTaskModal = document.getElementById('closeTaskModal');
    const cancelTaskModal = document.getElementById('cancelTaskModal');
    const addTaskConfirm = document.getElementById('addTaskConfirm');
    const taskModal = document.getElementById('taskModal');
    const taskInput = document.getElementById('newTaskTitle');
    
    if (closeTaskModal) closeTaskModal.addEventListener('click', hideTaskModal);
    if (cancelTaskModal) cancelTaskModal.addEventListener('click', hideTaskModal);
    if (addTaskConfirm) addTaskConfirm.addEventListener('click', addTaskFromModal);
    if (taskModal) taskModal.addEventListener('click', (e) => {
        if (e.target === taskModal) hideTaskModal();
    });
    if (taskInput) taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTaskFromModal();
    });
    
    // Event Listeners مودال ویرایش
    const closeEditModal = document.getElementById('closeEditModal');
    const cancelEditModal = document.getElementById('cancelEditModal');
    const editTaskConfirm = document.getElementById('editTaskConfirm');
    const editModal = document.getElementById('editTaskModal');
    const editInput = document.getElementById('editTaskTitle');
    
    if (closeEditModal) closeEditModal.addEventListener('click', hideEditTaskModal);
    if (cancelEditModal) cancelEditModal.addEventListener('click', hideEditTaskModal);
    if (editTaskConfirm) editTaskConfirm.addEventListener('click', saveEditTask);
    if (editModal) editModal.addEventListener('click', (e) => {
        if (e.target === editModal) hideEditTaskModal();
    });
    if (editInput) editInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveEditTask();
    });
    
    // Event Listeners مودال زمان
    const closeTimeModal = document.getElementById('closeTimeModal');
    const cancelTimeModal = document.getElementById('cancelTimeModal');
    const addTimeConfirm = document.getElementById('addTimeConfirm');
    const timeModal = document.getElementById('timeModal');
    const timeInput = document.getElementById('addMinutesInput');
    
    if (closeTimeModal) closeTimeModal.addEventListener('click', hideTimeModal);
    if (cancelTimeModal) cancelTimeModal.addEventListener('click', hideTimeModal);
    if (addTimeConfirm) addTimeConfirm.addEventListener('click', addTimeFromModal);
    if (timeModal) timeModal.addEventListener('click', (e) => {
        if (e.target === timeModal) hideTimeModal();
    });
    if (timeInput) timeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTimeFromModal();
    });
    
    // دکمه Export اصلی
    const exportBtn = document.getElementById('exportTasksBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const modal = document.getElementById('exportModal');
            if (modal) {
                modal.style.display = 'flex';
                // ذخیره نوع برای export
                modal.setAttribute('data-export-type', 'tasks');
            }
        });
    }
    
    // دکمه‌های Export در لیست فیلم و کتاب
    document.querySelectorAll('.export-list-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.getAttribute('data-type');
            const modal = document.getElementById('exportModal');
            if (modal) {
                modal.style.display = 'flex';
                modal.setAttribute('data-export-type', type);
            }
        });
    });
    
    // مودال Export
    const closeExportModal = document.getElementById('closeExportModal');
    const exportCSV = document.getElementById('exportCSV');
    const exportJSON = document.getElementById('exportJSON');
    const exportModal = document.getElementById('exportModal');
    
    if (closeExportModal) closeExportModal.addEventListener('click', () => {
        if (exportModal) exportModal.style.display = 'none';
    });
    if (exportModal) exportModal.addEventListener('click', (e) => {
        if (e.target === exportModal) exportModal.style.display = 'none';
    });
    if (exportCSV) {
        exportCSV.addEventListener('click', () => {
            const type = exportModal?.getAttribute('data-export-type') || 'tasks';
            exportData(type, 'csv');
            if (exportModal) exportModal.style.display = 'none';
        });
    }
    if (exportJSON) {
        exportJSON.addEventListener('click', () => {
            const type = exportModal?.getAttribute('data-export-type') || 'tasks';
            exportData(type, 'json');
            if (exportModal) exportModal.style.display = 'none';
        });
    }
    
    // فرم افزودن فیلم
    const movieForm = document.querySelector('.movie-list-head form');
    if (movieForm) {
        movieForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.querySelector('#movie-name');
            const movieName = input?.value.trim();
            
            if (!movieName) {
                alert('Please enter a movie name');
                return;
            }
            
            try {
                const formData = new URLSearchParams();
                formData.append('action', 'add_movie');
                formData.append('movie_name', movieName);
                
                const response = await fetch('api.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: formData.toString()
                });
                const result = await response.json();
                
                if (result.success) {
                    if (input) input.value = '';
                    await loadMovies();
                } else {
                    alert(result.message || 'Error adding movie');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error adding movie');
            }
        });
    }
    
    // فرم افزودن کتاب
    const bookForm = document.querySelector('.book-list-head form');
    if (bookForm) {
        bookForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.querySelector('#book-name');
            const bookName = input?.value.trim();
            
            if (!bookName) {
                alert('Please enter a book name');
                return;
            }
            
            try {
                const formData = new URLSearchParams();
                formData.append('action', 'add_book');
                formData.append('book_name', bookName);
                
                const response = await fetch('api.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: formData.toString()
                });
                const result = await response.json();
                
                if (result.success) {
                    if (input) input.value = '';
                    await loadBooks();
                } else {
                    alert(result.message || 'Error adding book');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error adding book');
            }
        });
    }
}

// ============================================
// مقداردهی اولیه
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing...');
    
    // درخواست مجوز اعلان
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
    
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
    await loadMovies();
    await loadBooks();
    await loadMonthlyCalendar();
    
    // setup event listeners
    setupFormListeners();
    
    // Event Listeners برای تب‌ها
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
            if (index === 0) switchTab('routine');
            else if (index === 1) switchTab('todo');
        });
    });
    
    // Event Listener برای فیلتر
    const sortSelect = document.querySelector('.task-sort');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            filterTasks(e.target.value);
        });
    }
    
    // Event Listener برای دکمه START پومودورو
    const startBtn = document.querySelector('.start-btn');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            if (isRunning) {
                stopTimer();
            } else {
                startTimer();
            }
        });
    }
    
    // Event Listeners برای دکمه‌های پومودورو
    const pomodoroOptions = document.querySelectorAll('.pomodoro-option');
    if (pomodoroOptions.length >= 2) {
        pomodoroOptions[1].addEventListener('click', () => {
            stopTimer();
            currentMode = 'work';
            timerSeconds = 25 * 60;
            updateTimerDisplay();
            updatePomodoroUI();
        });
        
        pomodoroOptions[0].addEventListener('click', () => {
            stopTimer();
            currentMode = 'rest';
            timerSeconds = 5 * 60;
            updateTimerDisplay();
            updatePomodoroUI();
        });
        

        // در انتهای تابع DOMContentLoaded، قبل از console.log('Initialization complete');
// اعمال فیلتر پیش‌فرض Not Done بعد از بارگذاری تسک‌ها
const sortSelect = document.querySelector('.task-sort');
if (sortSelect && sortSelect.value === 'not done') {
    // کمی تاخیر تا مطمئن شویم تسک‌ها بارگذاری شده‌اند
    setTimeout(() => {
        filterTasks('not done');
    }, 100);
}
    }
    
    
    console.log('Initialization complete');

    // قبل از console.log('Initialization complete');
// شروع چک کردن ریست روزانه
await checkAndResetDailyTasks();
startDailyResetChecker();
});