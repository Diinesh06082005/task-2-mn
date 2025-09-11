// --- PRO SCRIPT ---

// --- Core Variables ---
const apiKey = "AIzaSyCBB1SO4qH3w9XCVTbKnZbQvK_2B-_pLhs"; // Replace with your actual key if needed
const SYNC_API_URL = 'https://66e147b39a9c4a34a33118a8.mockapi.io/api/v1/dashboard_data';
let userId = 'default_user'; // Set a default user ID since there's no login
let appInstance;
let proData = {};
let threeJS = { scene: null, camera: null, renderer: null, globe: null, animator: null };
let charts = { consistencyChart: null };

const defaultProData = {
    schedule: {
        monday: { day: "Monday", classes: [{ time: "13:00 - 14:00", name: "PEV301 (T)", location: "37-705, K23DX" }, { time: "14:00 - 15:00", name: "PEV301 (T)", location: "37-705, K23DX" }, { time: "15:00 - 16:00", name: "CSE322 (L)", location: "37-707, K23DX" }], gym: { title: "Push Day", time: "09:00 - 11:00", tasks: ["Warm-up", "Bench Press: 4x10", "Incline DB Press: 4x10", "OHP: 4x10", "Triceps Pushdowns: 3x12"] } }, 
        tuesday: { day: "Tuesday", classes: [{ time: "14:00 - 15:00", name: "INT222 (L)", location: "37-707, K23DX" }, { time: "15:00 - 16:00", name: "INT222 (L)", location: "37-707, K23DX" }], gym: { title: "Pull Day", time: "09:00 - 11:00", tasks: ["Warm-up", "Pull-Ups: 4x8-10", "Barbell Rows: 4x10", "Biceps Curls: 4x12"] } },
        wednesday: { day: "Wednesday", classes: [{ time: "14:00 - 15:00", name: "PEA306 (L)", location: "37-707, K23DX" }, { time: "15:00 - 16:00", name: "CSE322 (L)", location: "37-707, K23DX" }], gym: { title: "Legs + Core", time: "09:00 - 11:00", tasks: ["Warm-up", "Squats: 4x10", "Deadlifts: 4x8", "Leg Press: 4x12", "Hanging Leg Raises: 3x12"] } },
        thursday: { day: "Thursday", classes: [{ time: "14:00 - 15:00", name: "INT222 (P)", location: "37-706, K23DX" }, { time: "15:00 - 16:00", name: "INT222 (P)", location: "37-706, K23DX" }], gym: { title: "Push Heavy", time: "09:00 - 11:00", tasks: ["Warm-up", "Bench Press (Heavy): 5x6-8", "Incline DB Press: 5x8", "Skull Crushers: 3x12"] } },
        friday: { day: "Friday", classes: [{ time: "14:00 - 15:00", name: "CSE322 (L)", location: "37-707, K23DX" }, { time: "15:00 - 16:00", name: "PEA306 (T)", location: "37-605, K23DX" }], gym: { title: "Pull Heavy", time: "09:00 - 11:00", tasks: ["Warm-up", "Deadlifts (Heavy): 4x6-8", "Weighted Pull-Ups: 4x8", "Barbell Curls: 4x10"] } },
        saturday: { day: "Saturday", classes: [], gym: { title: "Legs + HIIT", time: "09:00 - 11:00", tasks: ["Warm-up", "Squats: 4x8", "Leg Press: 4x10", "HIIT Cardio (15 min)"] } },
        sunday: { day: "Sunday", classes: [], gym: { title: "Full Rest 🛌", time: "All Day", tasks: [] } }
    },
    habits: [
        { id: 'habit-1', text: 'Read 10 Pages', done: false, streak: 5 },
        { id: 'habit-2', text: 'Meditate 10 mins', done: false, streak: 12 },
        { id: 'habit-3', text: 'Drink 2L Water', done: false, streak: 3 },
        { id: 'habit-4', text: 'Code for 30 mins', done: false, streak: 25 },
    ],
    goals: [
         { id: 'goal-1', text: 'Master React.js', progress: 60 },
         { id: 'goal-2', text: 'Bench Press 100kg', progress: 85 },
         { id: 'goal-3', text: 'Finish personal project', progress: 30 },
    ],
    journal: "",
    pomodoro: { running: false, timerId: null, duration: 1500, timeLeft: 1500, mode: 'work' },
    completionHistory: {}, // { 'YYYY-MM-DD': { class: 0, gym: 0 } }
    lastLogin: new Date().toISOString().split('T')[0],
    lastUpdated: new Date().toISOString(),
};

// --- Data Persistence ---
function saveData() {
    try {
        proData.lastUpdated = new Date().toISOString();
        localStorage.setItem(`pro_data_${userId}`, JSON.stringify(proData));
    } catch (e) {
        console.error("Error saving data:", e);
    }
}

function loadData() {
    const savedData = localStorage.getItem(`pro_data_${userId}`);
    if (savedData) {
        proData = JSON.parse(savedData);
        if (!proData.habits) proData.habits = JSON.parse(JSON.stringify(defaultProData.habits));
        if (!proData.goals) proData.goals = JSON.parse(JSON.stringify(defaultProData.goals));
        if (!proData.journal) proData.journal = defaultProData.journal;
        if (!proData.pomodoro) proData.pomodoro = JSON.parse(JSON.stringify(defaultProData.pomodoro));
        if (!proData.completionHistory) proData.completionHistory = {};
        if (!proData.lastUpdated) proData.lastUpdated = new Date().toISOString();
    } else {
        proData = JSON.parse(JSON.stringify(defaultProData));
    }
    const today = new Date().toISOString().split('T')[0];
    if (proData.lastLogin !== today) {
        proData.habits.forEach(h => {
            if (!h.done) h.streak = 0;
            h.done = false;
        });
        proData.lastLogin = today;
        saveData();
    }
    ensureTaskIds();
}

