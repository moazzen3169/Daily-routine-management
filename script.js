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
// Helper Functions
// ============================================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// توابع آمار
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
                label.innerHTML = `
                    <input type="checkbox" name="routine-task" data-id="${task.id}" ${task.is_done ? 'checked' : ''}>
                    <span>${escapeHtml(task.task_name)}</span>
                    <button class="delete-task-btn" data-id="${task.id}" data-type="routine"><img src="assets/Vector.svg" alt="delet"></button>
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
                label.innerHTML = `
                    <input type="checkbox" name="todo-task" data-id="${task.id}" ${task.is_done ? 'checked' : ''}>
                    <span>${escapeHtml(task.task_name)}</span>
                    <button class="delete-task-btn" data-id="${task.id}" data-type="todo"><img src="assets/Vector.svg" alt="delet"></button>
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
                    <span>${escapeHtml(movie.movie_name)}</span>
                    <button class="delete-movie-btn" data-id="${movie.id}"><img src="assets/Vector.svg" alt="delet"></button>
                `;
                container.appendChild(label);
            });
            
            document.querySelectorAll('.movie-checkbox').forEach(checkbox => {
                checkbox.addEventListener('change', handleMovieToggle);
            });
            
            document.querySelectorAll('.delete-movie-btn').forEach(btn => {
                btn.addEventListener('click', handleDeleteMovie);
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
    const btn = e.target;
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
            loadMovies();
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
                label.setAttribute('data-book-id', book.id);
                label.innerHTML = `
                    <input type="checkbox" class="book-checkbox" data-id="${book.id}" ${book.is_read ? 'checked' : ''}>
                    <span>${escapeHtml(book.book_name)}</span>
                    <button class="delete-book-btn" data-id="${book.id}"><img src="assets/Vector.svg" alt="delet"></button>
                `;
                container.appendChild(label);
            });
            
            document.querySelectorAll('.book-checkbox').forEach(checkbox => {
                checkbox.addEventListener('change', handleBookToggle);
            });
            
            document.querySelectorAll('.delete-book-btn').forEach(btn => {
                btn.addEventListener('click', handleDeleteBook);
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
    const btn = e.target;
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
            loadBooks();
        }
    } catch (error) {
        console.error('Error:', error);
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
                alert('✅ Work time finished! Take a 5-minute break.');
            } else {
                currentMode = 'work';
                timerSeconds = 25 * 60;
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
    
    const startBtn = document.querySelector('.start-btn');
    if (startBtn) startBtn.textContent = 'START';
}

function updatePomodoroUI() {
    const workBtn = document.querySelector('.pomodoro-option:first-child');
    const restBtn = document.querySelector('.pomodoro-option:last-child');
    
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
            const days = document.querySelectorAll('.calender-day-cart');
            
            days.forEach((day, index) => {
                const dayNum = index + 1;
                if (dayNum <= daysInMonth) {
                    const percentage = statsMap[dayNum] || 0;
                    let level = 0;
                    if (percentage > 0 && percentage < 25) level = 1;
                    else if (percentage >= 25 && percentage < 50) level = 2;
                    else if (percentage >= 50 && percentage < 75) level = 3;
                    else if (percentage >= 75) level = 4;
                    
                    day.className = `calender-day-cart level-${level}`;
                }
            });
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
    // ============================================
    // دکمه افزودن تسک (Routine/Todo) - باز کردن مودال
    // ============================================
    const addTaskBtn = document.querySelector('.add-task');
    if (addTaskBtn) {
        const newBtn = addTaskBtn.cloneNode(true);
        addTaskBtn.parentNode.replaceChild(newBtn, addTaskBtn);
        
        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showTaskModal();
        });
    }
    
    // ============================================
    // دکمه افزودن زمان پومودورو - باز کردن مودال
    // ============================================
    const addTimeBtn = document.querySelector('.add-time');
    if (addTimeBtn) {
        const newTimeBtn = addTimeBtn.cloneNode(true);
        addTimeBtn.parentNode.replaceChild(newTimeBtn, addTimeBtn);
        
        newTimeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showTimeModal();
        });
    }
    
    // ============================================
    // Event Listeners مودال تسک
    // ============================================
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
        if (e.key === 'Enter') {
            e.preventDefault();
            addTaskFromModal();
        }
    });
    
    // ============================================
    // Event Listeners مودال زمان
    // ============================================
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
        if (e.key === 'Enter') {
            e.preventDefault();
            addTimeFromModal();
        }
    });
    
    // ============================================
    // فرم افزودن فیلم
    // ============================================
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
                    loadMovies();
                } else {
                    alert(result.message || 'Error adding movie');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error adding movie');
            }
        });
    }
    
    // ============================================
    // فرم افزودن کتاب
    // ============================================
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
                    loadBooks();
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
            switchTab(index === 0 ? 'routine' : 'todo');
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
    const workBtn = document.querySelector('.pomodoro-option:first-child');
    const restBtn = document.querySelector('.pomodoro-option:last-child');
    
    if (workBtn) {
        workBtn.addEventListener('click', () => {
            stopTimer();
            currentMode = 'work';
            timerSeconds = 25 * 60;
            updateTimerDisplay();
            updatePomodoroUI();
        });
    }
    
    if (restBtn) {
        restBtn.addEventListener('click', () => {
            stopTimer();
            currentMode = 'rest';
            timerSeconds = 5 * 60;
            updateTimerDisplay();
            updatePomodoroUI();
        });
    }
    
    console.log('Initialization complete');
});