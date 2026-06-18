/**
 * SCT_WD_4 — Premium To-Do App
 * SkillCraft Technology Web Development Internship — Task 04
 * Vanilla JS | LocalStorage | Full CRUD | Animations
 */

'use strict';

/* ============================================================
   STATE
   ============================================================ */
let tasks = [];
let currentFilter = 'all';
let currentSort = 'created';
let formExpanded = false;

/* ============================================================
   DOM REFS
   ============================================================ */
const $ = id => document.getElementById(id);

const elDatetime        = $('current-datetime');
const elRemainingCount  = $('task-remaining-count');
const elProgressFill    = $('progress-bar-fill');
const elProgressLabel   = $('progress-label');

const elAddPanel        = $('add-task-panel');
const elAddTrigger      = $('add-task-trigger');
const elAddForm         = $('add-task-form');
const elTitleInput      = $('task-title-input');
const elDescInput       = $('task-desc-input');
const elDateInput       = $('task-date-input');
const elTimeInput       = $('task-time-input');
const elPriorityInput   = $('task-priority-input');
const elTitleError      = $('title-error');
const elCancelAdd       = $('cancel-add-btn');

const elTaskList        = $('task-list');
const elEmptyState      = $('empty-state');
const elEmptyTitle      = $('empty-title');
const elEmptyMsg        = $('empty-msg');

const elFilterAll       = $('filter-all');
const elFilterActive    = $('filter-active');
const elFilterCompleted = $('filter-completed');
const elSortSelect      = $('sort-select');

const elEditModal       = $('edit-modal');
const elEditForm        = $('edit-modal-form');
const elEditId          = $('edit-task-id');
const elEditTitle       = $('edit-title-input');
const elEditDesc        = $('edit-desc-input');
const elEditDate        = $('edit-date-input');
const elEditTime        = $('edit-time-input');
const elEditPriority    = $('edit-priority-input');
const elEditTitleError  = $('edit-title-error');
const elModalClose      = $('modal-close-btn');
const elModalCancel     = $('modal-cancel-btn');

const elToastContainer  = $('toast-container');

/* ============================================================
   CLOCK
   ============================================================ */
function updateClock() {
  const now = new Date();
  const opts = { weekday:'long', year:'numeric', month:'long', day:'numeric' };
  const dateStr = now.toLocaleDateString('en-US', opts);
  const timeStr = now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
  elDatetime.textContent = `${dateStr} · ${timeStr}`;
}
updateClock();
setInterval(updateClock, 30000);

/* ============================================================
   LOCAL STORAGE
   ============================================================ */
function saveTasks() {
  localStorage.setItem('sct_wd4_tasks', JSON.stringify(tasks));
}

function loadTasks() {
  try {
    const stored = localStorage.getItem('sct_wd4_tasks');
    tasks = stored ? JSON.parse(stored) : [];
  } catch (e) {
    tasks = [];
  }
}

/* ============================================================
   TASK UTILITIES
   ============================================================ */
function generateId() {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

function isOverdue(task) {
  if (task.completed || !task.dueDate) return false;
  const now = new Date();
  let dueStr = task.dueDate;
  if (task.dueTime) dueStr += `T${task.dueTime}`;
  const due = new Date(dueStr);
  return due < now;
}

function sortedTasks(list) {
  const copy = [...list];
  if (currentSort === 'priority') {
    copy.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1));
  } else if (currentSort === 'duedate') {
    copy.sort((a, b) => {
      const aD = a.dueDate ? new Date(a.dueDate + (a.dueTime ? `T${a.dueTime}` : '')) : Infinity;
      const bD = b.dueDate ? new Date(b.dueDate + (b.dueTime ? `T${b.dueTime}` : '')) : Infinity;
      return aD - bD;
    });
  } else {
    copy.sort((a, b) => b.createdAt - a.createdAt);
  }
  return copy;
}

function filteredTasks() {
  let list = tasks;
  if (currentFilter === 'active')    list = tasks.filter(t => !t.completed);
  if (currentFilter === 'completed') list = tasks.filter(t =>  t.completed);
  return sortedTasks(list);
}

/* ============================================================
   STATS & PROGRESS
   ============================================================ */
function updateStats() {
  const total     = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const remaining = total - completed;
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;

  elRemainingCount.textContent = remaining;

  elProgressFill.style.width = `${pct}%`;
  elProgressLabel.textContent = `${pct}% complete`;

  if (pct > 0) elProgressFill.classList.add('has-progress');
  else         elProgressFill.classList.remove('has-progress');
}

/* ============================================================
   RENDER
   ============================================================ */