function ensureTaskIds() {
    Object.keys(proData.schedule).forEach(dayKey => {
        const day = proData.schedule[dayKey];
        day.classes.forEach((c, i) => { if (!c.id) c.id = `class-${dayKey}-${i}-${Date.now()}` });
        day.gym.tasks = day.gym.tasks.map((task, i) => {
            if (typeof task === 'string') return { id: `gym-${dayKey}-${i}-${Date.now()}`, text: task };
            if (!task.id) task.id = `gym-${dayKey}-${i}-${Date.now()}`;
            return task;
        });
    });
}

// --- App Startup ---
function showMainContent() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('pro-layout').classList.remove('hidden');
    initializeApp();
}

// --- Theme Management ---
function applyTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem(`theme_${userId}`, themeName);
     if (document.getElementById('theme-switcher')) {
        document.getElementById('theme-switcher').value = themeName;
    }
    if (threeJS.globe) {
        const newColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim();
        threeJS.globe.material.color.set(newColor);
    }
    if (charts.consistencyChart) {
        const newColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim();
        const newBorderColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-glow').trim();
        charts.consistencyChart.data.datasets[0].backgroundColor = newColor;
        charts.consistencyChart.data.datasets[0].borderColor = newBorderColor;
        charts.consistencyChart.options.scales.x.ticks.color = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
        charts.consistencyChart.options.scales.y.ticks.color = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
        charts.consistencyChart.update();
    }
}

function loadTheme() {
    const savedTheme = localStorage.getItem(`theme_${userId}`) || 'dark';
    applyTheme(savedTheme);
}

// --- App Initialization ---
function initializeApp() {
    loadData();
    loadTheme();
    generateMainContentHTML();
    appInstance = createAppInstance();
    changeTab('dashboard');
    if (typeof initializeVoiceCommands === 'function') {
        initializeVoiceCommands(appInstance);
    }
    checkInitialSyncStatus();

    // Load mobile view preference
    const isMobileViewEnabled = localStorage.getItem('mobile_view_enabled') === 'true';
    if(isMobileViewEnabled) {
        document.body.classList.add('mobile-view');
    }
}

// --- Create App Instance for Voice Commands ---
function createAppInstance() {
    return {
        schedule: proData.schedule,
        changeTab: changeTab,
        setTheme: applyTheme,
        updateTask: (taskQuery, dayKey, checkState = true) => {
            const dayData = proData.schedule[dayKey];
            if (!dayData) return false;
            let taskToUpdate = null;
            for (const cls of dayData.classes) {
                if (cls.name.toLowerCase().includes(taskQuery)) {
                    taskToUpdate = cls;
                    break;
                }
            }
            if (!taskToUpdate) {
                for (const task of dayData.gym.tasks) {
                    if (task.text.toLowerCase().includes(taskQuery)) {
                        taskToUpdate = task;
                        break;
                    }
                }
            }
            if (taskToUpdate) {
                localStorage.setItem(`${userId}_${taskToUpdate.id}`, checkState);
                const currentTab = document.querySelector('.nav-btn.bg-white\\/10')?.dataset.tab || 'dashboard';
                changeTab(currentTab);
                return true;
            }
            return false;
        },
        getScheduleSummaryForDay: (dayKey) => {
            const dayData = proData.schedule[dayKey];
            let summary = `On ${dayData.day}, `;
            if (dayData.classes.length > 0) {
                summary += `you have ${dayData.classes.length} classes, starting with ${dayData.classes[0].name.replace(/ \((L|T|P)\)/, '')}. `;
            } else {
                summary += "you have no classes. ";
            }
            if (dayData.gym.title !== 'Full Rest 🛌') {
                summary += `Your gym session is ${dayData.gym.title}.`;
            } else {
                summary += "It's a rest day."
            }
            return summary;
        },
        getProgressText: (type) => { // 'class' or 'gym'
            let attended = 0;
            let total = 0;
            Object.values(proData.schedule).forEach(day => {
                if(type === 'class'){
                    total += day.classes.length;
                    day.classes.forEach(c => {
                        if (localStorage.getItem(`${userId}_${c.id}`) === 'true') attended++;
                    });
                } else if (type === 'gym') {
                    total += day.gym.tasks.length;
                     day.gym.tasks.forEach(t => {
                        if (localStorage.getItem(`${userId}_${t.id}`) === 'true') attended++;
                    });
                }
            });
            return `${attended} out of ${total}`;
        },
        resetProgress: (bypassConfirm = false) => {
            if(bypassConfirm) {
                 Object.keys(localStorage).forEach(key => {
                     if (key.startsWith(`${userId}_class-`) || key.startsWith(`${userId}_gym-`)) {
                         localStorage.removeItem(key);
                     }
                 });
                 const currentTab = document.querySelector('.nav-btn.bg-white\\/10')?.dataset.tab || 'dashboard';
                 changeTab(currentTab); // Re-render
            } else {
                 showConfirmation("Reset all progress?", () => appInstance.resetProgress(true));
            }
        },
        scrollWindow: (direction) => {
            window.scrollBy({ top: direction * window.innerHeight * 0.7, left: 0, behavior: 'smooth' });
        },
        showConfirmation: showConfirmation
    };
}


