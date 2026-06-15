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
            // Progress Bar
            const progressBar = document.querySelector('.progress-bar');
            if (progressBar) progressBar.textContent = data.percentage + '%';
            
            // Progress Fill
            const progressFill = document.querySelector('.Progress-fill');
            if (progressFill) progressFill.style.width = data.percentage + '%';
            
            const mainDataElements = document.querySelectorAll('.main-data');
            
            if (mainDataElements[0]) {
                const dataSpan = mainDataElements[0].querySelector('.data');
                if (dataSpan) {
                    dataSpan.innerHTML = data.percentage + '% <div class="Progress-main"><div class="Progress-fill" style="width: ' + data.percentage + '%;"></div></div>';
                }
            }
            
            if (mainDataElements[1]) {
                const dataSpan = mainDataElements[1].querySelector('.data');
                if (dataSpan) dataSpan.textContent = data.done;
            }
            
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

            const sortSelect = document.querySelector('.task-sort');
            if (sortSelect) filterTasks(sortSelect.value);
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
            await loadGitHubCalendar();
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
    
    if (!confirm('آیا از حذف این مورد اطمینان دارید؟')) return;
    
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
            await loadGitHubCalendar();
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

            const sortSelect = document.querySelector('.task-sort');
            if (sortSelect) filterTasks(sortSelect.value);
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
    
    if (!confirm('آیا از حذف این مورد اطمینان دارید؟')) return;
    
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
    
    if (!confirm('آیا از حذف این فیلم اطمینان دارید؟')) return;
    
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
        }
    } catch (error) {
        console.error('Error:', error);
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
    
    if (!confirm('آیا از حذف این کتاب اطمینان دارید؟')) return;
    
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
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// ============================================
// بررسی و ریست خودکار در شروع روز جدید
// ============================================
async function checkAndResetDailyTasks() {
    try {
        const formData = new URLSearchParams();
        formData.append('action', 'check_and_reset');

        const response = await fetch('api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
        });
        const result = await response.json();

        if (result.success && result.reset) {
            console.log('Day changed! Tasks reset successfully.');

            if (currentTab === 'routine') {
                await loadRoutineTasks();
            } else {
                await loadTodoTasks();
            }
            await loadStats();
            await loadGitHubCalendar();

            showNotification('📅 روز جدید', 'تسک‌های روزانه برای امروز آماده هستند!');
        }
    } catch (error) {
        console.error('Error checking for daily reset:', error);
    }
}

function startDailyResetChecker() {
    setInterval(checkAndResetDailyTasks, 300000); // هر 5 دقیقه
    window.addEventListener('focus', checkAndResetDailyTasks);
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
        alert('نام تسک نمی‌تواند خالی باشد');
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
    const newName = prompt('ویرایش نام فیلم:', currentName);
    if (newName && newName.trim() !== currentName) {
        updateMovie(movieId, newName.trim());
    }
}

function showEditBookModal(bookId, currentName) {
    const newName = prompt('ویرایش نام کتاب:', currentName);
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
    
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    if (timerElement) timerElement.textContent = timeStr;
    if (pomodoroTimeElement && !isRunning) pomodoroTimeElement.textContent = timeStr;
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
                showNotification('✅ زمان کار تمام شد!', '۵ دقیقه استراحت کنید.');
                alert('✅ زمان کار تمام شد! ۵ دقیقه استراحت کنید.');
            } else {
                currentMode = 'work';
                timerSeconds = 25 * 60;
                showNotification('☕ استراحت تمام شد!', 'به کار بازگردید.');
                alert('☕ استراحت تمام شد! به کار بازگردید.');
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
    const startBtn = document.querySelector('.start-btn');
    if (startBtn) startBtn.textContent = 'START';
}

function updatePomodoroUI() {
    const options = document.querySelectorAll('.pomodoro-option');
    if (options.length >= 2) {
        if (currentMode === 'work') {
            options[1].classList.add('op-active');
            options[0].classList.remove('op-active');
        } else {
            options[0].classList.add('op-active');
            options[1].classList.remove('op-active');
        }
    }
}