function formatDueDateTime(dueDate, dueTime) {
  if (!dueDate) return null;
  const dateObj = new Date(dueDate + (dueTime ? `T${dueTime}` : 'T00:00'));
  const today   = new Date();
  const isToday =
    dateObj.getFullYear() === today.getFullYear() &&
    dateObj.getMonth()    === today.getMonth() &&
    dateObj.getDate()     === today.getDate();

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const isTomorrow =
    dateObj.getFullYear() === tomorrow.getFullYear() &&
    dateObj.getMonth()    === tomorrow.getMonth() &&
    dateObj.getDate()     === tomorrow.getDate();

  let label = '';
  if (isToday)          label = 'Today';
  else if (isTomorrow)  label = 'Tomorrow';
  else                  label = dateObj.toLocaleDateString('en-US', { month:'short', day:'numeric' });

  if (dueTime) {
    const [h, m] = dueTime.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    label += ` · ${hour}:${String(m).padStart(2,'0')} ${ampm}`;
  }
  return label;
}

function createTaskCard(task) {
  const overdue = isOverdue(task);
  const dueFmt  = formatDueDateTime(task.dueDate, task.dueTime);

  const card = document.createElement('div');
  card.className = [
    'task-card',
    `priority-${task.priority}`,
    task.completed ? 'completed' : '',
    overdue ? 'overdue' : ''
  ].join(' ').trim();
  card.setAttribute('data-id', task.id);
  card.setAttribute('role', 'listitem');
  card.setAttribute('aria-label', `Task: ${task.title}`);

  // --- Checkbox ---
  const checkWrap = document.createElement('div');
  checkWrap.className = 'task-checkbox-wrap';
  const checkbox = document.createElement('input');
  checkbox.type    = 'checkbox';
  checkbox.className = 'task-checkbox';
  checkbox.checked = task.completed;
  checkbox.setAttribute('aria-label', `Mark "${task.title}" as ${task.completed ? 'incomplete' : 'complete'}`);
  checkbox.addEventListener('change', () => toggleTask(task.id));
  checkWrap.appendChild(checkbox);

  // --- Body ---
  const body = document.createElement('div');
  body.className = 'task-body';

  const title = document.createElement('div');
  title.className = 'task-title';
  title.textContent = task.title;

  body.appendChild(title);

  if (task.description) {
    const desc = document.createElement('div');
    desc.className = 'task-desc';
    desc.textContent = task.description;
    body.appendChild(desc);
  }

  const meta = document.createElement('div');
  meta.className = 'task-meta';

  // Priority badge
  const priBadge = document.createElement('span');
  priBadge.className = `badge badge-priority-${task.priority}`;
  const priIcons = { high:'🔴', medium:'🟡', low:'🟢' };
  priBadge.textContent = `${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}`;
  meta.appendChild(priBadge);

  // Due date badge
  if (dueFmt) {
    const dueBadge = document.createElement('span');
    if (overdue) {
      dueBadge.className = 'badge badge-overdue';
      const dot = document.createElement('span');
      dot.className = 'pulse-dot';
      dueBadge.appendChild(dot);
      dueBadge.appendChild(document.createTextNode(' Overdue · ' + dueFmt));
    } else {
      dueBadge.className = 'badge badge-due';
      dueBadge.innerHTML = `
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <circle cx="5" cy="5" r="4.5" stroke="currentColor" stroke-width="1.2"/>
          <path d="M5 2.5V5l1.5 1.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
        </svg>
        ${dueFmt}`;
    }
    meta.appendChild(dueBadge);
  }

  body.appendChild(meta);

  // --- Actions ---
  const actions = document.createElement('div');
  actions.className = 'task-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'action-btn edit-btn';
  editBtn.setAttribute('aria-label', `Edit task: ${task.title}`);
  editBtn.title = 'Edit task';
  editBtn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M10 1.5a1.5 1.5 0 012.12 2.12L4 11.76 1.5 12.5l.74-2.5L10 1.5z"
            stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  editBtn.addEventListener('click', () => openEditModal(task.id));

  const delBtn = document.createElement('button');
  delBtn.className = 'action-btn delete-btn';
  delBtn.setAttribute('aria-label', `Delete task: ${task.title}`);
  delBtn.title = 'Delete task';
  delBtn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2 3.5h10M5 3.5V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v1M5.5 6v4M8.5 6v4M3 3.5l.7 7.5a1 1 0 001 .9h4.6a1 1 0 001-.9l.7-7.5"
            stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  delBtn.addEventListener('click', () => deleteTask(task.id));

  actions.appendChild(editBtn);
  actions.appendChild(delBtn);

  card.appendChild(checkWrap);
  card.appendChild(body);
  card.appendChild(actions);

  return card;
}