// --- 3D Globe ---
function initThreeJS() {
    const container = document.getElementById('globe-container');
    if(!container || container.querySelector('canvas')) return;
    threeJS.scene = new THREE.Scene();
    threeJS.camera = new THREE.PerspectiveCamera(75, container.offsetWidth / container.offsetHeight, 0.1, 1000);
    threeJS.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    threeJS.renderer.setSize(container.offsetWidth, container.offsetHeight);
    container.appendChild(threeJS.renderer.domElement);
    const geometry = new THREE.SphereGeometry(2, 32, 32);
    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim();
    const material = new THREE.MeshBasicMaterial({ color: accentColor, wireframe: true });
    threeJS.globe = new THREE.Mesh(geometry, material);
    threeJS.scene.add(threeJS.globe);
    threeJS.camera.position.z = 4;
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    container.addEventListener('mousedown', e => isDragging = true);
    container.addEventListener('mouseup', e => isDragging = false);
    container.addEventListener('mouseleave', e => isDragging = false);
    container.addEventListener('mousemove', e => {
        if(!isDragging) return;
        const deltaMove = {
            x: e.offsetX - previousMousePosition.x,
            y: e.offsetY - previousMousePosition.y
        };
        threeJS.globe.rotation.y += deltaMove.x * 0.005;
        threeJS.globe.rotation.x += deltaMove.y * 0.005;
        previousMousePosition = { x: e.offsetX, y: e.offsetY };
    });
    window.addEventListener('resize', () => {
         threeJS.camera.aspect = container.offsetWidth / container.offsetHeight;
         threeJS.camera.updateProjectionMatrix();
         threeJS.renderer.setSize(container.offsetWidth, container.offsetHeight);
    });
    function animate() {
        threeJS.animator = requestAnimationFrame(animate);
        if (!isDragging) {
            threeJS.globe.rotation.y += 0.001;
        }
        threeJS.renderer.render(threeJS.scene, threeJS.camera);
    }
    animate();
}

// --- AI Features ---
async function callGeminiAPI(prompt) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const result = await response.json();
        return result.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "Error: Could not retrieve AI response.";
    }
}

async function generateWeeklyInsight() {
     const insightCard = document.getElementById('ai-insight-card');
     insightCard.innerHTML = `<div class="flex items-center justify-center h-full"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[--accent-color]"></div></div>`;
     const scheduleSummary = JSON.stringify(proData.schedule);
     const prompt = `Analyze this weekly schedule: ${scheduleSummary}. Provide a short, actionable insight (max 3 sentences) for productivity or well-being. For example, point out a busy day and suggest preparing in advance, or a light day perfect for a hobby. Be encouraging.`;
     const insight = await callGeminiAPI(prompt);
     insightCard.innerHTML = `
        <h4 class="font-bold text-lg mb-2 text-[--accent-color]">AI Weekly Insight</h4>
        <p class="text-sm text-[--text-secondary]">${insight}</p>
     `;
}

async function handleAssistantChat(e) {
    e.preventDefault();
    const chatInput = document.getElementById('ai-chat-input');
    const chatBody = document.getElementById('ai-chat-body');
    const userMessage = chatInput.value.trim();
    if(!userMessage) return;
    chatBody.innerHTML += `<div class="flex justify-end"><div class="bg-[--accent-color] text-white p-3 rounded-lg max-w-xs">${userMessage}</div></div>`;
    chatInput.value = '';
    chatBody.scrollTop = chatBody.scrollHeight;
    chatBody.innerHTML += `<div id="ai-thinking" class="flex justify-start"><div class="bg-[--card-bg] p-3 rounded-lg max-w-xs">Thinking...</div></div>`;
    chatBody.scrollTop = chatBody.scrollHeight;
    const aiResponse = await callGeminiAPI(userMessage);
    document.getElementById('ai-thinking').remove();
    chatBody.innerHTML += `<div class="flex justify-start"><div class="bg-[--card-bg] p-3 rounded-lg max-w-xs">${aiResponse.replace(/\n/g, '<br>')}</div></div>`;
    chatBody.scrollTop = chatBody.scrollHeight;
}

// --- Pomodoro Timer ---
function setPomodoroTime(seconds, buttonEl) {
    if (proData.pomodoro.timerId) {
        clearInterval(proData.pomodoro.timerId);
    }
    proData.pomodoro.running = false;
    proData.pomodoro.duration = seconds;
    proData.pomodoro.timeLeft = seconds;
    
    const minutes = Math.floor(seconds / 60);
    document.getElementById('pomodoro-timer').textContent = `${String(minutes).padStart(2, '0')}:00`;
    document.getElementById('pomodoro-start').textContent = 'Start';

    document.querySelectorAll('.time-btn').forEach(btn => btn.classList.remove('active'));
    if (buttonEl) {
        buttonEl.classList.add('active');
    } else {
        // If called without a button, find the matching button to activate
        const matchingButton = document.querySelector(`.time-btn[onclick="setPomodoroTime(${seconds}, this)"]`);
        if (matchingButton) matchingButton.classList.add('active');
    }
}


function startPomodoro() {
    const timerDisplay = document.getElementById('pomodoro-timer');
    if (proData.pomodoro.running) return;
    proData.pomodoro.running = true;
    document.getElementById('pomodoro-start').textContent = 'Pause';
    try { Tone.start(); const synth = new Tone.Synth().toDestination(); synth.triggerAttackRelease("C4", "8n"); } catch(e){}
    proData.pomodoro.timerId = setInterval(() => {
        proData.pomodoro.timeLeft--;
        const minutes = Math.floor(proData.pomodoro.timeLeft / 60);
        const seconds = proData.pomodoro.timeLeft % 60;
        timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        if (proData.pomodoro.timeLeft <= 0) {
            clearInterval(proData.pomodoro.timerId);
            proData.pomodoro.running = false;
             try { const synth = new Tone.Synth().toDestination(); synth.triggerAttackRelease("C5", "4n"); } catch(e){}
            if (proData.pomodoro.mode === 'work') {
                proData.pomodoro.mode = 'break';
                proData.pomodoro.timeLeft = 300; // 5 min break
                document.getElementById('pomodoro-mode').textContent = 'Break Time!';
                 document.getElementById('pomodoro-timer').textContent = `05:00`;
            } else {
                proData.pomodoro.mode = 'work';
                proData.pomodoro.timeLeft = proData.pomodoro.duration;
                document.getElementById('pomodoro-mode').textContent = 'Focus Session';
                const minutes = Math.floor(proData.pomodoro.duration / 60);
                document.getElementById('pomodoro-timer').textContent = `${String(minutes).padStart(2, '0')}:00`;
            }
            document.getElementById('pomodoro-start').textContent = 'Start';
        }
    }, 1000);
}

function pausePomodoro() {
    clearInterval(proData.pomodoro.timerId);
    proData.pomodoro.running = false;
    document.getElementById('pomodoro-start').textContent = 'Resume';
}

