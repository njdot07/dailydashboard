// ==========================================
// 1. Initializations & DOM Elements
// ==========================================
const quoteTextElement = document.getElementById('quote-text');
const quoteAuthorElement = document.getElementById('quote-author');
const newQuoteBtn = document.getElementById('new-quote-btn');

const hourHand = document.getElementById('hour-hand');
const minuteHand = document.getElementById('minute-hand');
const secondHand = document.getElementById('second-hand');
const analogClock = document.getElementById('analog-clock');
const clockSvg = document.getElementById('clock-svg');
const currentTimeDot = document.getElementById('current-time-dot');

const taskInput = document.getElementById('task-input');
const taskDuration = document.getElementById('task-duration');
const taskTime = document.getElementById('task-time');
const taskTimeEnd = document.getElementById('task-time-end');
const taskColor = document.getElementById('task-color');
const addTaskBtn = document.getElementById('add-task-btn');
const taskList = document.getElementById('task-list');

const thoughtInput = document.getElementById('thought-input');
const pinThoughtBtn = document.getElementById('pin-thought-btn');
const corkboardArea = document.getElementById('corkboard-area');

const gratitudeInput = document.getElementById('gratitude-input');
const addGratitudeBtn = document.getElementById('add-gratitude-btn');
const gratitudeList = document.getElementById('gratitude-list');

const toggleScreensaverBtn = document.getElementById('toggle-screensaver-btn');
const noteInput = document.getElementById('note-input');
const screensaverNoteText = document.getElementById('screensaver-note-text');
const noteSection = document.getElementById('note-section');

const taskDatePicker = document.getElementById('task-date-picker');

// Local-timezone date string helper (avoids UTC drift on .toISOString())
function localDateStr(d) {
    d = d || new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// State
let currentSelectedDate = localDateStr();
if (taskDatePicker) taskDatePicker.value = currentSelectedDate;

let userData = JSON.parse(localStorage.getItem('fs_user_data')) || {};

function generateId() {
    return Math.random().toString(36).substring(2, 12);
}

function migrateLegacyData(dateStr) {
    if (!userData[dateStr]) userData[dateStr] = { tasks: [], sections: [] };

    const oldTasks = JSON.parse(localStorage.getItem(`tasks_${dateStr}`));
    if (oldTasks) {
        oldTasks.forEach(t => { if(!t.id) t.id = generateId(); });
        userData[dateStr].tasks = oldTasks;
        localStorage.removeItem(`tasks_${dateStr}`);
    }
    const oldThoughts = JSON.parse(localStorage.getItem(`thoughts_${dateStr}`));
    if (oldThoughts) {
        oldThoughts.forEach(t => { if(!t.id) t.id = generateId(); });
        userData[dateStr].sections.push({ id: generateId(), title: "Sticky Notes", type: "sticky", items: oldThoughts });
        localStorage.removeItem(`thoughts_${dateStr}`);
    }
    const oldGratitude = JSON.parse(localStorage.getItem(`gratitude_${dateStr}`));
    if (oldGratitude) {
        oldGratitude.forEach(t => { if(!t.id) t.id = generateId(); });
        userData[dateStr].sections.push({ id: generateId(), title: "Gratitude Journal", type: "list", items: oldGratitude });
        localStorage.removeItem(`gratitude_${dateStr}`);
    }
}

// Initial Boot Migration across all localStorage keys
const legacyDates = new Set();
for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if(key.startsWith('tasks_') || key.startsWith('thoughts_') || key.startsWith('gratitude_')) {
        legacyDates.add(key.split('_')[1]);
    }
}
legacyDates.forEach(date => migrateLegacyData(date));
localStorage.setItem('fs_user_data', JSON.stringify(userData));

let tasks = [];
let thoughtSpaces = [];

function initDataForDate(dateStr) {
    if (!userData[dateStr]) {
        userData[dateStr] = {
            tasks: [],
            thoughtSpaces: [{
                id: generateId(),
                title: 'Thoughts Space',
                sections: [{ id: generateId(), title: 'Sticky Notes', type: 'sticky', items: [] }]
            }]
        };
        localStorage.setItem('fs_user_data', JSON.stringify(userData));
    } else if (userData[dateStr].sections && !userData[dateStr].thoughtSpaces) {
        // Migrate old flat sections to first thoughtSpace
        userData[dateStr].thoughtSpaces = [{
            id: generateId(),
            title: 'Thoughts Space',
            sections: userData[dateStr].sections
        }];
        delete userData[dateStr].sections;
        localStorage.setItem('fs_user_data', JSON.stringify(userData));
    }
    tasks = userData[dateStr].tasks;
    thoughtSpaces = userData[dateStr].thoughtSpaces;

    // Global Settings Initialization
    if (!userData.settings) {
        userData.settings = {
            quotesEnabled: true,
            dockEnabled: true,
            reminderOffset: 5,
            reminderIcon: '🔔',
            dockLinks: [
                { name: 'Teams', url: 'https://teams.microsoft.com', icon: '💬' },
                { name: 'Outlook', url: 'https://outlook.office.com', icon: '📧' },
                { name: 'Calendar', url: 'https://calendar.google.com', icon: '📅' },
                { name: 'Custom', url: '', icon: '🔗' }
            ]
        };
    }

    // ---- Smart Office OS additions ----
    if (!userData.settings.dashboardTone) userData.settings.dashboardTone = 'professional';

    if (!userData.settings.launchpadCategories) {
        // Migrate old flat dockLinks into a default "Work" category
        const migrated = (userData.settings.dockLinks || []).filter(l => l.url);
        userData.settings.launchpadCategories = [
            {
                id: generateId(),
                name: 'Work',
                open: true,
                links: migrated.length ? migrated : [
                    { name: 'Teams', url: 'https://teams.microsoft.com', icon: '💬' },
                    { name: 'Outlook', url: 'https://outlook.office.com', icon: '📧' }
                ]
            },
            {
                id: generateId(),
                name: 'Social',
                open: false,
                links: [
                    { name: 'YouTube', url: 'https://youtube.com', icon: '▶️' }
                ]
            }
        ];
    }

    if (!userData.pinnedNotes) userData.pinnedNotes = [];
    if (!userData.pinnedStickies) userData.pinnedStickies = []; // pinned from Library
    if (!userData.dashboardWidgets) userData.dashboardWidgets = {};
}

function sortTasks() {
    tasks.sort((a, b) => {
        if (!a.time && !b.time) return 0;
        if (!a.time) return 1;
        if (!b.time) return -1;
        return a.time.localeCompare(b.time);
    });
}

function loadData() {
    try {
        initDataForDate(currentSelectedDate);
        sortTasks();
        renderTasks();
        if (typeof renderNotesLibrary === 'function') renderNotesLibrary();
    } catch (e) {
        console.error('[loadData] Error:', e);
    }
}

function saveUserData() {
    localStorage.setItem('fs_user_data', JSON.stringify(userData));
    renderTasks();
    if (typeof renderNotesLibrary === 'function') renderNotesLibrary();
}

function saveTasks() { saveUserData(); }

if (taskDatePicker) {
    taskDatePicker.addEventListener('change', (e) => {
        currentSelectedDate = e.target.value || localDateStr();
        loadData();
    });
}