function render() {
  const list = filteredTasks();
  elTaskList.innerHTML = '';

  // Completed tasks always go to the bottom within their group
  const active    = list.filter(t => !t.completed);
  const completed = list.filter(t =>  t.completed);
  const ordered   = [...active, ...completed];

  ordered.forEach(task => {
    const card = createTaskCard(task);
    elTaskList.appendChild(card);
  });

  // Empty state
  if (ordered.length === 0) {
    elEmptyState.classList.remove('hidden');
    const msgs = {
      all:       ['Nothing here yet',    'Add your first task above and start crushing it!'],
      active:    ['All caught up! 🎉',   'No active tasks. Add one to keep the momentum going.'],
      completed: ['No completed tasks',  'Finish a task to see it here.']
    };
    elEmptyTitle.textContent = msgs[currentFilter][0];
    elEmptyMsg.textContent   = msgs[currentFilter][1];
  } else {
    elEmptyState.classList.add('hidden');
  }

  updateStats();
}

/* ============================================================
   TASK CRUD
   ============================================================ */
function addTask(title, description, dueDate, dueTime, priority) {
  const task = {
    id:          generateId(),
    title:       title.trim(),
    description: description.trim(),
    dueDate:     dueDate || '',
    dueTime:     dueTime || '',
    priority:    priority || 'medium',
    completed:   false,
    createdAt:   Date.now()
  };
  tasks.unshift(task);
  saveTasks();
  render();
  showToast('Task added successfully!', 'success');
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.completed = !task.completed;
  saveTasks();
  render();
  if (task.completed) {
    showToast(`"${task.title}" completed! ✅`, 'success');
  }
}

function deleteTask(id) {
  const card = elTaskList.querySelector(`[data-id="${id}"]`);
  if (card) {
    card.classList.add('deleting');
    setTimeout(() => {
      tasks = tasks.filter(t => t.id !== id);
      saveTasks();
      render();
    }, 250);
    showToast('Task deleted.', 'info');
  } else {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    render();
  }
}

function updateTask(id, title, description, dueDate, dueTime, priority) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.title       = title.trim();
  task.description = description.trim();
  task.dueDate     = dueDate || '';
  task.dueTime     = dueTime || '';
  task.priority    = priority || 'medium';
  saveTasks();
  render();
  showToast('Task updated!', 'success');
}

/* ============================================================
   FORM — ADD TASK
   ============================================================ */
function expandForm() {
  if (formExpanded) return;
  formExpanded = true;
  elAddTrigger.setAttribute('aria-expanded', 'true');
  elAddForm.classList.add('visible');
  elAddForm.setAttribute('aria-hidden', 'false');
  elAddPanel.classList.add('expanded');
  setTimeout(() => elTitleInput.focus(), 50);
}

function collapseForm() {
  if (!formExpanded) return;
  formExpanded = false;
  elAddTrigger.setAttribute('aria-expanded', 'false');
  elAddForm.classList.remove('visible');
  elAddForm.setAttribute('aria-hidden', 'true');
  elAddPanel.classList.remove('expanded');
  clearAddForm();
}

function clearAddForm() {
  elTitleInput.value      = '';
  elDescInput.value       = '';
  elDateInput.value       = '';
  elTimeInput.value       = '';
  elPriorityInput.value   = 'medium';
  elTitleError.textContent = '';
  elTitleInput.classList.remove('error');
}

function validateTitle(titleEl, errorEl) {
  const val = titleEl.value.trim();
  if (!val) {
    errorEl.textContent = 'Task title is required.';
    titleEl.classList.add('error');
    titleEl.focus();
    return false;
  }
  if (val.length < 2) {
    errorEl.textContent = 'Title must be at least 2 characters.';
    titleEl.classList.add('error');
    titleEl.focus();
    return false;
  }
  errorEl.textContent = '';
  titleEl.classList.remove('error');
  return true;
}

elAddTrigger.addEventListener('click', expandForm);
elAddTrigger.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); expandForm(); }
});

elCancelAdd.addEventListener('click', collapseForm);

elAddForm.addEventListener('submit', e => {
  e.preventDefault();
  if (!validateTitle(elTitleInput, elTitleError)) return;
  addTask(
    elTitleInput.value,
    elDescInput.value,
    elDateInput.value,
    elTimeInput.value,
    elPriorityInput.value
  );
  collapseForm();
});

elTitleInput.addEventListener('input', () => {
  if (elTitleInput.value.trim()) {
    elTitleError.textContent = '';
    elTitleInput.classList.remove('error');
  }
});

/* ============================================================
   FILTER & SORT
   ============================================================ */