function resetPomodoro() {
    setPomodoroTime(proData.pomodoro.duration || 1500);
}

function togglePomodoro() {
    if (proData.pomodoro.running) {
        pausePomodoro();
    } else {
        startPomodoro();
    }
}

// --- UI Generation ---
function generateMainContentHTML() {
    const main = document.getElementById('main-content');
    main.innerHTML = `<!-- All tab content will be injected here -->`;
}

function renderDashboard() {
    const main = document.getElementById('main-content');
    const timerDurations = [5, 10, 15, 20, 25, 30];
    const timerButtonsHTML = timerDurations.map(minutes => 
        `<button class="time-btn ${proData.pomodoro.duration === minutes * 60 ? 'active' : ''}" onclick="setPomodoroTime(${minutes * 60}, this)">${minutes}m</button>`
    ).join('');
    
    main.innerHTML = `
    <div id="dashboard" class="tab-content space-y-8 animate-fadeIn">
        <header class="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
            <div>
                <h1 class="text-3xl sm:text-4xl font-bold text-header tracking-tight">Dashboard</h1>
                <p class="text-md text-secondary" id="current-date">Loading date...</p>
            </div>
             <button onclick="generateWeeklyInsight()" class="pro-btn font-semibold py-2 px-4 rounded-lg text-sm mt-4 md:mt-0">Get AI Insight</button>
        </header>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2 space-y-6">
               <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div id="pomodoro-card" class="glass-card rounded-2xl p-6 text-center">
                        <h3 id="pomodoro-mode" class="text-xl font-semibold mb-2">Focus Session</h3>
                        <div class="time-selector">${timerButtonsHTML}</div>
                        <p id="pomodoro-timer" class="text-6xl font-bold tracking-tighter my-2">25:00</p>
                        <div class="flex justify-center gap-4 mt-4">
                            <button id="pomodoro-start" onclick="togglePomodoro()" class="pro-btn font-semibold py-2 px-6 rounded-lg flex-1">Start</button>
                            <button onclick="resetPomodoro()" class="secondary-btn font-semibold py-2 px-6 rounded-lg flex-1">Reset</button>
                        </div>
                   </div>
                   <div id="ai-insight-card" class="glass-card rounded-2xl p-6 flex items-center justify-center"></div>
               </div>
                <div id="today-schedule" class="glass-card rounded-2xl p-6">
                     <h3 class="text-2xl font-bold mb-4 text-header">Today's Agenda</h3>
                     <div id="today-card-container" class="space-y-4"></div>
                </div>
                 <div id="habits-tracker" class="glass-card rounded-2xl p-6">
                    <h3 class="text-2xl font-bold mb-4 text-header">Daily Habits</h3>
                    <div id="habits-container" class="space-y-3"></div>
                </div>
            </div>
            <div class="space-y-6">
                <div id="globe-card" class="glass-card rounded-2xl p-2 aspect-square">
                    <div id="globe-container" class="w-full h-full cursor-grab"></div>
                </div>
                <div id="goals-tracker" class="glass-card rounded-2xl p-6">
                     <h3 class="text-2xl font-bold mb-4 text-header">My Goals</h3>
                     <div id="goals-container" class="space-y-4"></div>
                </div>
            </div>
        </div>
    </div>`;
    document.getElementById('current-date').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    setPomodoroTime(proData.pomodoro.duration); // Set initial timer display
    renderTodaySchedule();
    renderHabits();
    renderGoals();
    generateWeeklyInsight();
    initThreeJS();
}

function renderCalendar() {
     const main = document.getElementById('main-content');
     main.innerHTML = `
     <div id="calendar" class="tab-content animate-fadeIn">
         <header class="flex items-center justify-between mb-6">
             <h1 class="text-3xl sm:text-4xl font-bold text-header tracking-tight">Weekly Canvas</h1>
             <button onclick="openTaskModal()" class="pro-btn font-semibold py-2 px-4 rounded-lg text-sm">Add Event</button>
         </header>
         <div id="calendar-container" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4"></div>
    </div>`;
    const container = document.getElementById('calendar-container');
    let html = '';
    const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const todayKey = dayOrder[new Date().getDay() -1] || 'sunday';
    dayOrder.forEach(dayKey => {
        const dayData = proData.schedule[dayKey];
        const isToday = dayKey === todayKey ? 'border-2 border-[--accent-color] shadow-lg shadow-[--accent-glow]' : '';
        html += `
        <div class="glass-card rounded-2xl p-4 flex flex-col ${isToday}">
            <h3 class="font-bold text-center mb-4 ${isToday ? 'text-[--accent-color]':''}">${dayData.day.toUpperCase()}</h3>
            <div class="space-y-2 flex-grow">`;
        const events = [
            ...(dayData.gym.title !== 'Full Rest 🛌' ? [{...dayData.gym, type: 'gym'}] : []),
            ...dayData.classes.map(c => ({...c, type: 'class'}))
        ].sort((a, b) => a.time.localeCompare(b.time));
        if (events.length > 0) {
             events.forEach(event => {
                 const icon = event.type === 'gym' ? '🏋️‍♂️' : (event.location === 'Custom Task' ? '📌' : '📚');
                 const bgColor = event.type === 'gym' ? 'bg-purple-500/20' : 'bg-blue-500/20';
                 const borderColor = event.type === 'gym' ? 'border-purple-400' : 'border-blue-400';
                 html += `
                 <div class="text-xs p-2 rounded-lg border-l-4 ${bgColor} ${borderColor}">
                     <p class="font-bold">${icon} ${event.name || event.title}</p>
                     <p class="text-[--text-secondary]">${event.time}</p>
                 </div>`;
             });
        } else {
             html += `<div class="text-center text-sm text-[--text-secondary] flex-grow flex items-center justify-center">Rest Day</div>`;
        }
        html += `</div></div>`;
    });
    container.innerHTML = html;
}