// ==========================================
// 2. Quote Module
// ==========================================
const quotes = [
    { text: "Logic will get you from A to B. Imagination will take you everywhere.", author: "Albert Einstein" },
    { text: "I've failed over and over and over again in my life. And that is why I succeed.", author: "Michael Jordan" },
    { text: "The biggest adventure you can take is to live the life of your dreams.", author: "Oprah Winfrey" },
    { text: "The only true wisdom is in knowing you know nothing.", author: "Socrates" },
    { text: "Nothing in life is to be feared, it is only to be understood.", author: "Marie Curie" },
    { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
    { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
    { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
    { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
    { text: "To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment.", author: "Ralph Waldo Emerson" },
    { text: "What you get by achieving your goals is not as important as what you become by achieving your goals.", author: "Zig Ziglar" },
    { text: "I attribute my success to this: I never gave or took any excuse.", author: "Florence Nightingale" },
    { text: "Every strike brings me closer to the next home run.", author: "Babe Ruth" },
    { text: "The journey of a thousand miles begins with one step.", author: "Lao Tzu" },
    { text: "Whether you think you can or you think you can't, you're right.", author: "Henry Ford" },
    { text: "The best way to predict your future is to create it.", author: "Abraham Lincoln" }
];

function getRandomQuote() {
    return quotes[Math.floor(Math.random() * quotes.length)];
}

function displayNewQuote() {
    if(!quoteTextElement) return;
    quoteTextElement.classList.add('fade-out');
    quoteAuthorElement.classList.add('fade-out');
    setTimeout(() => {
        const quote = getRandomQuote();
        quoteTextElement.textContent = `"${quote.text}"`;
        quoteAuthorElement.textContent = `- ${quote.author}`;
        quoteTextElement.classList.remove('fade-out');
        quoteAuthorElement.classList.remove('fade-out');
    }, 500);
}
if(newQuoteBtn) newQuoteBtn.addEventListener('click', displayNewQuote);
displayNewQuote();


// ==========================================
// 3. Clock Logic Module — Unified Component
// ==========================================
/**
 * ClockWidget — modular analog clock component.
 * Multiple instances can coexist; each owns its own DOM under a host container.
 * The global updateClock() loop continues to drive every instance via
 * .analog-clock querySelectorAll, so a single rAF tick advances all clocks.
 */
class ClockWidget {
    constructor(host, opts = {}) {
        if (!host) throw new Error('ClockWidget needs a host element');
        this.host = host;
        this.id = opts.id || host.id || ('clock-' + Math.random().toString(36).slice(2, 8));
        this.variant = opts.variant || 'default'; // 'default' | 'mini'
        this.render();
        this._buildMarkers();
    }

    render() {
        // Reuse existing host if it already contains an .analog-clock (idempotent)
        if (this.host.querySelector('.analog-clock')) {
            this.clockEl = this.host.querySelector('.analog-clock');
            return;
        }
        const wrap = document.createElement('div');
        wrap.className = 'analog-clock' + (this.variant === 'mini' ? ' mini-clock' : '');
        wrap.dataset.clockId = this.id;
        wrap.innerHTML = `
            <svg class="clock-svg" viewBox="-1 -1 2 2"></svg>
            <div class="hand hour-hand"></div>
            <div class="hand minute-hand"></div>
            <div class="hand second-hand"></div>
            <div class="center-dot"></div>
            <div class="current-time-dot"></div>
        `;
        this.host.appendChild(wrap);
        this.clockEl = wrap;
    }

    _buildMarkers() {
        const clock = this.clockEl;
        if (!clock || clock.dataset.markersBuilt === '1') return;
        for (let i = 0; i < 12; i++) {
            const marker = document.createElement('div');
            marker.className = i % 3 === 0 ? 'clock-marker major' : 'clock-marker';
            marker.style.transform = `rotate(${i * 30}deg)`;
            clock.appendChild(marker);

            if (i % 3 === 0) {
                const num = document.createElement('div');
                num.className = 'clock-number';
                num.textContent = i === 0 ? '12' : i;
                const angleRad = (i * 30 - 90) * (Math.PI / 180);
                const r = 90;
                const x = 125 + r * Math.cos(angleRad);
                const y = 125 + r * Math.sin(angleRad);
                num.style.left = `${x}px`;
                num.style.top = `${y - 12}px`;
                num.style.transform = `translate(-50%)`;
                clock.appendChild(num);
            }
        }
        clock.dataset.markersBuilt = '1';
    }

    destroy() {
        if (this.clockEl && this.clockEl.parentNode) {
            this.clockEl.parentNode.removeChild(this.clockEl);
        }
        this.clockEl = null;
    }
}

// Module-level registry of mounted clocks
const clockInstances = [];

function initClockMarkers() {
    // Mount a ClockWidget into every container marked with [data-clock-host]
    document.querySelectorAll('[data-clock-host]').forEach(host => {
        const variant = host.dataset.clockHost === 'schedule' ? 'mini' : 'default';
        const inst = new ClockWidget(host, { variant });
        clockInstances.push(inst);
    });
    // Backward-compat: pick up any pre-existing .analog-clock that wasn't mounted via host
    document.querySelectorAll('.analog-clock').forEach(el => {
        if (el.dataset.markersBuilt !== '1') {
            // Synthesise an instance to drive marker generation
            const fake = { host: el.parentElement || el, clockEl: el, _buildMarkers: ClockWidget.prototype._buildMarkers };
            ClockWidget.prototype._buildMarkers.call(fake);
        }
    });
}

function updateClock() {
    try {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();
        
        // 12 Hour clock Face Hands
        const hourDeg = (hours % 12 + minutes / 60) * 30; 
        const minuteDeg = (minutes * 6) + (seconds * 0.1);
        const secondDeg = seconds * 6;

        document.querySelectorAll('.hour-hand').forEach(h => h.style.transform = `rotate(${hourDeg}deg)`);
        document.querySelectorAll('.minute-hand').forEach(h => h.style.transform = `rotate(${minuteDeg}deg)`);
        document.querySelectorAll('.second-hand').forEach(h => h.style.transform = `rotate(${secondDeg}deg)`);
        
        // Current Time Green Dot
        const angleRad = (hourDeg - 90) * (Math.PI / 180);
        const r = 118; // strictly on perimeter
        const x = 125 + r * Math.cos(angleRad);
        const y = 125 + r * Math.sin(angleRad);
        
        document.querySelectorAll('.current-time-dot').forEach(dot => {
            dot.style.left = `${x}px`;
            dot.style.top = `${y}px`;
        });
    } catch(e) {
        console.error("Clock update error:", e);
    }

    requestAnimationFrame(updateClock);
}
initClockMarkers();
requestAnimationFrame(updateClock);


// ==========================================
// 4. Quick Tasks Module
// ==========================================
// Abandoning SVG red arc functionality as per request

// Modal Implementations
let taskEditIndex = -1;
let taskModalIsNew = false; // true when modal was opened for adding
function openTaskModal(index) {
    taskEditIndex = index;
    taskModalIsNew = false;
    const task = tasks[index];
    document.getElementById('modal-task-text').value = task.text;
    document.getElementById('modal-task-time').value = task.time || "";
    document.getElementById('modal-task-time-end').value = task.timeEnd || "";
    document.getElementById('modal-task-duration').value = task.duration || "";
    document.getElementById('task-edit-modal').classList.remove('hidden');
}

/** Open the task modal in "new task" mode, targeting the given date. */
function openAddTaskModalForDate(dateStr) {
    // Switch active date, load that day's tasks into the module-level `tasks` ref
    currentSelectedDate = dateStr;
    if (taskDatePicker) taskDatePicker.value = dateStr;
    initDataForDate(dateStr);

    // Push a blank task placeholder and open the edit modal on it
    tasks.push({ text: '', time: '', timeEnd: '', duration: '', color: '#ff4d4d', completed: false });
    taskEditIndex = tasks.length - 1;
    taskModalIsNew = true;

    document.getElementById('modal-task-text').value = '';
    document.getElementById('modal-task-time').value = '';
    document.getElementById('modal-task-time-end').value = '';
    document.getElementById('modal-task-duration').value = '';
    document.getElementById('task-edit-modal').classList.remove('hidden');
    setTimeout(() => {
        const input = document.getElementById('modal-task-text');
        if (input) input.focus();
    }, 50);
}

const modalCancelBtn = document.getElementById('modal-cancel-btn');
if(modalCancelBtn) {
    modalCancelBtn.addEventListener('click', () => {
        // If this was a "new task" modal that the user cancelled, drop the placeholder
        if (taskModalIsNew && taskEditIndex >= 0) {
            tasks.splice(taskEditIndex, 1);
            saveTasks();
        }
        taskModalIsNew = false;
        taskEditIndex = -1;
        document.getElementById('task-edit-modal').classList.add('hidden');
    });
}

const modalSaveBtn = document.getElementById('modal-save-btn');
if(modalSaveBtn) {
    modalSaveBtn.addEventListener('click', () => {
        if(taskEditIndex === -1) return;
        const nText = document.getElementById('modal-task-text').value.trim();

        if (taskModalIsNew && !nText) {
            // Don't save an empty new task; drop the placeholder
            tasks.splice(taskEditIndex, 1);
            saveTasks();
        } else {
            if(nText) tasks[taskEditIndex].text = nText;
            tasks[taskEditIndex].time = document.getElementById('modal-task-time').value;
            tasks[taskEditIndex].timeEnd = document.getElementById('modal-task-time-end').value;
            tasks[taskEditIndex].duration = document.getElementById('modal-task-duration').value.trim();
            sortTasks();
            saveTasks();
        }

        // Refresh month view if open so new task dots appear
        if (typeof renderMonthView === 'function' && scheduleView === 'month') {
            renderMonthView();
            if (monthSelectedDate) renderMonthPreview(monthSelectedDate);
        }

        taskModalIsNew = false;
        taskEditIndex = -1;
        document.getElementById('task-edit-modal').classList.add('hidden');
    });
}

// ==========================================
// Toast Notification Utility
// ==========================================
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `app-toast app-toast--${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    // Trigger enter animation
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('app-toast--show')));
    setTimeout(() => {
        toast.classList.remove('app-toast--show');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, 3000);
}

// ==========================================
// Section Navigation Hook
// ==========================================

/** Programmatically activate a sidebar tab by its data-target value */
function switchToTab(targetId) {
    try {
        const navBtns = document.querySelectorAll('.nav-btn[data-target]');
        const tabContents = document.querySelectorAll('.tab-content');
        navBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(t => t.classList.remove('active'));
        const targetBtn = document.querySelector(`.nav-btn[data-target="${targetId}"]`);
        const targetTab = document.getElementById(targetId);
        if (targetBtn) targetBtn.classList.add('active');
        if (targetTab) targetTab.classList.add('active');
    } catch(e) { /* non-fatal */ }
}

/** Remove section-focus from every section across all widgets */
function clearSectionFocus() {
    document.querySelectorAll('[data-section-id].section-focus').forEach(el => {
        el.classList.remove('section-focus');
    });
}

function navigateToLinkedSection(task) {
    try {
        if (!task.linkedSectionId) return;

        // 1. Validate — find space + section in live data
        let targetSpace = null;
        let targetSection = null;
        for (const space of thoughtSpaces) {
            const sec = space.sections.find(s => s.id === task.linkedSectionId);
            if (sec) { targetSpace = space; targetSection = sec; break; }
        }
        if (!targetSpace || !targetSection) {
            showToast('Linked section no longer exists.', 'warn');
            return;
        }

        // 2. Switch to the Notes tab
        switchToTab('tab-notes');

        // 3. Set active section in Library
        notesActiveSectionId = targetSection.id;

        // 4. Force a render of the library to show the selected section
        if (typeof renderNotesLibrary === 'function') {
            renderNotesLibrary();
        }
    } catch (err) {
        console.error('[navigateToLinkedSection] Error:', err);
    }
}

// ==========================================
// Link Modal (Task → Thought Section)
// Uses <optgroup> to group sections by Space
// Data stored in task.linkedSectionId / linkedSectionTitle / linkedSpaceTitle
// inside fs_user_data — no separate localStorage key.
// ==========================================
let noteLinkIndex = -1;
function openLinkModal(index) {
    noteLinkIndex = index;
    const select = document.getElementById('link-note-select');
    select.innerHTML = '<option value="">-- No Linked Section --</option>';

    thoughtSpaces.forEach(space => {
        const group = document.createElement('optgroup');
        group.label = space.title;
        space.sections.forEach(sec => {
            const opt = document.createElement('option');
            opt.value = sec.id;
            opt.dataset.title = sec.title;
            opt.dataset.spacetitle = space.title;
            opt.textContent = sec.title;
            if (tasks[index].linkedSectionId === sec.id) opt.selected = true;
            group.appendChild(opt);
        });
        if (group.children.length) select.appendChild(group);
    });

    document.getElementById('note-link-modal').classList.remove('hidden');
}

const linkCancelBtn = document.getElementById('link-cancel-btn');
if(linkCancelBtn) {
    linkCancelBtn.addEventListener('click', () => document.getElementById('note-link-modal').classList.add('hidden'));
}

const linkSaveBtn = document.getElementById('link-save-btn');
if(linkSaveBtn) {
    linkSaveBtn.addEventListener('click', () => {
        if(noteLinkIndex === -1) return;
        const select = document.getElementById('link-note-select');
        const val = select.value;
        if (val) {
            const selectedOpt = select.options[select.selectedIndex];
            tasks[noteLinkIndex].linkedSectionId = val;
            tasks[noteLinkIndex].linkedSectionTitle = selectedOpt.dataset.title;
            tasks[noteLinkIndex].linkedSpaceTitle = selectedOpt.dataset.spacetitle;
        } else {
            tasks[noteLinkIndex].linkedSectionId = null;
            tasks[noteLinkIndex].linkedSectionTitle = null;
            tasks[noteLinkIndex].linkedSpaceTitle = null;
        }
        document.getElementById('note-link-modal').classList.add('hidden');
        saveTasks();
    });
}

function renderTasks() {
    if(!taskList) return;
    taskList.innerHTML = '';
    
    document.querySelectorAll('.analog-clock').forEach(clock => {
        const oldDots = clock.querySelectorAll('.task-dot');
        oldDots.forEach(dot => dot.remove());
    });
    document.querySelectorAll('.clock-svg').forEach(svg => {
        svg.innerHTML = '';
    });

    tasks.forEach((task, index) => {
        const li = document.createElement('li');
        if (task.completed) li.classList.add('completed');
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = task.completed;
        checkbox.addEventListener('change', () => {
            tasks[index].completed = checkbox.checked;
            saveTasks();
        });

        const textWrapper = document.createElement('span');
        textWrapper.className = 'task-text';
        textWrapper.style.display = 'flex';
        textWrapper.style.alignItems = 'center';
        textWrapper.style.flex = "1";
        
        const textSpan = document.createElement('span');
        textSpan.textContent = task.text;
        textWrapper.appendChild(textSpan);
        
        if (task.linkedSectionId) {
            const linkBadge = document.createElement('span');
            linkBadge.className = 'link-badge';
            linkBadge.textContent = `📌 ${task.linkedSectionTitle || 'Linked'}`;
            linkBadge.title = `Go to: [${task.linkedSpaceTitle || ''}] ${task.linkedSectionTitle || ''} — click to jump`;
            linkBadge.style.cursor = 'pointer';
            linkBadge.addEventListener('click', (e) => { e.stopPropagation(); navigateToLinkedSection(task); });
            textWrapper.appendChild(linkBadge);
        }

        li.appendChild(checkbox);
        li.appendChild(textWrapper);

        if (task.duration) {
            const durationBadge = document.createElement('span');
            durationBadge.className = 'task-time-badge';
            durationBadge.style.marginRight = '5px';
            durationBadge.textContent = task.duration;
            li.appendChild(durationBadge);
        }

        if (task.time) {
            const timeBadge = document.createElement('span');
            timeBadge.className = 'task-time-badge';
            timeBadge.textContent = task.time + (task.timeEnd ? ` - ${task.timeEnd}` : '');
            li.appendChild(timeBadge);
            
            if (!task.completed) {
                try {
                    const taskColorHex = task.color || '#ff4d4d';
                    const [h, m] = task.time.split(':').map(Number);
                    const angleDeg = (h % 12 + m / 60) * 30;
                    
                    const dotWrapper = document.createElement('div');
                    dotWrapper.className = 'task-dot';
                    dotWrapper.style.background = taskColorHex;
                    dotWrapper.style.boxShadow = `0 0 8px ${taskColorHex}`;
                    
                    const angleRad = (angleDeg - 90) * (Math.PI / 180);
                    const r = 118; 
                    const x = 125 + r * Math.cos(angleRad);
                    const y = 125 + r * Math.sin(angleRad);
                    
                    document.querySelectorAll('.analog-clock').forEach(clock => {
                        const dotWrapper = document.createElement('div');
                        dotWrapper.className = 'task-dot';
                        dotWrapper.style.background = taskColorHex;
                        dotWrapper.style.boxShadow = `0 0 8px ${taskColorHex}`;
                        
                        dotWrapper.style.left = `${x}px`;
                        dotWrapper.style.top = `${y}px`;
                        
                        const tooltip = document.createElement('div');
                        tooltip.className = 'tooltip';
                        tooltip.textContent = task.text + " (" + task.time + ")";
                        dotWrapper.appendChild(tooltip);

                        clock.appendChild(dotWrapper);
                    });
                    
                    if (task.timeEnd) {
                        try {
                            const [hEnd, mEnd] = task.timeEnd.split(':').map(Number);
                            const angleEndDegRaw = (hEnd % 12 + mEnd / 60) * 30;
                            const angleEndRadRaw = (angleEndDegRaw - 90) * (Math.PI / 180);
                            
                            const endDotWrapper = document.createElement('div');
                            endDotWrapper.className = 'task-dot';
                            endDotWrapper.style.background = taskColorHex;
                            endDotWrapper.style.boxShadow = `0 0 8px ${taskColorHex}`;
                            
                            const xEndPix = 125 + r * Math.cos(angleEndRadRaw);
                            const yEndPix = 125 + r * Math.sin(angleEndRadRaw);
                            
                            document.querySelectorAll('.analog-clock').forEach(clock => {
                                const endDotWrapper = document.createElement('div');
                                endDotWrapper.className = 'task-dot';
                                endDotWrapper.style.background = taskColorHex;
                                endDotWrapper.style.boxShadow = `0 0 8px ${taskColorHex}`;
                                
                                endDotWrapper.style.left = `${xEndPix}px`;
                                endDotWrapper.style.top = `${yEndPix}px`;
                                
                                const endTooltip = document.createElement('div');
                                endTooltip.className = 'tooltip';
                                endTooltip.textContent = task.text + " (Ends " + task.timeEnd + ")";
                                endDotWrapper.appendChild(endTooltip);
            
                                clock.appendChild(endDotWrapper);
                            });
                            
                            document.querySelectorAll('.clock-svg').forEach(svg => {
                                let angleEndDeg = angleEndDegRaw;
                                let diff = angleEndDeg - angleDeg;
                                if (diff < 0) {
                                    angleEndDeg += 360;
                                    diff += 360;
                                }
                                
                                // Don't draw if difference is exactly 0
                                if (diff > 0.5) {
                                    const angleEndRad = (angleEndDeg - 90) * (Math.PI / 180);
                                    const radius = 0.944; // 118/125
                                    const x1 = radius * Math.cos(angleRad);
                                    const y1 = radius * Math.sin(angleRad);
                                    const x2 = radius * Math.cos(angleEndRad);
                                    const y2 = radius * Math.sin(angleEndRad);
                                    
                                    const largeArcFlag = diff > 180 ? 1 : 0;
                                    
                                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                                    path.setAttribute('class', 'task-arc');
                                    path.setAttribute('d', `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`);
                                    path.style.stroke = taskColorHex;
                                    
                                    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
                                    title.textContent = `${task.text} (${task.time} - ${task.timeEnd})`;
                                    path.appendChild(title);
                                    
                                    svg.appendChild(path);
                                }
                            });
                        } catch(e) {
                            console.error("Clock rendering mathematical fail for end time:", e);
                        }
                    }
                } catch(e) {
                    console.error("Clock rendering math failed for task:", e);
                }
            }
        }

        const actionsGroup = document.createElement('div');
        actionsGroup.className = 'task-actions';

        const linkBtn = document.createElement('button');
        const isLinked = !!task.linkedSectionId;
        linkBtn.className = 'task-icon-btn' + (isLinked ? ' task-icon-btn--linked' : '');
        linkBtn.textContent = '🔗';
        linkBtn.title = isLinked
            ? `Go to: [${task.linkedSpaceTitle || ''}] ${task.linkedSectionTitle} · Right-click to change`
            : 'Link a Thought Section to this task';
        // Left-click: navigate if linked, open modal if not
        linkBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isLinked) {
                navigateToLinkedSection(task);
            } else {
                openLinkModal(index);
            }
        });
        // Right-click: always open modal (to change / remove the link)
        linkBtn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openLinkModal(index);
        });

        const editBtnModal = document.createElement('button');
        editBtnModal.className = 'task-icon-btn';
        editBtnModal.textContent = '✏️';
        editBtnModal.title = 'Edit Task';
        editBtnModal.addEventListener('click', () => openTaskModal(index));

        const delBtn = document.createElement('button');
        delBtn.className = 'task-icon-btn task-icon-btn--delete';
        delBtn.textContent = '✖';
        delBtn.title = 'Delete Task';
        delBtn.addEventListener('click', () => {
            tasks.splice(index, 1);
            saveTasks();
        });

        actionsGroup.appendChild(linkBtn);
        actionsGroup.appendChild(editBtnModal);
        actionsGroup.appendChild(delBtn);
        
        li.appendChild(actionsGroup);

        taskList.appendChild(li);
    });
}

if(addTaskBtn) {
    addTaskBtn.addEventListener('click', () => {
        const text = taskInput.value.trim();
        if (!text) return;
        // Smart date: if Month View has a selected day, target that date
        if (typeof scheduleView !== 'undefined' && scheduleView === 'month' && monthSelectedDate) {
            currentSelectedDate = monthSelectedDate;
            if (taskDatePicker) taskDatePicker.value = monthSelectedDate;
            initDataForDate(currentSelectedDate);
        }
        const duration = taskDuration ? taskDuration.value.trim() : "";
        const time = taskTime.value;
        let timeEnd = taskTimeEnd ? taskTimeEnd.value : "";
        
        if (time && duration && !timeEnd) {
            let match = duration.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(h|min)/);
            if (!match) match = duration.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(m)/); // Handle "m" explicitly as well
            if (match) {
                let val = parseFloat(match[1]);
                let isHours = match[2].startsWith('h');
                let mins = isHours ? val * 60 : val;
                let [h, m] = time.split(':').map(Number);
                let totalMins = Math.round(h * 60 + m + mins);
                let newH = Math.floor(totalMins / 60) % 24;
                let newM = totalMins % 60;
                timeEnd = `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
            }
        }
        
        const color = taskColor ? taskColor.value : "#ff4d4d";
        
        tasks.push({ text, duration, time, timeEnd, color, completed: false });
        sortTasks();
        taskInput.value = '';
        if(taskDuration) taskDuration.value = '';
        if(taskTime) taskTime.value = '';
        if(taskTimeEnd) taskTimeEnd.value = '';
        saveTasks();
    });
}

