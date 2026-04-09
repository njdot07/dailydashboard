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

// State
let currentSelectedDate = new Date().toISOString().split('T')[0];
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
        currentSelectedDate = e.target.value || new Date().toISOString().split('T')[0];
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
// 3. Clock Logic Module
// ==========================================
function initClockMarkers() {
    const clocks = document.querySelectorAll('.analog-clock');
    clocks.forEach(clock => {
        // Generate 12 hour markers
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
function openTaskModal(index) {
    taskEditIndex = index;
    const task = tasks[index];
    document.getElementById('modal-task-text').value = task.text;
    document.getElementById('modal-task-time').value = task.time || "";
    document.getElementById('modal-task-time-end').value = task.timeEnd || "";
    document.getElementById('modal-task-duration').value = task.duration || "";
    document.getElementById('task-edit-modal').classList.remove('hidden');
}

const modalCancelBtn = document.getElementById('modal-cancel-btn');
if(modalCancelBtn) {
    modalCancelBtn.addEventListener('click', () => document.getElementById('task-edit-modal').classList.add('hidden'));
}

const modalSaveBtn = document.getElementById('modal-save-btn');
if(modalSaveBtn) {
    modalSaveBtn.addEventListener('click', () => {
        if(taskEditIndex === -1) return;
        const nText = document.getElementById('modal-task-text').value.trim();
        if(nText) tasks[taskEditIndex].text = nText;
        
        tasks[taskEditIndex].time = document.getElementById('modal-task-time').value;
        tasks[taskEditIndex].timeEnd = document.getElementById('modal-task-time-end').value;
        tasks[taskEditIndex].duration = document.getElementById('modal-task-duration').value.trim();
        
        document.getElementById('task-edit-modal').classList.add('hidden');
        saveTasks();
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

            const editBtn = document.createElement('button');
            editBtn.className = 'item-icon-btn item-icon-btn--sticky';
            editBtn.textContent = '✏️';
            editBtn.title = 'Edit';
            editBtn.addEventListener('click', () => {
                const ta = document.createElement('textarea');
                ta.value = item.text;
                ta.style.cssText = 'width:100%;box-sizing:border-box;background:rgba(0,0,0,0.07);border:1px dashed rgba(0,0,0,0.3);font-family:inherit;border-radius:4px;padding:2px 4px;color:#333;resize:none;';
                const save = () => { const v = ta.value.trim(); if (v) { section.items[iIdx].text = v; saveUserData(); renderNotesContentPane(section, space); } };
                ta.addEventListener('blur', save);
                ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) ta.blur(); });
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
                const inp2 = document.createElement('input');
                inp2.type = 'text';
                inp2.value = item.text;
                inp2.style.cssText = 'flex:1;background:rgba(0,0,0,0.15);border:1px dashed rgba(255,255,255,0.3);border-radius:4px;padding:2px 6px;color:#fff;font-family:inherit;outline:none;';
                const save = () => { const v = inp2.value.trim(); if (v) { section.items[iIdx].text = v; saveUserData(); renderNotesContentPane(section, space); } };
                inp2.addEventListener('blur', save);
                inp2.addEventListener('keydown', e => { if (e.key === 'Enter') inp2.blur(); });
                textSpan.replaceWith(inp2); inp2.focus();
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

// --- Launchpad Dock ---
function initDockLogic() {
    const toggle = document.getElementById('dock-toggle');
    const dock = document.getElementById('launchpad-dock');
    const settingsGrid = document.getElementById('dock-links-settings');
    if (!toggle || !dock || !settingsGrid) return;

    toggle.checked = userData.settings.dockEnabled;
    dock.classList.toggle('hidden', !userData.settings.dockEnabled);

    toggle.addEventListener('change', () => {
        userData.settings.dockEnabled = toggle.checked;
        dock.classList.toggle('hidden', !toggle.checked);
        saveUserData();
    });

    renderDock();
    renderDockSettings();
}

function renderDock() {
    const dock = document.getElementById('launchpad-dock');
    if (!dock) return;
    dock.innerHTML = '';
    
    userData.settings.dockLinks.forEach(link => {
        if (!link.url || !link.icon) return;
        const a = document.createElement('a');
        a.href = link.url;
        a.target = '_blank';
        a.className = 'dock-item';
        a.innerHTML = `
            <span>${link.icon}</span>
            <div class="tooltip">${link.name}</div>
        `;
        dock.appendChild(a);
    });
}

function renderDockSettings() {
    const settingsGrid = document.getElementById('dock-links-settings');
    if (!settingsGrid) return;
    settingsGrid.innerHTML = '';

    userData.settings.dockLinks.forEach((link, idx) => {
        const card = document.createElement('div');
        card.className = 'dock-link-card';
        card.innerHTML = `
            <div style="font-size: 0.8rem; margin-bottom: 5px; opacity: 0.6;">Link ${idx + 1}</div>
            <input type="text" placeholder="Name" value="${link.name}" data-idx="${idx}" data-field="name">
            <input type="text" placeholder="URL" value="${link.url}" data-idx="${idx}" data-field="url">
            <input type="text" placeholder="Icon (Emoji/URL)" value="${link.icon}" data-idx="${idx}" data-field="icon">
        `;
        settingsGrid.appendChild(card);
    });

    settingsGrid.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', (e) => {
            const idx = e.target.dataset.idx;
            const field = e.target.dataset.field;
            userData.settings.dockLinks[idx][field] = e.target.value;
            saveUserData();
            renderDock();
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

// Final initialization
document.addEventListener('DOMContentLoaded', () => {
    try {
        loadData();
        renderNotesLibrary();
        initHubFeatures(); // Initialize new Hub features
    } catch (e) {
        console.error('Critical boot error:', e);
    }
});