function renderAnalytics() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
    <div id="analytics" class="tab-content animate-fadeIn">
         <header class="mb-6">
             <h1 class="text-3xl sm:text-4xl font-bold text-header tracking-tight">Your Analytics</h1>
             <p class="text-md text-secondary">Visualize your weekly performance and consistency.</p>
         </header>
         <div class="glass-card rounded-2xl p-6">
             <h3 class="text-xl font-bold mb-4">Weekly Task Completion</h3>
             <canvas id="consistencyChart"></canvas>
         </div>
    </div>`;
    renderConsistencyChart();
}

function renderJournal() {
     const main = document.getElementById('main-content');
     main.innerHTML = `
     <div id="journal" class="tab-content animate-fadeIn h-full flex flex-col">
         <header class="mb-6">
             <h1 class="text-3xl sm:text-4xl font-bold text-header tracking-tight">Personal Journal</h1>
             <p class="text-md text-secondary">A private space for your thoughts and reflections.</p>
         </header>
         <div class="glass-card rounded-2xl p-2 flex-grow flex flex-col">
            <textarea id="journal-textarea" class="w-full h-full bg-transparent p-4 text-lg leading-relaxed resize-none focus:outline-none" placeholder="Start writing...">${proData.journal}</textarea>
         </div>
    </div>`;
     document.getElementById('journal-textarea').addEventListener('keyup', (e) => {
         proData.journal = e.target.value;
         saveData();
     });
}

function renderAssistant() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
     <div id="assistant" class="tab-content animate-fadeIn h-full flex flex-col">
          <header class="mb-6">
             <h1 class="text-3xl sm:text-4xl font-bold text-header tracking-tight">AI Assistant</h1>
             <p class="text-md text-secondary">Ask me anything! From productivity tips to general knowledge.</p>
         </header>
         <div class="glass-card rounded-2xl flex-grow flex flex-col p-4">
            <div id="ai-chat-body" class="flex-grow space-y-4 overflow-y-auto p-4">
                <div class="flex justify-start">
                    <div class="bg-[--card-bg] p-3 rounded-lg max-w-xs">Hello! How can I help you today?</div>
                </div>
            </div>
            <form id="ai-chat-form" class="mt-4 flex gap-4">
                <input id="ai-chat-input" type="text" placeholder="Type your message..." class="pro-input w-full p-3 rounded-lg flex-grow">
                <button type="submit" class="pro-btn font-semibold py-3 px-5 rounded-lg">Send</button>
            </form>
         </div>
     </div>`;
    document.getElementById('ai-chat-form').addEventListener('submit', handleAssistantChat);
}

function renderSettings() {
     const main = document.getElementById('main-content');
     main.innerHTML = `
    <div id="settings" class="tab-content animate-fadeIn">
         <header class="mb-6">
             <h1 class="text-3xl sm:text-4xl font-bold text-header tracking-tight">Settings</h1>
             <p class="text-md text-secondary">Customize your PRO experience.</p>
         </header>
         <div class="space-y-6 max-w-2xl">
            <div class="glass-card rounded-2xl p-6">
                 <h3 class="text-xl font-bold mb-4 text-[--accent-color]">Appearance</h3>
                 <div class="flex items-center justify-between">
                     <label for="theme-switcher" class="text-lg">Theme</label>
                     <select id="theme-switcher" class="pro-input p-2 rounded-lg">
                        <optgroup label="Standard Themes">
                            <option value="dark">Pro Dark</option>
                            <option value="light">Pro Light</option>
                            <option value="oceanic">Oceanic</option>
                            <option value="rose-gold">Rose Gold</option>
                            <option value="dracula">Dracula</option>
                        </optgroup>
                        <optgroup label="Animated Themes">
                            <option value="matrix">Matrix</option>
                            <option value="sunset">Sunset</option>
                            <option value="cyberpunk">Cyberpunk</option>
                            <option value="cosmic">Cosmic</option>
                            <option value="synthwave">Synthwave</option>
                        </optgroup>
                    </select>
                 </div>
            </div>
            <div class="glass-card rounded-2xl p-6">
                 <h3 class="text-xl font-bold mb-4 text-[--accent-color]">Data Management</h3>
                 <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button id="export-data-btn" class="secondary-btn font-semibold py-3 px-6 rounded-lg w-full">Backup Data</button>
                    <label for="import-data-input" class="secondary-btn text-center font-semibold py-3 px-6 rounded-lg w-full cursor-pointer">Restore Data</label>
                    <input type="file" id="import-data-input" class="hidden" accept=".json">
                    <label for="import-csv-input" class="pro-btn text-center font-semibold py-3 px-6 rounded-lg w-full sm:col-span-2 cursor-pointer">Import Timetable (.csv)</label>
                    <input type="file" id="import-csv-input" class="hidden" accept=".csv">
                 </div>
            </div>
             <div class="glass-card rounded-2xl p-6">
                 <h3 class="text-xl font-bold mb-4 text-[--danger-color]">Danger Zone</h3>
                  <div class="space-y-4">
                    <button id="delete-imported-btn" class="danger-btn opacity-70 hover:opacity-100 font-semibold py-3 px-6 rounded-lg w-full">Clear Imported Schedule</button>
                    <button id="reset-progress-btn" class="danger-btn font-semibold py-3 px-6 rounded-lg w-full">Reset All Progress & Data</button>
                 </div>
            </div>
         </div>
    </div>`;
    const themeSwitcher = document.getElementById('theme-switcher');
    themeSwitcher.value = document.documentElement.getAttribute('data-theme');
    themeSwitcher.addEventListener('change', (e) => applyTheme(e.target.value));
    document.getElementById('export-data-btn').addEventListener('click', exportData);
    document.getElementById('import-data-input').addEventListener('change', importData);
    document.getElementById('import-csv-input').addEventListener('change', importTimetableFromCSV);
    document.getElementById('delete-imported-btn').addEventListener('click', () => {
        showConfirmation("This will remove all events imported from a CSV file. Are you sure?", deleteImportedTimetable);
    });
    document.getElementById('reset-progress-btn').addEventListener('click', () => {
         showConfirmation("This will delete ALL data. Are you sure?", () => {
             localStorage.removeItem(`pro_data_${userId}`);
             initializeApp();
         });
    });
}