// ============================================
// مدیریت مودال‌ها
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
        alert('لطفاً نام تسک را وارد کنید');
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
                await loadGitHubCalendar();
            } else {
                await loadTodoTasks();
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

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
        alert('لطفاً عدد معتبری وارد کنید');
        return;
    }
    
    timerSeconds += minutes * 60;
    updateTimerDisplay();
    hideTimeModal();
}

// ============================================
// تقویم گیتهاب
// ============================================
async function loadGitHubCalendar() {
    try {
        const response = await fetch('api.php?action=get_calendar_stats&days=365');
        const data = await response.json();
        
        if (data.success) {
            const statsMap = {};
            data.stats.forEach(stat => {
                statsMap[stat.stat_date] = stat.percentage;
            });
            
            const calendarContainer = document.getElementById('githubCalendar');
            const monthsContainer = document.getElementById('calendarMonths');
            if (!calendarContainer || !monthsContainer) return;
            
            calendarContainer.innerHTML = '';
            monthsContainer.innerHTML = '';
            
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - 364);
            
            // Adjust to start of the week (Sunday)
            const startDay = startDate.getDay();
            startDate.setDate(startDate.getDate() - startDay);

            const jalaliMonths = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
            let lastMonth = -1;

            const tempDate = new Date(startDate);
            let dayCounter = 0;

            while (tempDate <= endDate || dayCounter % 7 !== 0) {
                const dateStr = `${tempDate.getFullYear()}-${String(tempDate.getMonth() + 1).padStart(2, '0')}-${String(tempDate.getDate()).padStart(2, '0')}`;
                const percentage = statsMap[dateStr] || 0;
                const [jy, jm, jd] = gregorianToJalali(tempDate.getFullYear(), tempDate.getMonth() + 1, tempDate.getDate());

                // Add month labels
                if (dayCounter % 7 === 0) {
                    const monthLabel = document.createElement('div');
                    monthLabel.style.gridColumn = `span 1`;
                    if (jm !== lastMonth) {
                        monthLabel.textContent = jalaliMonths[jm - 1];
                        lastMonth = jm;
                    }
                    monthsContainer.appendChild(monthLabel);
                }

                let level = 0;
                if (tempDate <= endDate) {
                    if (percentage > 0 && percentage < 25) level = 1;
                    else if (percentage >= 25 && percentage < 50) level = 2;
                    else if (percentage >= 50 && percentage < 75) level = 3;
                    else if (percentage >= 75) level = 4;
                }
                
                const dayDiv = document.createElement('div');
                dayDiv.className = `calendar-day level-${level}`;
                if (tempDate <= endDate) {
                    dayDiv.title = `${jy}/${jm}/${jd} : ${percentage}%`;
                }

                calendarContainer.appendChild(dayDiv);
                tempDate.setDate(tempDate.getDate() + 1);
                dayCounter++;
            }

            const wrapper = document.querySelector('.calendar-wrapper');
            if (wrapper) wrapper.scrollLeft = wrapper.scrollWidth;
        }
    } catch (error) {
        console.error('Error loading github calendar:', error);
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
// تنظیم Event Listeners
// ============================================
function setupEventListeners() {
    // افزودن تسک
    document.querySelector('.add-task')?.addEventListener('click', showTaskModal);
    document.getElementById('addTaskConfirm')?.addEventListener('click', addTaskFromModal);
    document.getElementById('closeTaskModal')?.addEventListener('click', hideTaskModal);
    document.getElementById('cancelTaskModal')?.addEventListener('click', hideTaskModal);
    
    // ویرایش تسک
    document.getElementById('editTaskConfirm')?.addEventListener('click', saveEditTask);
    document.getElementById('closeEditModal')?.addEventListener('click', hideEditTaskModal);
    document.getElementById('cancelEditModal')?.addEventListener('click', hideEditTaskModal);
    
    // پومودورو
    document.querySelector('.start-btn')?.addEventListener('click', () => isRunning ? stopTimer() : startTimer());
    document.querySelector('.add-time')?.addEventListener('click', showTimeModal);
    document.getElementById('addTimeConfirm')?.addEventListener('click', addTimeFromModal);
    document.getElementById('closeTimeModal')?.addEventListener('click', hideTimeModal);
    document.getElementById('cancelTimeModal')?.addEventListener('click', hideTimeModal);
    
    const pomodoroOptions = document.querySelectorAll('.pomodoro-option');
    if (pomodoroOptions.length >= 2) {
        pomodoroOptions[1].addEventListener('click', () => {
            stopTimer(); currentMode = 'work'; timerSeconds = 25 * 60; updateTimerDisplay(); updatePomodoroUI();
        });
        pomodoroOptions[0].addEventListener('click', () => {
            stopTimer(); currentMode = 'rest'; timerSeconds = 5 * 60; updateTimerDisplay(); updatePomodoroUI();
        });
    }

    // تب‌ها
    const tabs = document.querySelectorAll('.tab');
    if (tabs.length >= 2) {
        tabs[0].addEventListener('click', () => switchTab('routine'));
        tabs[1].addEventListener('click', () => switchTab('todo'));
    }

    // فیلتر
    document.querySelector('.task-sort')?.addEventListener('change', (e) => filterTasks(e.target.value));

    // فیلم و کتاب
    document.querySelector('.movie-list-head form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('movie-name');
        const name = input?.value.trim();
        if (!name) return;

        const formData = new URLSearchParams();
        formData.append('action', 'add_movie');
        formData.append('movie_name', name);
        const response = await fetch('api.php', { method: 'POST', body: formData });
        const result = await response.json();
        if (result.success) { input.value = ''; await loadMovies(); }
    });

    document.querySelector('.book-list-head form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('book-name');
        const name = input?.value.trim();
        if (!name) return;

        const formData = new URLSearchParams();
        formData.append('action', 'add_book');
        formData.append('book_name', name);
        const response = await fetch('api.php', { method: 'POST', body: formData });
        const result = await response.json();
        if (result.success) { input.value = ''; await loadBooks(); }
    });

    // اکسپورت
    document.getElementById('exportTasksBtn')?.addEventListener('click', () => {
        const modal = document.getElementById('exportModal');
        if (modal) { modal.style.display = 'flex'; modal.setAttribute('data-export-type', 'tasks'); }
    });

    document.querySelectorAll('.export-list-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = document.getElementById('exportModal');
            if (modal) { modal.style.display = 'flex'; modal.setAttribute('data-export-type', btn.getAttribute('data-type')); }
        });
    });

    document.getElementById('exportCSV')?.addEventListener('click', () => {
        const type = document.getElementById('exportModal')?.getAttribute('data-export-type') || 'tasks';
        exportData(type, 'csv'); document.getElementById('exportModal').style.display = 'none';
    });

    document.getElementById('exportJSON')?.addEventListener('click', () => {
        const type = document.getElementById('exportModal')?.getAttribute('data-export-type') || 'tasks';
        exportData(type, 'json'); document.getElementById('exportModal').style.display = 'none';
    });
    
    document.getElementById('closeExportModal')?.addEventListener('click', () => document.getElementById('exportModal').style.display = 'none');
}

// ============================================
// مقداردهی اولیه
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing application...');
    
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
    
    const now = new Date();
    const [jy, jm, jd] = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const weekDays = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];
    
    const dateEl = document.querySelector('.date');
    const weekEl = document.querySelector('.week-day');
    if (dateEl) dateEl.textContent = `${jy} / ${String(jm).padStart(2, '0')} / ${String(jd).padStart(2, '0')}`;
    if (weekEl) weekEl.textContent = weekDays[now.getDay()];

    setupEventListeners();
    
    await loadStats();
    await loadRoutineTasks();
    await loadMovies();
    await loadBooks();
    await loadGitHubCalendar();
    
    await checkAndResetDailyTasks();
    startDailyResetChecker();
    
    console.log('Initialization complete.');
});