if(taskInput) {
    taskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addTaskBtn.click();
    });
}

// ==========================================
// 5. Notes Navigation Logic
// ==========================================
// [Legacy module removed - moved to Structured Library]

// Initial Boot moved to DOMContentLoaded at bottom
// loadData();



// ==========================================
// 6. Screensaver Module
// ==========================================
const savedNote = localStorage.getItem('screensaverNote');
if (savedNote && noteInput) {
    noteInput.value = savedNote;
}

function toggleScreensaver(forceState) {
    const note = noteInput ? noteInput.value.trim() : '';
    if (note) {
        localStorage.setItem('screensaverNote', note);
        if(screensaverNoteText) screensaverNoteText.textContent = note;
    }
    
    let isNowActive = false;
    if(forceState !== undefined) {
        isNowActive = forceState;
    } else {
        isNowActive = !document.body.classList.contains('screensaver-active');
    }
    
    if (isNowActive) {
        document.body.classList.add('screensaver-active');
        localStorage.setItem('screensaverActive', 'true');
        if(note && noteSection) noteSection.classList.remove('hidden');
    } else {
        document.body.classList.remove('screensaver-active');
        localStorage.setItem('screensaverActive', 'false');
        if(noteSection) noteSection.classList.add('hidden');
    }
}

if(toggleScreensaverBtn) {
    toggleScreensaverBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleScreensaver();
    });
}