// --- Component Renderers ---
function renderTodaySchedule() {
    const container = document.getElementById('today-card-container');
    if(!container) return;
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const todayKey = dayNames[new Date().getDay()];
    const dayData = proData.schedule[todayKey];
    let classHtml = dayData.classes.length > 0 ? dayData.classes.map(c => createTaskCheckbox(c, 'class', todayKey)).join('') : `<p class="text-[--text-secondary] text-sm">No classes scheduled.</p>`;
    let gymHtml = dayData.gym.tasks.length > 0 ? dayData.gym.tasks.map(t => createTaskCheckbox(t, 'gym', todayKey)).join('') : ``;
    container.innerHTML = `
        <div>
            <h4 class="text-lg font-semibold mb-2 text-[--accent-color]">📚 Classes</h4>
            <div class="space-y-2">${classHtml}</div>
        </div>
        <div>
             <h4 class="text-lg font-semibold mb-2 text-[--accent-color]">🏋️‍♂️ Gym: ${dayData.gym.title}</h4>
             <div class="space-y-2">${gymHtml}</div>
        </div>`;
}

function createTaskCheckbox(task, type, day) {
    const isChecked = localStorage.getItem(`${userId}_${task.id}`) === 'true';
    const label = type === 'class' ? `<b>${task.time}:</b> ${task.name}` : task.text;
    return `
    <div class="flex items-center">
        <input type="checkbox" id="${task.id}" onchange="handleCheckboxChange(event)" ${isChecked ? 'checked' : ''} data-type="${type}" data-day="${day}" class="hidden">
        <label for="${task.id}" class="flex-grow flex items-center cursor-pointer text-sm">
            <span class="w-5 h-5 rounded-md border-2 border-[--card-border] mr-3 flex items-center justify-center transition-all duration-200 ${isChecked ? 'bg-[--accent-color] border-[--accent-color]' : ''}">
                <svg class="w-3 h-3 text-white transition-opacity ${isChecked ? 'opacity-100' : 'opacity-0'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
            </span>
            <span class="${isChecked ? 'line-through text-[--text-secondary]' : ''}">${label}</span>
        </label>
    </div>`;
}

function handleCheckboxChange(event) {
    const isChecked = event.target.checked;
    localStorage.setItem(`${userId}_${event.target.id}`, isChecked);
    updateCompletionHistory(event.target.dataset.day, event.target.dataset.type, isChecked);
    if(document.getElementById('today-card-container')){
        renderTodaySchedule();
    }
    if(document.getElementById('analytics')) {
        renderConsistencyChart();
    }
}

function renderHabits() {
    const container = document.getElementById('habits-container');
    if(!container) return;
    container.innerHTML = proData.habits.map(habit => `
        <div class="flex items-center justify-between">
            <div class="flex items-center">
                <input type="checkbox" id="${habit.id}" onchange="toggleHabit('${habit.id}')" ${habit.done ? 'checked' : ''} class="hidden">
                <label for="${habit.id}" class="flex items-center cursor-pointer">
                    <span class="w-5 h-5 rounded-md border-2 border-[--card-border] mr-3 flex items-center justify-center transition-all duration-200 ${habit.done ? 'bg-[--accent-color-secondary] border-[--accent-color-secondary]' : ''}">
                         <svg class="w-3 h-3 text-white transition-opacity ${habit.done ? 'opacity-100' : 'opacity-0'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                    </span>
                     <span class="${habit.done ? 'line-through text-[--text-secondary]' : ''}">${habit.text}</span>
                </label>
            </div>
            <span class="text-sm font-mono p-1 px-2 rounded bg-[--card-bg]">🔥 ${habit.streak}</span>
        </div>`).join('');
}

function toggleHabit(habitId) {
    const habit = proData.habits.find(h => h.id === habitId);
    habit.done = !habit.done;
    if (habit.done) {
        habit.streak++;
        try { Tone.start(); const synth = new Tone.Synth().toDestination(); synth.triggerAttackRelease("E5", "16n"); } catch(e){}
    } else {
        habit.streak--;
    }
    saveData();
    renderHabits();
}

function renderGoals() {
    const container = document.getElementById('goals-container');
    if(!container) return;
    container.innerHTML = proData.goals.map(goal => `
        <div>
            <div class="flex justify-between items-baseline mb-1">
                <p class="text-sm font-medium">${goal.text}</p>
                <p class="text-sm font-bold text-[--accent-color]">${goal.progress}%</p>
            </div>
            <div class="w-full bg-[--bg-secondary] rounded-full h-2.5">
                <div class="bg-[--accent-color] h-2.5 rounded-full" style="width: ${goal.progress}%"></div>
            </div>
        </div>`).join('');
}

// --- Analytics Chart ---
function updateCompletionHistory(dayKey, type, isIncrement) {
    const today = new Date().toISOString().split('T')[0];
    if (!proData.completionHistory[today]) {
        proData.completionHistory[today] = { class: 0, gym: 0 };
    }
    const count = isIncrement ? 1 : -1;
    if(type === 'class') proData.completionHistory[today].class += count;
    if(type === 'gym') proData.completionHistory[today].gym += count;

    // Ensure counts don't go below zero
    if(proData.completionHistory[today].class < 0) proData.completionHistory[today].class = 0;
    if(proData.completionHistory[today].gym < 0) proData.completionHistory[today].gym = 0;
    
    saveData();
}

function renderConsistencyChart() {
    const ctx = document.getElementById('consistencyChart')?.getContext('2d');
    if (!ctx) return;
    const labels = [];
    const data = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateString = d.toISOString().split('T')[0];
        labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
        const dayHistory = proData.completionHistory[dateString];
        const totalCompleted = dayHistory ? (dayHistory.class || 0) + (dayHistory.gym || 0) : 0;
        data.push(totalCompleted);
    }
    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim();
    const accentGlow = getComputedStyle(document.documentElement).getPropertyValue('--accent-glow').trim();
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
    if (charts.consistencyChart) {
        charts.consistencyChart.destroy();
    }
    charts.consistencyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Tasks Completed',
                data: data,
                backgroundColor: accentColor,
                borderColor: accentGlow,
                borderWidth: 1,
                borderRadius: 5,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: textColor, stepSize: 1 }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: textColor }
                }
            }
        }
    });
}