function setFilter(filter) {
  currentFilter = filter;
  [elFilterAll, elFilterActive, elFilterCompleted].forEach(btn => {
    const active = btn.dataset.filter === filter;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active.toString());
  });
  render();
}

elFilterAll.addEventListener('click',       () => setFilter('all'));
elFilterActive.addEventListener('click',    () => setFilter('active'));
elFilterCompleted.addEventListener('click', () => setFilter('completed'));

elSortSelect.addEventListener('change', () => {
  currentSort = elSortSelect.value;
  render();
});

/* ============================================================
   EDIT MODAL
   ============================================================ */
function openEditModal(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  elEditId.value            = task.id;
  elEditTitle.value         = task.title;
  elEditDesc.value          = task.description;
  elEditDate.value          = task.dueDate;
  elEditTime.value          = task.dueTime;
  elEditPriority.value      = task.priority;
  elEditTitleError.textContent = '';
  elEditTitle.classList.remove('error');

  elEditModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  setTimeout(() => elEditTitle.focus(), 100);
}

function closeEditModal() {
  elEditModal.classList.add('hidden');
  document.body.style.overflow = '';
}

elModalClose.addEventListener('click',  closeEditModal);
elModalCancel.addEventListener('click', closeEditModal);

elEditModal.addEventListener('click', e => {
  if (e.target === elEditModal) closeEditModal();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !elEditModal.classList.contains('hidden')) {
    closeEditModal();
  }
});

elEditForm.addEventListener('submit', e => {
  e.preventDefault();
  if (!validateTitle(elEditTitle, elEditTitleError)) return;
  updateTask(
    elEditId.value,
    elEditTitle.value,
    elEditDesc.value,
    elEditDate.value,
    elEditTime.value,
    elEditPriority.value
  );
  closeEditModal();
});

elEditTitle.addEventListener('input', () => {
  if (elEditTitle.value.trim()) {
    elEditTitleError.textContent = '';
    elEditTitle.classList.remove('error');
  }
});

/* ============================================================
   TOAST
   ============================================================ */
const TOAST_ICONS = {
  success: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2 7l3.5 3.5 6.5-6.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  error:   `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  info:    `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M7 6.5v4M7 4.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`
};

function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'status');

  const icon = document.createElement('div');
  icon.className = 'toast-icon';
  icon.innerHTML = TOAST_ICONS[type] || TOAST_ICONS.info;

  const text = document.createElement('span');
  text.textContent = message;

  toast.appendChild(icon);
  toast.appendChild(text);
  elToastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-out');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, duration);
}

/* ============================================================
   KEYBOARD SHORTCUTS
   ============================================================ */
document.addEventListener('keydown', e => {
  // Ctrl/Cmd + Enter → add task (if form open)
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && formExpanded) {
    e.preventDefault();
    elAddForm.requestSubmit();
  }
  // Escape → collapse form
  if (e.key === 'Escape' && formExpanded) {
    collapseForm();
  }
});

/* ============================================================
   OVERDUE CHECK — refresh every minute
   ============================================================ */
setInterval(() => {
  const hasOverdue = tasks.some(isOverdue);
  if (hasOverdue) render();
}, 60000);

/* ============================================================
   INIT
   ============================================================ */
function init() {
  loadTasks();
  render();

  // Demo tasks if first visit
  if (tasks.length === 0) {
    const today = new Date();
    const fmt = d => d.toISOString().split('T')[0];
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

    tasks = [
      {
        id: generateId(),
        title: 'Review project requirements',
        description: 'Go through the SkillCraft internship task brief and plan the approach.',
        dueDate: fmt(today),
        dueTime: '18:00',
        priority: 'high',
        completed: false,
        createdAt: Date.now() - 3600000
      },
      {
        id: generateId(),
        title: 'Design wireframes for landing page',
        description: 'Create high-fidelity wireframes using a dark theme with cyan and purple accents.',
        dueDate: fmt(tomorrow),
        dueTime: '12:00',
        priority: 'medium',
        completed: false,
        createdAt: Date.now() - 7200000
      },
      {
        id: generateId(),
        title: 'Set up development environment',
        description: '',
        dueDate: fmt(yesterday),
        dueTime: '09:00',
        priority: 'low',
        completed: true,
        createdAt: Date.now() - 86400000
      },
      {
        id: generateId(),
        title: 'Submit Task 01 — Portfolio website',
        description: 'Upload all files and share the GitHub Pages link.',
        dueDate: fmt(yesterday),
        dueTime: '23:59',
        priority: 'high',
        completed: true,
        createdAt: Date.now() - 172800000
      }
    ];
    saveTasks();
    render();
    setTimeout(() => showToast('Welcome! Here are some sample tasks to get you started.', 'info', 4000), 600);
  }
}

init();