document.addEventListener('click', (e) => {
    if (document.body.classList.contains('screensaver-active')) {
        toggleScreensaver(false);
    }
});

if(noteInput) {
    noteInput.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    noteInput.addEventListener('keydown', (e) => {
        if(e.key === 'Enter') {
            toggleScreensaver(true);
        }
    });
}

// Restore saved activation state
if(localStorage.getItem('screensaverActive') === 'true') {
    toggleScreensaver(true);
}

// ==========================================
// 7. Tab & Theme Navigation Logic
// ==========================================
function initNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn[data-target]');
    const tabContents = document.querySelectorAll('.tab-content');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(t => t.classList.remove('active'));
            
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            const targetTab = document.getElementById(targetId);
            if(targetTab) targetTab.classList.add('active');
        });
    });
}
initNavigation();

const themeSelect = document.getElementById('theme-select');
const savedTheme = localStorage.getItem('theme-bg') || 'background.png';

function applyTheme(url) {
    if(url === 'custom') {
        const customUrl = prompt('Enter image URL for background:');
        if(customUrl) {
            document.documentElement.style.setProperty('--bg-url', `url('${customUrl}')`);
            localStorage.setItem('theme-bg', customUrl);
            themeSelect.value = 'custom';
        } else {
            themeSelect.value = savedTheme;
        }
    } else {
        document.documentElement.style.setProperty('--bg-url', `url('${url}')`);
        localStorage.setItem('theme-bg', url);
        if(themeSelect) themeSelect.value = url;
    }
}
applyTheme(savedTheme);

if(themeSelect) {
    themeSelect.addEventListener('change', (e) => {
        applyTheme(e.target.value);
    });
}

// ==========================================
// 8. Thoughts Toggle
// ==========================================
// [Obsolete thoughts toggle logic removed]

// ==========================================
// Section Focus Dismissal
// Clicking outside a focused section clears the spotlight
// ==========================================
document.addEventListener('click', (e) => {
    const focused = document.querySelector('[data-section-id].section-focus');
    if (!focused) return;
    // If the click was inside the focused section itself, keep focus
    if (focused.contains(e.target)) return;
    clearSectionFocus();
}, true); // use capture so it fires before child handlers

// ==========================================
// 9. Notes Library Module (Phase 1)
// Two-pane structured view of all sections
// ==========================================

let notesActiveSectionId = null;

/**
 * Returns a flat list of all sections from the first thoughtSpace
 * (which is the primary one in the current data model).
 * Sections from all spaces are included for the sidebar.
 */
function getAllLibrarySections() {
    const result = [];
    if (!thoughtSpaces || !thoughtSpaces.length) return result;
    // Flatten sections from ALL spaces, carrying a space reference
    thoughtSpaces.forEach(space => {
        if (space.sections) {
            space.sections.forEach(sec => {
                result.push({ section: sec, space });
            });
        }
    });
    return result;
}

/** Render/update the left sidebar section list */
function renderNotesSidebar() {
    const listEl = document.getElementById('notes-section-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const allSections = getAllLibrarySections();
    if (!allSections.length) {
        const empty = document.createElement('li');
        empty.style.cssText = 'padding:1rem 1.2rem;font-size:0.8rem;color:rgba(255,255,255,0.3);font-style:italic;';
        empty.textContent = 'No sections yet. Click ＋ to add one.';
        listEl.appendChild(empty);
        return;
    }

    allSections.forEach(({ section, space }) => {
        const li = document.createElement('li');
        li.className = 'notes-section-item' + (section.id === notesActiveSectionId ? ' active' : '');
        li.dataset.sectionId = section.id;

        const label = document.createElement('span');
        label.className = 'notes-section-item-label';
        label.textContent = section.title;

        // Action buttons (edit rename / delete)
        const actions = document.createElement('div');
        actions.className = 'notes-section-item-actions';

        const renameBtn = document.createElement('button');
        renameBtn.className = 'notes-sidebar-icon-btn';
        renameBtn.title = 'Rename section';
        renameBtn.textContent = '✏';
        renameBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            promptInline('Rename Section', (newName) => {
                section.title = newName;
                saveUserData();
                // If this section is active, update the right pane header too
                if (notesActiveSectionId === section.id) {
                    renderNotesContentPane(section, space);
                }
            });
        });

        const delBtn = document.createElement('button');
        delBtn.className = 'notes-sidebar-icon-btn notes-sidebar-icon-btn--delete';
        delBtn.title = 'Delete section';
        delBtn.textContent = '✖';
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`Delete section "${section.title}"? This cannot be undone.`)) {
                const idx = space.sections.indexOf(section);
                if (idx !== -1) space.sections.splice(idx, 1);
                // If deleted section was active, clear view
                if (notesActiveSectionId === section.id) {
                    notesActiveSectionId = null;
                    showNotesPlaceholder(true);
                }
                saveUserData();
            }
        });

        actions.appendChild(renameBtn);
        actions.appendChild(delBtn);
        li.appendChild(label);
        li.appendChild(actions);

        // Click = select this section
        li.addEventListener('click', () => {
            notesActiveSectionId = section.id;
            renderNotesSidebar();
            renderNotesContentPane(section, space);
        });

        listEl.appendChild(li);
    });
}

/** Toggle the placeholder vs the active section view */
function showNotesPlaceholder(show) {
    const placeholder = document.getElementById('notes-content-placeholder');
    const view = document.getElementById('notes-section-view');
    if (!placeholder || !view) return;
    if (show) {
        placeholder.style.display = '';
        view.classList.add('hidden');
    } else {
        placeholder.style.display = 'none';
        view.classList.remove('hidden');
    }
}