// --- Core Logic ---
function changeTab(tabName) {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('bg-white/10', 'text-[--accent-color]'));
    const currentTabButton = document.querySelector(`.nav-btn[data-tab="${tabName}"]`);
    if (currentTabButton) {
        currentTabButton.classList.add('bg-white/10', 'text-[--accent-color]');
    }
    switch(tabName) {
        case 'dashboard': renderDashboard(); break;
        case 'calendar': renderCalendar(); break;
        case 'analytics': renderAnalytics(); break;
        case 'journal': renderJournal(); break;
        case 'assistant': renderAssistant(); break;
        case 'settings': renderSettings(); break;
    }
}

// --- Data Import/Export & Management ---
function exportData() {
    const dataStr = JSON.stringify(proData, null, 2);
    const blob = new Blob([dataStr], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard_pro_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importData(event) {
    const file = event.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (importedData.schedule && importedData.habits) {
                 showConfirmation("This will overwrite your current data. Proceed?", () => {
                     proData = importedData;
                     saveData();
                     initializeApp();
                     changeTab('dashboard');
                 });
            } else {
                alert("Invalid backup file.");
            }
        } catch (err) {
             alert("Error reading backup file.");
        }
    };
    reader.readAsText(file);
    event.target.value = null;
}

function timeToMinutes(timeStr) {
    if(!timeStr || !timeStr.includes(':')) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

function isSlotFree(dayKey, startTime, endTime) {
    const newStart = timeToMinutes(startTime);
    const newEnd = timeToMinutes(endTime);
    const daySchedule = proData.schedule[dayKey];
    if (!daySchedule) return false;
    const existingEvents = [...daySchedule.classes, daySchedule.gym];
    for (const event of existingEvents) {
        if (event && event.time && event.time.includes(' - ')) {
            const [existingStartStr, existingEndStr] = event.time.split(' - ');
            const existingStart = timeToMinutes(existingStartStr);
            const existingEnd = timeToMinutes(existingEndStr);
            if (newStart < existingEnd && newEnd > existingStart) {
                return false;
            }
        }
    }
    return true;
}

function importTimetableFromCSV(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const rows = text.split('\n').slice(1);
        let addedCount = 0;
        let conflictCount = 0;
        let conflicts = [];
        rows.forEach(row => {
            const columns = row.trim().split(',');
            if (columns.length < 5) return;
            const [day, startTime, endTime, name, location] = columns;
            const dayKey = day.trim().toLowerCase();
            if (proData.schedule[dayKey] && isSlotFree(dayKey, startTime, endTime)) {
                const newEvent = {
                    id: `imported-${dayKey}-${Date.now()}-${Math.random()}`,
                    time: `${startTime} - ${endTime}`,
                    name: name.replace(/"/g, ''),
                    location: location.replace(/"/g, ''),
                    isImported: true
                };
                proData.schedule[dayKey].classes.push(newEvent);
                proData.schedule[dayKey].classes.sort((a,b) => a.time.localeCompare(b.time));
                addedCount++;
            } else {
                conflictCount++;
                conflicts.push(`- ${day}: ${startTime}-${endTime} ${name}`);
            }
        });
        saveData();
        const currentTab = document.querySelector('.nav-btn.bg-white\\/10')?.dataset.tab || 'dashboard';
        changeTab(currentTab);
        let summaryMessage = `Import complete! ${addedCount} events added.`;
        if (conflictCount > 0) {
            summaryMessage += `\n\n${conflictCount} events had time conflicts and were not added:\n${conflicts.join('\n')}`;
        }
        alert(summaryMessage);
    };
    reader.readAsText(file);
    event.target.value = null;
}

function deleteImportedTimetable() {
    Object.keys(proData.schedule).forEach(dayKey => {
        proData.schedule[dayKey].classes = proData.schedule[dayKey].classes.filter(c => !c.isImported);
    });
    saveData();
    const currentTab = document.querySelector('.nav-btn.bg-white\\/10')?.dataset.tab || 'dashboard';
    changeTab(currentTab);
    alert("Imported schedule has been cleared.");
}

// --- MODAL LOGIC ---
let onConfirmCallback = null;
let onCancelCallback = null;

function showConfirmation(message, confirmCallback, cancelCallback = null) {
     document.getElementById('confirmation-message').textContent = message;
     onConfirmCallback = confirmCallback;
     onCancelCallback = cancelCallback;
     document.getElementById('confirmation-modal').classList.remove('hidden');
}

function hideConfirmation() {
     onConfirmCallback = null;
     onCancelCallback = null;
     document.getElementById('confirmation-modal').classList.add('hidden');
}

function openTaskModal() {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('task-date');
    dateInput.min = today;
    dateInput.value = today;
    document.getElementById('task-form').reset(); // Clear previous input
    dateInput.value = today; // Reset date to today after clearing
    
    updateAvailableTimes(); // Initial population of time slots
    document.getElementById('task-modal').classList.remove('hidden');
}

function closeTaskModal() {
    document.getElementById('task-modal').classList.add('hidden');
}

function updateAvailableTimes() {
    const dateInput = document.getElementById('task-date');
    const timeSelect = document.getElementById('task-time');
    const selectedDate = new Date(dateInput.value + 'T00:00:00');
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayKey = dayNames[selectedDate.getUTCDay()];
    
    timeSelect.innerHTML = '';
    
    if (dayKey === 'sunday') {
        timeSelect.innerHTML = '<option value="" disabled>No slots available on Sunday</option>';
        return;
    }

    const bookedSlots = [];
    const daySchedule = proData.schedule[dayKey];
    if (daySchedule) {
        [...daySchedule.classes, daySchedule.gym].forEach(event => {
            if (event && event.time && event.time.includes(' - ')) {
                const [startStr, endStr] = event.time.split(' - ');
                const startHour = parseInt(startStr.split(':')[0]);
                const endHour = parseInt(endStr.split(':')[0]);
                for (let hour = startHour; hour < endHour; hour++) {
                    bookedSlots.push(hour);
                }
            }
        });
    }

    const startHour = 8; // 8 AM
    const endHour = 18; // 6 PM
    let slotsAdded = 0;
    for (let hour = startHour; hour < endHour; hour++) {
        if (!bookedSlots.includes(hour)) {
            const timeSlot = `${String(hour).padStart(2, '0')}:00`;
            const option = document.createElement('option');
            option.value = timeSlot;
            option.textContent = `${timeSlot} - ${String(hour + 1).padStart(2, '0')}:00`;
            timeSelect.appendChild(option);
            slotsAdded++;
        }
    }

    if (slotsAdded === 0) {
        timeSelect.innerHTML = '<option value="" disabled>No available slots</option>';
    }
}

function handleAddTask(event) {
    event.preventDefault();
    const name = document.getElementById('task-name').value;
    const dateStr = document.getElementById('task-date').value;
    const time = document.getElementById('task-time').value;
    const location = document.getElementById('task-location').value;

    if (!name || !dateStr || !time) {
        alert("Please fill all required fields.");
        return;
    }

    const date = new Date(dateStr + 'T00:00:00');
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayKey = dayNames[date.getUTCDay()];

    const endTimeHour = parseInt(time.split(':')[0]) + 1;
    const newEvent = {
        id: `custom-${Date.now()}`,
        time: `${time} - ${String(endTimeHour).padStart(2, '0')}:00`,
        name: name,
        location: location || 'Custom Event'
    };

    proData.schedule[dayKey].classes.push(newEvent);
    proData.schedule[dayKey].classes.sort((a,b) => a.time.localeCompare(b.time));
    
    saveData();
    changeTab('calendar');
    closeTaskModal();
}

// --- Syncing ---
function updateSyncStatus(message, isSyncing = false) {
    const syncStatus = document.getElementById('sync-status');
    const syncIcon = document.getElementById('sync-icon');
    if (syncStatus) syncStatus.textContent = message;
    if (syncIcon) {
        if (isSyncing) {
            syncIcon.classList.add('syncing');
        } else {
            syncIcon.classList.remove('syncing');
        }
    }
}

async function checkInitialSyncStatus() {
    try {
        const response = await fetch(`${SYNC_API_URL}?userId=${userId}`);
        if (response.ok) {
            const remoteDataArray = await response.json();
             if (remoteDataArray.length > 0 && remoteDataArray[0].lastUpdated) {
                const remoteDate = new Date(remoteDataArray[0].lastUpdated);
                updateSyncStatus(`Synced: ${remoteDate.toLocaleTimeString()}`);
            } else {
                 updateSyncStatus("Not synced");
            }
        }
    } catch (error) {
        console.log("No initial remote data found.");
        updateSyncStatus("Not synced");
    }
}

async function syncData() {
    updateSyncStatus("Syncing...", true);
    
    try {
        // 1. Check for existing remote data using userId as a query parameter
        const findResponse = await fetch(`${SYNC_API_URL}?userId=${userId}`);
        if (!findResponse.ok) throw new Error(`Server error on find: ${findResponse.status}`);
        
        const remoteDataArray = await findResponse.json();
        const remoteData = remoteDataArray.length > 0 ? remoteDataArray[0] : null;
        const remoteRecordId = remoteData ? remoteData.id : null;

        // 2. Compare data and decide action
        if (remoteData && new Date(remoteData.lastUpdated) > new Date(proData.lastUpdated)) {
            // Remote is newer, ask user to download
            showConfirmation("Cloud data is newer. Overwrite local data?", () => {
                // The API response includes the API-level 'id', we don't want to store that locally.
                const { id, ...dataToSave } = remoteData;
                proData = dataToSave;
                saveData(); 
                initializeApp(); 
                updateSyncStatus("Synced from cloud", false);
            }, () => {
                // User cancelled the download, so we don't proceed to upload either.
                updateSyncStatus("Sync cancelled", false);
            });
            return; // Stop execution until user decides in the modal
        }

        // 3. Local is newer or no remote data, so upload
        const method = remoteRecordId ? 'PUT' : 'POST';
        const url = remoteRecordId ? `${SYNC_API_URL}/${remoteRecordId}` : SYNC_API_URL;
        const dataToUpload = { ...proData, userId: userId }; // Always ensure userId is in the payload

        const uploadResponse = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToUpload)
        });

        if (!uploadResponse.ok) throw new Error(`Failed to upload data: ${uploadResponse.statusText}`);

        const updatedRecord = await uploadResponse.json();
        proData.lastUpdated = updatedRecord.lastUpdated;
        saveData(); // Save the new timestamp locally
        updateSyncStatus(`Synced: Just now`, false);
    
    } catch (error) {
        console.error("Sync failed:", error);
        updateSyncStatus("Sync failed", false);
    }
}


// --- Initial Load & Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    // Directly show the main content, bypassing any login checks
    showMainContent();

    // Attach static modal listeners
    document.getElementById('confirm-btn').addEventListener('click', () => {
        if(onConfirmCallback) onConfirmCallback();
        hideConfirmation();
    });
    document.getElementById('cancel-btn').addEventListener('click', () => {
        if(onCancelCallback) onCancelCallback();
        hideConfirmation();
    });
    document.getElementById('task-date').addEventListener('change', updateAvailableTimes);
    document.getElementById('task-form').addEventListener('submit', handleAddTask);
    
    // Add mobile toggle listener
    const mobileToggleBtn = document.getElementById('mobile-toggle-btn');
    if (mobileToggleBtn) {
        mobileToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('mobile-view');
            const isMobileView = document.body.classList.contains('mobile-view');
            localStorage.setItem('mobile_view_enabled', isMobileView);
        });
    }
});