/** Render the right-pane content for a given section */
function renderNotesContentPane(section, space) {
    const view = document.getElementById('notes-section-view');
    if (!view) return;
    showNotesPlaceholder(false);
    view.innerHTML = '';

    // --- Header row ---
    const header = document.createElement('div');
    header.className = 'notes-view-header';

    const titleEl = document.createElement('span');
    titleEl.className = 'notes-view-title';
    titleEl.textContent = section.title;
    titleEl.title = 'Click to rename';
    titleEl.addEventListener('click', () => {
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.value = section.title;
        inp.style.cssText = 'font-size:1.3rem;font-family:"Playfair Display",serif;font-weight:600;background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.35);border-radius:4px;color:#fff;padding:2px 6px;outline:none;max-width:320px;';
        const commit = () => {
            const v = inp.value.trim();
            if (v) {
                section.title = v;
                saveUserData();
                // saveUserData triggers renderNotesSidebar which re-renders sidebar;
                // re-render content pane title directly:
                titleEl.textContent = v;
            }
            inp.replaceWith(titleEl);
        };
        inp.addEventListener('blur', commit);
        inp.addEventListener('keydown', e => {
            if (e.key === 'Enter') inp.blur();
            if (e.key === 'Escape') inp.replaceWith(titleEl);
        });
        titleEl.replaceWith(inp);
        inp.focus(); inp.select();
    });

    const hdrRight = document.createElement('div');
    hdrRight.style.cssText = 'display:flex;align-items:center;gap:0.6rem;';

    const typeBtn = document.createElement('button');
    typeBtn.className = 'notes-view-type-btn';
    typeBtn.textContent = section.type === 'sticky' ? '📋 Switch to List' : '📌 Switch to Sticky';
    typeBtn.title = `Currently: ${section.type === 'sticky' ? 'Sticky Notes' : 'List'}. Click to toggle.`;
    typeBtn.addEventListener('click', () => {
        section.type = section.type === 'sticky' ? 'list' : 'sticky';
        saveUserData();
        renderNotesContentPane(section, space);
    });

    hdrRight.appendChild(typeBtn);
    header.appendChild(titleEl);
    header.appendChild(hdrRight);
    view.appendChild(header);

    // --- Input row ---
    const inputRow = document.createElement('div');
    inputRow.className = 'notes-view-input-row';
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.placeholder = section.type === 'sticky' ? 'Add a sticky note...' : 'Add a list item...';
    const addBtn = document.createElement('button');
    addBtn.className = 'primary-btn small-btn';
    addBtn.textContent = 'Add';
    const doAdd = () => {
        const val = inp.value.trim();
        if (!val) return;
        section.items.push({ id: generateId(), text: val });
        inp.value = '';
        saveUserData();
        renderNotesContentPane(section, space);
    };
    addBtn.addEventListener('click', doAdd);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') doAdd(); });
    inputRow.appendChild(inp);
    inputRow.appendChild(addBtn);
    view.appendChild(inputRow);

    // --- Items area ---
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'notes-view-items';

    if (!section.items || !section.items.length) {
        const empty = document.createElement('p');
        empty.style.cssText = 'color:rgba(255,255,255,0.3);font-size:0.85rem;font-style:italic;margin-top:1rem;';
        empty.textContent = 'No entries yet. Add one above!';
        itemsContainer.appendChild(empty);
    } else if (section.type === 'sticky') {
        const grid = document.createElement('div');
        grid.className = 'notes-view-sticky-grid';
        section.items.forEach((item, iIdx) => {
            if (item.rotation === undefined) item.rotation = (Math.random() * 4 - 2).toFixed(1);
            const postIt = document.createElement('div');
            postIt.className = 'post-it';
            postIt.style.transform = `rotate(${item.rotation}deg)`;
            postIt.style.position = 'relative';

            const textSpan = document.createElement('span');
            textSpan.textContent = item.text;

            const actions = document.createElement('div');
            actions.className = 'item-actions item-actions--sticky';

            // Pin to Dashboard button
            const pinBtn = document.createElement('button');
            const isPinned = !!(userData.pinnedStickies || []).find(p => p.sourceId === item.id);
            pinBtn.className = 'item-icon-btn item-icon-btn--sticky item-icon-btn--pin' + (isPinned ? ' is-pinned' : '');
            pinBtn.textContent = isPinned ? '📍' : '📌';
            pinBtn.title = isPinned ? 'Unpin from Dashboard' : 'Pin to Dashboard';
            pinBtn.addEventListener('click', () => {
                togglePinStickyToDashboard(item);
                renderNotesContentPane(section, space);
            });
            actions.appendChild(pinBtn);

            const editBtn = document.createElement('button');
            editBtn.className = 'item-icon-btn item-icon-btn--sticky';
            editBtn.textContent = '✏️';
            editBtn.title = 'Edit';
            editBtn.addEventListener('click', () => {
                const ta = document.createElement('textarea');
                ta.value = item.text;
                ta.className = 'notes-edit-textarea notes-edit-textarea--sticky';
                // Debounced auto-save: persists 1s after user stops typing
                const debouncedSave = debounce(() => {
                    section.items[iIdx].text = ta.value;
                    localStorage.setItem('fs_user_data', JSON.stringify(userData));
                }, 1000);
                ta.addEventListener('input', debouncedSave);
                ta.addEventListener('blur', () => {
                    section.items[iIdx].text = ta.value;
                    saveUserData();
                    renderNotesContentPane(section, space);
                });
                textSpan.replaceWith(ta); ta.focus();
            });

            const delBtn = document.createElement('button');
            delBtn.className = 'item-icon-btn item-icon-btn--sticky item-icon-btn--delete';
            delBtn.textContent = '✖';
            delBtn.title = 'Delete';
            delBtn.addEventListener('click', () => { section.items.splice(iIdx, 1); saveUserData(); renderNotesContentPane(section, space); });

            actions.appendChild(editBtn); actions.appendChild(delBtn);
            postIt.appendChild(textSpan); postIt.appendChild(actions);
            grid.appendChild(postIt);
        });
        itemsContainer.appendChild(grid);
    } else {
        // List type
        section.items.forEach((item, iIdx) => {
            const row = document.createElement('div');
            row.className = 'notes-view-list-item';

            const textSpan = document.createElement('span');
            textSpan.textContent = item.text;

            const actions = document.createElement('div');
            actions.className = 'item-actions';

            const editBtn = document.createElement('button');
            editBtn.className = 'item-icon-btn';
            editBtn.textContent = '✏️';
            editBtn.title = 'Edit';
            editBtn.addEventListener('click', () => {
                const ta = document.createElement('textarea');
                ta.value = item.text;
                ta.className = 'notes-edit-textarea';
                // Debounced auto-save (1s)
                const debouncedSave = debounce(() => {
                    section.items[iIdx].text = ta.value;
                    localStorage.setItem('fs_user_data', JSON.stringify(userData));
                }, 1000);
                ta.addEventListener('input', debouncedSave);
                ta.addEventListener('blur', () => {
                    section.items[iIdx].text = ta.value;
                    saveUserData();
                    renderNotesContentPane(section, space);
                });
                textSpan.replaceWith(ta); ta.focus();
            });

            const delBtn = document.createElement('button');
            delBtn.className = 'item-icon-btn item-icon-btn--delete';
            delBtn.textContent = '✖';
            delBtn.title = 'Delete';
            delBtn.addEventListener('click', () => { section.items.splice(iIdx, 1); saveUserData(); renderNotesContentPane(section, space); });

            actions.appendChild(editBtn); actions.appendChild(delBtn);
            row.appendChild(textSpan); row.appendChild(actions);
            itemsContainer.appendChild(row);
        });
    }

    view.appendChild(itemsContainer);
}

/** Full re-render of the Notes Library (sidebar + content pane if active section still exists) */
function renderNotesLibrary() {
    renderNotesSidebar();
    if (notesActiveSectionId) {
        const all = getAllLibrarySections();
        const found = all.find(({ section }) => section.id === notesActiveSectionId);
        if (found) {
            renderNotesContentPane(found.section, found.space);
        } else {
            notesActiveSectionId = null;
            showNotesPlaceholder(true);
        }
    }
}

// Hook the ＋ button in the notes sidebar header
const notesAddSectionBtn = document.getElementById('notes-add-section-btn');
if (notesAddSectionBtn) {
    notesAddSectionBtn.addEventListener('click', () => {
        promptInline('New Section Name', (name) => {
            // Always add to the first thought space
            if (!thoughtSpaces.length) {
                thoughtSpaces.push({
                    id: generateId(),
                    title: 'Notes Space',
                    sections: [],
                    visible: false
                });
            }
            const newSec = { id: generateId(), title: name, type: 'list', items: [] };
            thoughtSpaces[0].sections.push(newSec);
            saveUserData();
            // Auto-select the new section
            notesActiveSectionId = newSec.id;
            renderNotesSidebar();
            renderNotesContentPane(newSec, thoughtSpaces[0]);
        });
    });
}

// ==========================================
// 8. Hub Logic Module (Quotes, Dock, Reminders)
// ==========================================

function initHubFeatures() {
    initQuoteToggle();
    initDockLogic();
    initReminderLogic();
    
    // Request Notification Permission on Load
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
    }
}

// --- Quotes ---
function initQuoteToggle() {
    const toggle = document.getElementById('quote-toggle');
    const quoteHeader = document.querySelector('.header-quote');
    if (!toggle || !quoteHeader) return;

    toggle.checked = userData.settings.quotesEnabled;
    quoteHeader.style.display = userData.settings.quotesEnabled ? 'block' : 'none';

    toggle.addEventListener('change', () => {
        userData.settings.quotesEnabled = toggle.checked;
        quoteHeader.style.display = toggle.checked ? 'block' : 'none';
        saveUserData();
    });
}

// --- Floating Launchpad Dock — visibility-toggleable, sits above all layers ---
function initDockLogic() {
    const toggle = document.getElementById('dock-toggle');
    const dock = document.getElementById('launchpad-dock');
    if (!toggle || !dock) return;

    // Honor saved setting (default: enabled)
    if (typeof userData.settings.dockEnabled !== 'boolean') {
        userData.settings.dockEnabled = true;
    }
    toggle.checked = userData.settings.dockEnabled;
    dock.classList.toggle('hidden', !userData.settings.dockEnabled);
    dock.style.zIndex = '9999'; // always on top

    toggle.addEventListener('change', () => {
        userData.settings.dockEnabled = toggle.checked;
        dock.classList.toggle('hidden', !toggle.checked);
        saveUserData();
        renderFloatingDock();
    });

    renderFloatingDock();
}

/** Render the bottom floating dock from launchpadCategories (flattened) */
function renderFloatingDock() {
    const dock = document.getElementById('launchpad-dock');
    if (!dock) return;
    dock.innerHTML = '';
    const cats = (userData.settings && userData.settings.launchpadCategories) || [];
    cats.forEach(cat => {
        (cat.links || []).forEach(link => {
            if (!link.url) return;
            const a = document.createElement('a');
            a.href = link.url;
            a.target = '_blank';
            a.rel = 'noopener';
            a.className = 'dock-item';
            a.innerHTML = `<span>${escapeHtml(link.icon || '🔗')}</span><div class="tooltip">${escapeHtml(link.name || '')}</div>`;
            dock.appendChild(a);
        });
    });
}

// --- Smart Reminders ---
let lastAlertedTaskId = null;

function initReminderLogic() {
    const offsetSelect = document.getElementById('reminder-offset');
    const iconInput = document.getElementById('reminder-icon');
    if (offsetSelect) {
        offsetSelect.value = userData.settings.reminderOffset;
        offsetSelect.addEventListener('change', () => {
            userData.settings.reminderOffset = parseInt(offsetSelect.value);
            saveUserData();
        });
    }
    if (iconInput) {
        iconInput.value = userData.settings.reminderIcon;
        iconInput.addEventListener('input', () => {
            userData.settings.reminderIcon = iconInput.value;
            saveUserData();
        });
    }

    // Start checking intervals
    setInterval(updateNextTaskWidget, 1000 * 30); // Every 30s
    setInterval(checkReminders, 1000 * 60); // Every 1m
    updateNextTaskWidget();
}

function updateNextTaskWidget() {
    const container = document.getElementById('next-task-container');
    const titleEl = document.getElementById('next-task-title');
    const timeEl = document.getElementById('next-task-time');
    const iconEl = document.getElementById('next-task-icon');
    if (!container || !tasks) return;

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    // Find first incomplete task that hasn't started yet
    const nextTask = tasks.find(t => {
        if (t.completed || !t.time) return false;
        const [h, m] = t.time.split(':').map(Number);
        return (h * 60 + m) > nowMinutes;
    });

    if (nextTask) {
        container.classList.remove('hidden');
        titleEl.textContent = nextTask.text;
        timeEl.textContent = nextTask.time;
        
        // If icon is a URL, show image, else show emoji
        const icon = userData.settings.reminderIcon || '🔔';
        if (icon.startsWith('http')) {
            iconEl.innerHTML = `<img src="${icon}" style="width: 40px; height: 40px; border-radius: 50%;">`;
        } else {
            iconEl.textContent = icon;
        }
    } else {
        container.classList.add('hidden');
    }
}

function checkReminders() {
    if (!tasks) return;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const offset = userData.settings.reminderOffset || 0;

    tasks.forEach(task => {
        if (task.completed || !task.time) return;
        const [h, m] = task.time.split(':').map(Number);
        const taskMinutes = h * 60 + m;
        
        // If current time is exactly (taskTime - offset)
        if (nowMinutes === (taskMinutes - offset) && lastAlertedTaskId !== task.id) {
            triggerReminderAlert(task);
            lastAlertedTaskId = task.id;
        }
    });
}

function triggerReminderAlert(task) {
    const icon = userData.settings.reminderIcon || '🔔';
    const widget = document.getElementById('next-task-container');
    if (widget) widget.classList.add('pulse');
    
    const message = `"${task.text}" starts in ${userData.settings.reminderOffset} minutes!`;
    const title = `Office OS Reminder ${icon}`;

    // Native Browser Notification
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, {
            body: message,
            icon: icon.startsWith('http') ? icon : undefined,
            badge: icon.startsWith('http') ? icon : undefined
        });
    } else {
        // Fallback to alert if notifications aren't supported or allowed
        alert(`${icon} REMINDER: ${message}`);
    }
    
    setTimeout(() => {
        if (widget) widget.classList.remove('pulse');
    }, 10000);
}

// ==========================================
// 10. Persona Engine — Tone-aware Status Bar
// ==========================================
const TONE_TEMPLATES = {
    professional: {
        idle: 'No upcoming items. Your schedule is clear.',
        next: (t, time) => `Your next meeting is "${t}" at ${time}.`,
        icon: '📋'
    },
    motivational: {
        idle: "Today is yours — let's make it count! 💪",
        next: (t, time) => `🔥 Next up: "${t}" at ${time}. You've got this!`,
        icon: '🚀'
    },
    minimalist: {
        idle: '— clear —',
        next: (t, time) => `${time}  ·  ${t}`,
        icon: '·'
    },
    friendly: {
        idle: "Nothing on the schedule — chill vibes only ✌️",
        next: (t, time) => `Hey! "${t}" coming up at ${time} 😊`,
        icon: '✨'
    }
};

function updateStatusBar() {
    const textEl = document.getElementById('status-bar-text');
    const iconEl = document.getElementById('status-bar-icon');
    if (!textEl || !iconEl) return;

    const tone = userData.settings.dashboardTone || 'professional';
    const tpl = TONE_TEMPLATES[tone] || TONE_TEMPLATES.professional;

    // Find next upcoming task (today only)
    const todayStr = localDateStr();
    const todayData = userData[todayStr];
    const todayTasks = todayData ? (todayData.tasks || []) : [];

    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const next = todayTasks
        .filter(t => !t.completed && t.time)
        .sort((a, b) => a.time.localeCompare(b.time))
        .find(t => {
            const [h, m] = t.time.split(':').map(Number);
            return (h * 60 + m) >= nowMin;
        });

    iconEl.textContent = tpl.icon;
    textEl.textContent = next ? tpl.next(next.text, next.time) : tpl.idle;
}

function initToneSelector() {
    const sel = document.getElementById('tone-select');
    if (!sel) return;
    sel.value = userData.settings.dashboardTone || 'professional';
    sel.addEventListener('change', () => {
        userData.settings.dashboardTone = sel.value;
        saveUserData();
        updateStatusBar();
    });
}

// ==========================================
// 11. Spatial Dashboard — Snap-to-Grid Drag Engine
// ==========================================
// Grid: 200px cells, 25px gap, 225px stride
const GRID_CELL = 200;
const GRID_GAP = 25;
const STRIDE = GRID_CELL + GRID_GAP; // 225
const SIZES = ['small', 'medium', 'large'];
const DEFAULT_SIZES = {
    'status-bar':   'medium',
    'clock':        'large',
    'pinned-notes': 'large',
    'launchpad':    'medium'
};
let topZ = 100;

// Default starting positions (in px) for each known widget id.
const DEFAULT_WIDGET_POSITIONS = {
    'status-bar':   { x: 25,  y: 25,  z: 100 },
    'clock':        { x: 25,  y: 250, z: 101 },
    'pinned-notes': { x: 475, y: 250, z: 102 },
    'launchpad':    { x: 25,  y: 700, z: 103 }
};

function getWidgetPositions() {
    if (!userData.dashboardWidgets) userData.dashboardWidgets = {};
    return userData.dashboardWidgets;
}

function persistWidgetPositions() {
    localStorage.setItem('fs_user_data', JSON.stringify(userData));
}

function applyWidgetPosition(el) {
    const id = el.dataset.widgetId;
    const positions = getWidgetPositions();
    const pos = positions[id] || DEFAULT_WIDGET_POSITIONS[id] || { x: 25, y: 25, z: ++topZ };
    el.style.left = pos.x + 'px';
    el.style.top  = pos.y + 'px';
    el.style.zIndex = pos.z || 100;
    if (pos.z && pos.z > topZ) topZ = pos.z;

    // Apply size preset (from saved state, default, or existing class)
    const savedSize = pos.size || DEFAULT_SIZES[id] || (id && id.startsWith('pin-sticky-') ? 'small' : 'medium');
    SIZES.forEach(s => el.classList.remove('size-' + s));
    el.classList.add('size-' + savedSize);
}

function applyAllWidgetPositions() {
    document.querySelectorAll('#dashboard-grid .dash-widget').forEach(applyWidgetPosition);
}

function cycleWidgetSize(el) {
    const id = el.dataset.widgetId;
    const positions = getWidgetPositions();
    const cur = positions[id] && positions[id].size
        ? positions[id].size
        : (DEFAULT_SIZES[id] || (id.startsWith('pin-sticky-') ? 'small' : 'medium'));
    const next = SIZES[(SIZES.indexOf(cur) + 1) % SIZES.length];
    SIZES.forEach(s => el.classList.remove('size-' + s));
    el.classList.add('size-' + next);
    if (!positions[id]) positions[id] = { x: parseInt(el.style.left, 10) || 25, y: parseInt(el.style.top, 10) || 25, z: ++topZ };
    positions[id].size = next;
    persistWidgetPositions();
}

/**
 * Pointer-based snap-to-grid drag.
 * Only attaches to the .drag-handle, so widget body clicks (buttons,
 * inputs, links) are never intercepted.
 */
function snapToGrid(v) {
    // Snap to the 25px-gap inset of each 225px stride cell
    return Math.max(GRID_GAP, Math.round((v - GRID_GAP) / STRIDE) * STRIDE + GRID_GAP);
}

function makeWidgetDraggable(el) {
    if (el.dataset.dragBound === '1') return;
    const handle = el.querySelector('.drag-handle');
    if (!handle) return;
    el.dataset.dragBound = '1';

    handle.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();

        const canvas = el.parentElement; // #dashboard-grid
        // Cache the canvas rect ONCE per drag — rAF reads stale values otherwise
        // and recomputing per move was the main source of jank.
        const parentRect = canvas.getBoundingClientRect();
        const startScrollX = canvas.parentElement ? canvas.parentElement.scrollLeft : 0;
        const startScrollY = canvas.parentElement ? canvas.parentElement.scrollTop  : 0;
        const rect = el.getBoundingClientRect();
        const offX = e.clientX - rect.left;
        const offY = e.clientY - rect.top;

        topZ++;
        el.style.zIndex = topZ;
        el.classList.add('dragging');
        try { handle.setPointerCapture(e.pointerId); } catch(_) {}

        // rAF-throttled pointer state
        let pendingX = parseInt(el.style.left, 10) || 0;
        let pendingY = parseInt(el.style.top,  10) || 0;
        let rafId = 0;
        let needsFrame = false;

        const flush = () => {
            rafId = 0;
            needsFrame = false;
            // Free movement: no clamp, no snap, no collision detection during drag.
            // Final snap happens once on pointerup.
            el.style.left = pendingX + 'px';
            el.style.top  = pendingY + 'px';
        };

        const onMove = (ev) => {
            // Account for any in-flight scroll of the dashboard viewport.
            const scroller = canvas.parentElement;
            const scrollDX = scroller ? (scroller.scrollLeft - startScrollX) : 0;
            const scrollDY = scroller ? (scroller.scrollTop  - startScrollY) : 0;
            pendingX = ev.clientX - parentRect.left - offX + scrollDX;
            pendingY = ev.clientY - parentRect.top  - offY + scrollDY;
            if (!needsFrame) {
                needsFrame = true;
                rafId = requestAnimationFrame(flush);
            }
        };

        const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            if (rafId) cancelAnimationFrame(rafId);
            el.classList.remove('dragging');
            try { handle.releasePointerCapture(e.pointerId); } catch(_) {}

            // Final snap-to-grid + soft clamp on drop
            let finalX = snapToGrid(Math.max(GRID_GAP, pendingX));
            let finalY = snapToGrid(Math.max(GRID_GAP, pendingY));
            el.style.left = finalX + 'px';
            el.style.top  = finalY + 'px';

            const positions = getWidgetPositions();
            const id = el.dataset.widgetId;
            const cur = positions[id] || {};
            positions[id] = {
                x: finalX,
                y: finalY,
                z: topZ,
                size: cur.size || DEFAULT_SIZES[id] || (id.startsWith('pin-sticky-') ? 'small' : 'medium')
            };
            persistWidgetPositions();
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    });

    // Resize handle (cycles S → M → L)
    const resizeBtn = el.querySelector('.resize-handle');
    if (resizeBtn) {
        resizeBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            cycleWidgetSize(el);
        });
    }
}

function initSpatialDashboard() {
    applyAllWidgetPositions();
    document.querySelectorAll('#dashboard-grid .dash-widget').forEach(makeWidgetDraggable);
    initDashboardScrollPersistence();
    initReactiveResize();
}

// ==========================================
// 11b. Scroll persistence
// ==========================================
function initDashboardScrollPersistence() {
    const scroller = document.getElementById('dashboard-scroll');
    if (!scroller) return;

    const saved = userData.dashboardScroll || { x: 0, y: 0 };
    requestAnimationFrame(() => {
        scroller.scrollLeft = saved.x || 0;
        scroller.scrollTop  = saved.y || 0;
    });

    const saveScroll = debounce(() => {
        userData.dashboardScroll = {
            x: scroller.scrollLeft,
            y: scroller.scrollTop
        };
        localStorage.setItem('fs_user_data', JSON.stringify(userData));
    }, 250);
    scroller.addEventListener('scroll', saveScroll);
}

// ==========================================
// 11c. Reactive Resize — ResizeObserver drives proportional scaling
// ==========================================
function initReactiveResize() {
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(entries => {
        for (const entry of entries) {
            const el = entry.target;
            const w = entry.contentRect.width;
            const h = entry.contentRect.height;
            // Expose live dimensions as CSS vars so child elements (e.g. clock,
            // notes text) can scale via clamp() / calc() without JS layout reads.
            el.style.setProperty('--w', w + 'px');
            el.style.setProperty('--h', h + 'px');
            // For the clock widget: scale the inner 250px clock face to fill
            const clockEl = el.querySelector('.analog-clock');
            if (clockEl) {
                const target = Math.min(w, h) - 24; // padding allowance
                const scale = Math.max(0.4, target / 256); // base face is 256
                clockEl.style.transform = `scale(${scale})`;
                clockEl.style.transformOrigin = 'center center';
            }
        }
    });
    document.querySelectorAll('#dashboard-grid .dash-widget').forEach(el => ro.observe(el));
    // Re-observe new pinned-sticky widgets when they appear
    window.__dashResizeObserver = ro;
}

// ==========================================
// 11d. Schedule Clock — draggable + persisted coordinates
// ==========================================
function initScheduleClockPersistence() {
    const host = document.getElementById('schedule-clock-host');
    if (!host) return;

    // Restore saved position
    const pos = userData.scheduleClockPos || null;
    if (pos) {
        host.style.left  = pos.x + 'px';
        host.style.top   = pos.y + 'px';
        host.style.right = 'auto';
    }

    let dragState = null;
    host.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        // Don't start drag on inner elements that consume clicks
        if (e.target.closest('button, input, a')) return;
        e.preventDefault();
        const rect = host.getBoundingClientRect();
        const parentRect = host.parentElement.getBoundingClientRect();
        dragState = {
            offX: e.clientX - rect.left,
            offY: e.clientY - rect.top,
            parentRect,
            pendingX: rect.left - parentRect.left,
            pendingY: rect.top  - parentRect.top,
            rafId: 0
        };
        try { host.setPointerCapture(e.pointerId); } catch (_) {}
    });
    host.addEventListener('pointermove', (e) => {
        if (!dragState) return;
        dragState.pendingX = e.clientX - dragState.parentRect.left - dragState.offX;
        dragState.pendingY = e.clientY - dragState.parentRect.top  - dragState.offY;
        if (!dragState.rafId) {
            dragState.rafId = requestAnimationFrame(() => {
                if (!dragState) return;
                host.style.left  = dragState.pendingX + 'px';
                host.style.top   = dragState.pendingY + 'px';
                host.style.right = 'auto';
                dragState.rafId = 0;
            });
        }
    });
    const endDrag = (e) => {
        if (!dragState) return;
        userData.scheduleClockPos = {
            x: parseInt(host.style.left, 10) || 0,
            y: parseInt(host.style.top,  10) || 0
        };
        localStorage.setItem('fs_user_data', JSON.stringify(userData));
        try { host.releasePointerCapture(e.pointerId); } catch(_) {}
        dragState = null;
    };
    host.addEventListener('pointerup', endDrag);
    host.addEventListener('pointercancel', endDrag);
}

// ==========================================
// 12. Pinned Notes Widget
// ==========================================
function renderPinnedNotes() {
    const list = document.getElementById('pinned-notes-list');
    if (!list) return;
    list.innerHTML = '';
    (userData.pinnedNotes || []).forEach((note, idx) => {
        const li = document.createElement('li');
        const text = document.createElement('div');
        text.className = 'pn-text';
        text.textContent = note.text;
        text.title = 'Click to edit';
        text.addEventListener('click', () => {
            const ta = document.createElement('textarea');
            ta.className = 'pn-text';
            ta.value = note.text;
            text.replaceWith(ta);
            ta.focus();
            // Debounced auto-save
            const debounced = debounce(() => {
                userData.pinnedNotes[idx].text = ta.value;
                localStorage.setItem('fs_user_data', JSON.stringify(userData));
            }, 1000);
            ta.addEventListener('input', debounced);
            ta.addEventListener('blur', () => {
                userData.pinnedNotes[idx].text = ta.value;
                localStorage.setItem('fs_user_data', JSON.stringify(userData));
                renderPinnedNotes();
            });
        });

        const del = document.createElement('button');
        del.className = 'item-icon-btn item-icon-btn--delete';
        del.textContent = '✖';
        del.title = 'Delete pinned note';
        del.addEventListener('click', () => {
            userData.pinnedNotes.splice(idx, 1);
            localStorage.setItem('fs_user_data', JSON.stringify(userData));
            renderPinnedNotes();
        });

        li.appendChild(text);
        li.appendChild(del);
        list.appendChild(li);
    });
}

function initPinnedNotes() {
    const input = document.getElementById('pinned-note-input');
    const btn = document.getElementById('pinned-note-add');
    if (!input || !btn) return;
    const add = () => {
        const v = input.value.trim();
        if (!v) return;
        userData.pinnedNotes.push({ id: generateId(), text: v });
        input.value = '';
        localStorage.setItem('fs_user_data', JSON.stringify(userData));
        renderPinnedNotes();
    };
    btn.addEventListener('click', add);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
    renderPinnedNotes();
}

// ==========================================
// 13. Categorized Launchpad
// ==========================================
function renderLaunchpadWidget() {
    const container = document.getElementById('launchpad-categories');
    if (!container) return;
    container.innerHTML = '';
    const cats = userData.settings.launchpadCategories || [];
    if (!cats.length) {
        container.innerHTML = '<p style="opacity:0.5;font-size:0.85rem;">No categories yet. Add some in Settings.</p>';
        return;
    }
    cats.forEach((cat) => {
        const wrap = document.createElement('div');
        wrap.className = 'launchpad-category' + (cat.open ? ' open' : '');

        const header = document.createElement('div');
        header.className = 'launchpad-category-header';
        header.innerHTML = `<span>📁</span><span>${escapeHtml(cat.name)}</span><span class="launchpad-category-toggle">▶</span>`;
        header.addEventListener('click', () => {
            cat.open = !cat.open;
            wrap.classList.toggle('open', cat.open);
            saveUserData();
        });

        const body = document.createElement('div');
        body.className = 'launchpad-category-body';
        cat.links.forEach(link => {
            if (!link.url) return;
            const a = document.createElement('a');
            a.className = 'launchpad-link';
            a.href = link.url;
            a.target = '_blank';
            a.rel = 'noopener';
            a.innerHTML = `<span class="lp-icon">${escapeHtml(link.icon || '🔗')}</span><span>${escapeHtml(link.name || link.url)}</span>`;
            body.appendChild(a);
        });

        wrap.appendChild(header);
        wrap.appendChild(body);
        container.appendChild(wrap);
    });
}

function renderLaunchpadSettings() {
    const root = document.getElementById('launchpad-categories-settings');
    if (!root) return;
    root.innerHTML = '';
    const cats = userData.settings.launchpadCategories;

    cats.forEach((cat, cIdx) => {
        const card = document.createElement('div');
        card.className = 'lp-cat-card';

        const hdr = document.createElement('div');
        hdr.className = 'lp-cat-card-header';
        const nameInp = document.createElement('input');
        nameInp.value = cat.name;
        nameInp.placeholder = 'Category name';
        nameInp.addEventListener('input', () => { cat.name = nameInp.value; saveUserData(); renderLaunchpadWidget(); renderFloatingDock(); });
        const delCat = document.createElement('button');
        delCat.className = 'icon-btn';
        delCat.textContent = '✖';
        delCat.title = 'Delete category';
        delCat.addEventListener('click', () => {
            if (confirm(`Delete category "${cat.name}"?`)) {
                cats.splice(cIdx, 1);
                saveUserData();
                renderLaunchpadSettings();
                renderLaunchpadWidget();
            }
        });
        hdr.appendChild(nameInp);
        hdr.appendChild(delCat);
        card.appendChild(hdr);

        cat.links.forEach((link, lIdx) => {
            const row = document.createElement('div');
            row.className = 'lp-cat-card-links';
            const iName = document.createElement('input');
            iName.placeholder = 'Name';
            iName.value = link.name || '';
            const iUrl = document.createElement('input');
            iUrl.placeholder = 'https://...';
            iUrl.value = link.url || '';
            const iIcon = document.createElement('input');
            iIcon.placeholder = 'Icon';
            iIcon.value = link.icon || '';
            const dl = document.createElement('button');
            dl.className = 'icon-btn';
            dl.textContent = '✖';
            dl.title = 'Remove link';

            iName.addEventListener('input', () => { link.name = iName.value; saveUserData(); renderLaunchpadWidget(); renderFloatingDock(); });
            iUrl.addEventListener('input',  () => { link.url  = iUrl.value;  saveUserData(); renderLaunchpadWidget(); renderFloatingDock(); });
            iIcon.addEventListener('input', () => { link.icon = iIcon.value; saveUserData(); renderLaunchpadWidget(); renderFloatingDock(); });
            dl.addEventListener('click', () => {
                cat.links.splice(lIdx, 1);
                saveUserData();
                renderLaunchpadSettings();
                renderLaunchpadWidget();
            });

            row.appendChild(iName);
            row.appendChild(iUrl);
            row.appendChild(iIcon);
            row.appendChild(dl);
            card.appendChild(row);
        });

        const addLink = document.createElement('button');
        addLink.className = 'lp-cat-card-add';
        addLink.textContent = '+ Add Link';
        addLink.addEventListener('click', () => {
            cat.links.push({ name: '', url: '', icon: '🔗' });
            saveUserData();
            renderLaunchpadSettings();
            renderLaunchpadWidget();
            renderFloatingDock();
        });
        card.appendChild(addLink);

        root.appendChild(card);
    });
}

function initLaunchpadCategories() {
    renderLaunchpadWidget();
    renderLaunchpadSettings();
    const addBtn = document.getElementById('add-category-btn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            userData.settings.launchpadCategories.push({
                id: generateId(),
                name: 'New Category',
                open: true,
                links: []
            });
            saveUserData();
            renderLaunchpadSettings();
            renderLaunchpadWidget();
            renderFloatingDock();
        });
    }
}

// ==========================================
// 14. Schedule Day / Month View
// ==========================================
let scheduleView = 'day';
let monthCursor = new Date(); // first of currently-shown month
monthCursor.setDate(1);
let monthSelectedDate = null;

function initScheduleViews() {
    const dayBtn = document.getElementById('schedule-day-btn');
    const monthBtn = document.getElementById('schedule-month-btn');
    const dayView = document.getElementById('tasks-card');
    const monthView = document.getElementById('month-view-card');
    if (!dayBtn || !monthBtn || !dayView || !monthView) return;

    const setView = (v) => {
        scheduleView = v;
        dayBtn.classList.toggle('active', v === 'day');
        monthBtn.classList.toggle('active', v === 'month');
        dayView.classList.toggle('hidden', v !== 'day');
        monthView.classList.toggle('hidden', v !== 'month');
        if (v === 'month') renderMonthView();
    };
    dayBtn.addEventListener('click', () => setView('day'));
    monthBtn.addEventListener('click', () => setView('month'));

    document.getElementById('month-prev-btn').addEventListener('click', () => {
        monthCursor.setMonth(monthCursor.getMonth() - 1);
        renderMonthView();
    });
    document.getElementById('month-next-btn').addEventListener('click', () => {
        monthCursor.setMonth(monthCursor.getMonth() + 1);
        renderMonthView();
    });

    setView('day'); // default
}

function renderMonthView() {
    const grid = document.getElementById('month-grid');
    const title = document.getElementById('month-view-title');
    if (!grid || !title) return;
    grid.innerHTML = '';

    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    title.textContent = monthCursor.toLocaleString('default', { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const todayStr = localDateStr();
    const cells = [];

    // leading days from previous month
    for (let i = startWeekday - 1; i >= 0; i--) {
        const d = new Date(year, month - 1, daysInPrevMonth - i);
        cells.push({ date: d, outside: true });
    }
    for (let d = 1; d <= daysInMonth; d++) {
        cells.push({ date: new Date(year, month, d), outside: false });
    }
    while (cells.length % 7 !== 0 || cells.length < 42) {
        const last = cells[cells.length - 1].date;
        const next = new Date(last);
        next.setDate(next.getDate() + 1);
        cells.push({ date: next, outside: next.getMonth() !== month });
        if (cells.length >= 42) break;
    }

    cells.forEach(({ date, outside }) => {
        const dateStr = localDateStr(date);
        const cell = document.createElement('div');
        cell.className = 'month-day-cell' + (outside ? ' outside' : '');
        if (dateStr === todayStr) cell.classList.add('today');
        if (dateStr === monthSelectedDate) cell.classList.add('selected');

        const num = document.createElement('div');
        num.className = 'month-day-num';
        num.textContent = date.getDate();
        cell.appendChild(num);

        const dayData = userData[dateStr];
        const tasks = dayData ? (dayData.tasks || []) : [];
        if (tasks.length) {
            const dotsRow = document.createElement('div');
            dotsRow.className = 'month-day-dots';
            tasks.slice(0, 4).forEach(t => {
                const dot = document.createElement('span');
                dot.className = 'dot';
                if (t.color) dot.style.background = t.color;
                dotsRow.appendChild(dot);
            });
            cell.appendChild(dotsRow);
            const cnt = document.createElement('div');
            cnt.className = 'month-day-count';
            cnt.textContent = tasks.length;
            cell.appendChild(cnt);
        }

        cell.addEventListener('click', () => {
            monthSelectedDate = dateStr;
            renderMonthView();
            renderMonthPreview(dateStr);
        });

        grid.appendChild(cell);
    });

    if (monthSelectedDate) renderMonthPreview(monthSelectedDate);
}

function renderMonthPreview(dateStr) {
    const aside = document.getElementById('month-quick-preview');
    if (!aside) return;
    aside.innerHTML = '';

    // Always-visible "+" add-task button in the top corner
    const addBtn = document.createElement('button');
    addBtn.className = 'month-preview-add-btn';
    addBtn.title = 'Add a task to this day';
    addBtn.textContent = '+';
    addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openAddTaskModalForDate(dateStr);
    });
    aside.appendChild(addBtn);

    const h = document.createElement('h3');
    const d = new Date(dateStr + 'T00:00:00');
    h.textContent = d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    aside.appendChild(h);

    const dayData = userData[dateStr];
    const tasks = dayData ? (dayData.tasks || []) : [];
    if (!tasks.length) {
        // Empty-state container — clickable shortcut to open the task modal.
        const empty = document.createElement('div');
        empty.className = 'month-preview-empty month-preview-empty--clickable';
        empty.innerHTML = '<span class="mp-empty-icon">＋</span><span>Click to add a task for this day</span>';
        empty.title = 'Add a task';
        empty.addEventListener('click', () => openAddTaskModalForDate(dateStr));
        aside.appendChild(empty);
        return;
    }

    [...tasks].sort((a, b) => (a.time || '99').localeCompare(b.time || '99')).forEach(t => {
        const row = document.createElement('div');
        row.className = 'month-preview-task';
        const txt = document.createElement('span');
        txt.textContent = t.text + (t.completed ? ' ✓' : '');
        if (t.completed) txt.style.opacity = '0.5';
        const time = document.createElement('span');
        time.className = 'mp-time';
        time.textContent = t.time ? (t.time + (t.timeEnd ? `–${t.timeEnd}` : '')) : '';
        row.appendChild(txt);
        row.appendChild(time);
        aside.appendChild(row);
    });
}

// ==========================================
// 14b. Pinned Stickies (from Library) — draggable widgets
// ==========================================
function togglePinStickyToDashboard(item) {
    if (!userData.pinnedStickies) userData.pinnedStickies = [];
    const existingIdx = userData.pinnedStickies.findIndex(p => p.sourceId === item.id);
    if (existingIdx >= 0) {
        const removed = userData.pinnedStickies.splice(existingIdx, 1)[0];
        if (removed && userData.dashboardWidgets) {
            delete userData.dashboardWidgets['pin-sticky-' + removed.id];
        }
    } else {
        userData.pinnedStickies.push({
            id: generateId(),
            sourceId: item.id,
            text: item.text
        });
    }
    persistWidgetPositions();
    renderPinnedStickyWidgets();
}

function renderPinnedStickyWidgets() {
    const grid = document.getElementById('dashboard-grid');
    if (!grid) return;
    // Remove old pin-sticky widgets
    grid.querySelectorAll('.sticky-pin-widget').forEach(el => el.remove());

    const list = userData.pinnedStickies || [];
    list.forEach((p, idx) => {
        const widgetId = 'pin-sticky-' + p.id;
        const el = document.createElement('div');
        el.className = 'dash-widget sticky-pin-widget';
        el.dataset.widgetId = widgetId;

        const handle = document.createElement('div');
        handle.className = 'drag-handle';
        handle.title = 'Drag to rearrange';
        handle.textContent = '⠿';
        el.appendChild(handle);

        const rsz = document.createElement('button');
        rsz.className = 'resize-handle';
        rsz.title = 'Cycle size (S / M / L)';
        rsz.textContent = '□';
        el.appendChild(rsz);

        const unpin = document.createElement('button');
        unpin.className = 'sticky-pin-unpin';
        unpin.textContent = '✖';
        unpin.title = 'Unpin from Dashboard';
        unpin.addEventListener('click', (e) => {
            e.stopPropagation();
            const i = userData.pinnedStickies.findIndex(s => s.id === p.id);
            if (i >= 0) userData.pinnedStickies.splice(i, 1);
            if (userData.dashboardWidgets) delete userData.dashboardWidgets[widgetId];
            persistWidgetPositions();
            renderPinnedStickyWidgets();
            // Refresh library so the pin badge updates
            if (typeof renderNotesLibrary === 'function') renderNotesLibrary();
        });
        el.appendChild(unpin);

        const txt = document.createElement('div');
        txt.className = 'sticky-pin-text';
        txt.textContent = p.text;
        el.appendChild(txt);

        // Default cascade position if none saved
        if (!userData.dashboardWidgets[widgetId]) {
            DEFAULT_WIDGET_POSITIONS[widgetId] = {
                x: 925 + (idx % 2) * 225,
                y: 250 + Math.floor(idx / 2) * 225,
                z: 120 + idx,
                size: 'small'
            };
        }

        grid.appendChild(el);
        applyWidgetPosition(el);
        makeWidgetDraggable(el);
        if (window.__dashResizeObserver) window.__dashResizeObserver.observe(el);
    });
}

// ==========================================
// 15. Utilities — debounce, escapeHtml
// ==========================================
function debounce(fn, ms) {
    let t;
    return function(...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), ms);
    };
}

function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ==========================================
// Final initialization
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    try {
        loadData();
        renderNotesLibrary();
        initHubFeatures(); // Initialize new Hub features

        // Smart Office OS init
        initToneSelector();
        initPinnedNotes();
        initLaunchpadCategories();
        initScheduleViews();
        initScheduleClockPersistence();
        renderPinnedStickyWidgets();   // inject pinned-from-library stickies
        initSpatialDashboard();        // position + drag every widget
        updateStatusBar();
        setInterval(updateStatusBar, 30 * 1000);
    } catch (e) {
        console.error('Critical boot error:', e);
    }
});
