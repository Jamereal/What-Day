/* ===================================================================
   WhatDay — Daily Task Companion App
   Main application logic
   =================================================================== */

(() => {
    'use strict';

    // ─── Constants ───────────────────────────────────────────────────
    const STORAGE_KEYS = {
        EVENTS: 'whatday_events',
        SETTINGS: 'whatday_settings',
        ICS_URL: 'whatday_ics_url'
    };

    const CATEGORY_LABELS = {
        work: '💼 งาน',
        personal: '👤 ส่วนตัว',
        health: '💪 สุขภาพ',
        study: '📚 การเรียน',
        meeting: '🤝 ประชุม',
        other: '📌 อื่นๆ'
    };

    const THAI_DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const THAI_MONTHS = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];

    // ─── State ───────────────────────────────────────────────────────
    let currentDate = new Date();
    let events = [];
    let settings = {
        dailySummary: true,
        beforeEvent: true,
        autoVoice: false,
        morningTime: '07:00'
    };
    let isSpeaking = false;
    let notificationTimers = [];

    // ─── DOM References ──────────────────────────────────────────────
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const DOM = {
        dateThai: $('#date-thai'),
        dateFull: $('#date-full'),
        dateInfo: $('#date-info'),
        statTotal: $('#stat-total'),
        statDone: $('#stat-done'),
        statRemaining: $('#stat-remaining'),
        emptyState: $('#empty-state'),
        eventsContainer: $('#events-container'),
        btnVoice: $('#btn-voice'),
        btnAdd: $('#btn-add'),
        btnImport: $('#btn-import'),
        btnNotifSettings: $('#btn-notification-settings'),
        btnPrevDay: $('#btn-prev-day'),
        btnNextDay: $('#btn-next-day'),
        modalEvent: $('#modal-event'),
        modalImport: $('#modal-import'),
        modalNotifications: $('#modal-notifications'),
        eventForm: $('#event-form'),
        eventId: $('#event-id'),
        eventTitle: $('#event-title'),
        eventDate: $('#event-date'),
        eventTime: $('#event-time'),
        eventEndTime: $('#event-end-time'),
        eventCategory: $('#event-category'),
        eventNotes: $('#event-notes'),
        eventNotify: $('#event-notify'),
        modalEventTitle: $('#modal-event-title'),
        btnDeleteEvent: $('#btn-delete-event'),
        icsUrl: $('#ics-url'),
        icsFile: $('#ics-file'),
        icsFileName: $('#ics-file-name'),
        btnImportSubmit: $('#btn-import-submit'),
        importStatus: $('#import-status'),
        btnRequestPermission: $('#btn-request-permission'),
        permissionText: $('#permission-text'),
        settingDailySummary: $('#setting-daily-summary'),
        settingBeforeEvent: $('#setting-before-event'),
        settingAutoVoice: $('#setting-auto-voice'),
        settingMorningTime: $('#setting-morning-time'),
        btnSaveSettings: $('#btn-save-settings'),
        notificationDot: $('#notification-dot'),
        toastContainer: $('#toast-container')
    };

    // ─── Initialization ──────────────────────────────────────────────
    function init() {
        loadData();
        updateDateDisplay();
        renderEvents();
        bindEvents();
        registerServiceWorker();
        updateNotificationStatus();
        scheduleNotifications();
    }

    // ─── Data Persistence ────────────────────────────────────────────
    function loadData() {
        try {
            const savedEvents = localStorage.getItem(STORAGE_KEYS.EVENTS);
            if (savedEvents) events = JSON.parse(savedEvents);

            const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
            if (savedSettings) settings = { ...settings, ...JSON.parse(savedSettings) };
        } catch (e) {
            console.error('Error loading data:', e);
        }
    }

    function saveEvents() {
        localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
    }

    function saveSettings() {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    }

    // ─── Date Helpers ────────────────────────────────────────────────
    function formatDateKey(date) {
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function formatThaiDate(date) {
        const d = new Date(date);
        const buddhistYear = d.getFullYear() + 543;
        return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${buddhistYear}`;
    }

    function formatThaiDay(date) {
        const d = new Date(date);
        return `วัน${THAI_DAYS[d.getDay()]}`;
    }

    function formatTime(timeStr) {
        if (!timeStr) return '';
        const [h, m] = timeStr.split(':');
        return `${h}:${m}`;
    }

    function isToday(date) {
        const today = new Date();
        const d = new Date(date);
        return d.getDate() === today.getDate() &&
            d.getMonth() === today.getMonth() &&
            d.getFullYear() === today.getFullYear();
    }

    // ─── Date Navigation ────────────────────────────────────────────
    function updateDateDisplay() {
        DOM.dateThai.textContent = formatThaiDay(currentDate);
        DOM.dateFull.textContent = formatThaiDate(currentDate);

        // Set today indicator
        if (isToday(currentDate)) {
            DOM.dateThai.textContent = `วัน${THAI_DAYS[currentDate.getDay()]} (วันนี้)`;
        }
    }

    function navigateDay(offset) {
        currentDate.setDate(currentDate.getDate() + offset);
        updateDateDisplay();
        renderEvents();
    }

    // ─── Event CRUD ──────────────────────────────────────────────────
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    function getTodayEvents() {
        const key = formatDateKey(currentDate);
        return events
            .filter(e => e.date === key)
            .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    }

    function addEvent(eventData) {
        const newEvent = {
            id: generateId(),
            ...eventData,
            completed: false,
            createdAt: new Date().toISOString()
        };
        events.push(newEvent);
        saveEvents();
        renderEvents();
        scheduleNotifications();
        showToast('เพิ่มกิจกรรมเรียบร้อย', 'success');
        return newEvent;
    }

    function updateEvent(id, updates) {
        const idx = events.findIndex(e => e.id === id);
        if (idx !== -1) {
            events[idx] = { ...events[idx], ...updates };
            saveEvents();
            renderEvents();
            scheduleNotifications();
        }
    }

    function deleteEvent(id) {
        events = events.filter(e => e.id !== id);
        saveEvents();
        renderEvents();
        scheduleNotifications();
        showToast('ลบกิจกรรมเรียบร้อย', 'info');
    }

    function toggleComplete(id) {
        const evt = events.find(e => e.id === id);
        if (evt) {
            evt.completed = !evt.completed;
            saveEvents();
            renderEvents();
        }
    }

    // ─── Render Events ───────────────────────────────────────────────
    function renderEvents() {
        const dayEvents = getTodayEvents();
        const total = dayEvents.length;
        const done = dayEvents.filter(e => e.completed).length;

        // Update stats
        DOM.statTotal.textContent = total;
        DOM.statDone.textContent = done;
        DOM.statRemaining.textContent = total - done;

        // Show/hide empty state
        if (total === 0) {
            DOM.emptyState.classList.remove('hidden');
            DOM.eventsContainer.classList.add('hidden');
            return;
        }

        DOM.emptyState.classList.add('hidden');
        DOM.eventsContainer.classList.remove('hidden');

        DOM.eventsContainer.innerHTML = dayEvents.map((evt, i) => `
      <div class="event-card ${evt.completed ? 'completed' : ''}" 
           data-id="${evt.id}" 
           data-category="${evt.category || 'other'}"
           style="animation-delay: ${i * 0.06}s">
        <div class="event-time-col">
          <span class="event-time-start">${formatTime(evt.time)}</span>
          ${evt.endTime ? `<span class="event-time-end">${formatTime(evt.endTime)}</span>` : ''}
          <div class="event-time-dot"></div>
        </div>
        <div class="event-content">
          <div class="event-title">${escapeHtml(evt.title)}</div>
          ${evt.notes ? `<div class="event-notes">${escapeHtml(evt.notes)}</div>` : ''}
          <span class="event-category-badge">${CATEGORY_LABELS[evt.category] || CATEGORY_LABELS.other}</span>
        </div>
        <div class="event-actions">
          <button class="event-check ${evt.completed ? 'checked' : ''}" data-check="${evt.id}" title="เสร็จแล้ว">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </button>
        </div>
      </div>
    `).join('');

        // Bind event card clicks
        DOM.eventsContainer.querySelectorAll('.event-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.event-check')) return;
                openEditEvent(card.dataset.id);
            });
        });

        DOM.eventsContainer.querySelectorAll('.event-check').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleComplete(btn.dataset.check);
            });
        });
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ─── Event Modal ─────────────────────────────────────────────────
    function openAddEvent() {
        DOM.modalEventTitle.textContent = 'เพิ่มกิจกรรมใหม่';
        DOM.eventForm.reset();
        DOM.eventId.value = '';
        DOM.eventDate.value = formatDateKey(currentDate);
        DOM.eventNotify.checked = true;
        DOM.btnDeleteEvent.classList.add('hidden');
        openModal('modal-event');
    }

    function openEditEvent(id) {
        const evt = events.find(e => e.id === id);
        if (!evt) return;

        DOM.modalEventTitle.textContent = 'แก้ไขกิจกรรม';
        DOM.eventId.value = evt.id;
        DOM.eventTitle.value = evt.title;
        DOM.eventDate.value = evt.date;
        DOM.eventTime.value = evt.time || '';
        DOM.eventEndTime.value = evt.endTime || '';
        DOM.eventCategory.value = evt.category || 'other';
        DOM.eventNotes.value = evt.notes || '';
        DOM.eventNotify.checked = evt.notify !== false;
        DOM.btnDeleteEvent.classList.remove('hidden');
        openModal('modal-event');
    }

    function handleEventSubmit(e) {
        e.preventDefault();

        const eventData = {
            title: DOM.eventTitle.value.trim(),
            date: DOM.eventDate.value,
            time: DOM.eventTime.value,
            endTime: DOM.eventEndTime.value || null,
            category: DOM.eventCategory.value,
            notes: DOM.eventNotes.value.trim(),
            notify: DOM.eventNotify.checked
        };

        if (!eventData.title) return;

        const editId = DOM.eventId.value;
        if (editId) {
            updateEvent(editId, eventData);
            showToast('อัปเดตกิจกรรมเรียบร้อย', 'success');
        } else {
            addEvent(eventData);
        }

        closeModal('modal-event');
    }

    // ─── ICS Import ──────────────────────────────────────────────────
    function handleImport() {
        const url = DOM.icsUrl.value.trim();
        const file = DOM.icsFile.files[0];

        if (url) {
            importFromUrl(url);
        } else if (file) {
            importFromFile(file);
        } else {
            showImportStatus('กรุณาใส่ URL หรือเลือกไฟล์ .ics', 'error');
        }
    }

    async function importFromUrl(url) {
        showImportStatus('กำลัง import...', 'info');

        try {
            // Try using CORS proxy
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);

            if (!response.ok) throw new Error('ไม่สามารถดึงข้อมูลได้');

            const icsText = await response.text();
            const imported = parseICS(icsText);

            if (imported.length === 0) {
                showImportStatus('ไม่พบกิจกรรมในไฟล์', 'error');
                return;
            }

            events.push(...imported);
            saveEvents();
            renderEvents();
            localStorage.setItem(STORAGE_KEYS.ICS_URL, url);

            showImportStatus(`Import สำเร็จ! เพิ่ม ${imported.length} กิจกรรม`, 'success');
            showToast(`Import ${imported.length} กิจกรรมสำเร็จ`, 'success');
        } catch (err) {
            console.error('Import error:', err);
            showImportStatus('เกิดข้อผิดพลาด: ' + err.message, 'error');
        }
    }

    function importFromFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = parseICS(e.target.result);

                if (imported.length === 0) {
                    showImportStatus('ไม่พบกิจกรรมในไฟล์', 'error');
                    return;
                }

                events.push(...imported);
                saveEvents();
                renderEvents();

                showImportStatus(`Import สำเร็จ! เพิ่ม ${imported.length} กิจกรรม`, 'success');
                showToast(`Import ${imported.length} กิจกรรมสำเร็จ`, 'success');
            } catch (err) {
                showImportStatus('ไฟล์ ICS ไม่ถูกต้อง', 'error');
            }
        };
        reader.readAsText(file);
    }

    function parseICS(icsText) {
        const imported = [];
        const eventBlocks = icsText.split('BEGIN:VEVENT');

        for (let i = 1; i < eventBlocks.length; i++) {
            const block = eventBlocks[i].split('END:VEVENT')[0];

            const summary = extractICSField(block, 'SUMMARY');
            const dtstart = extractICSField(block, 'DTSTART');
            const dtend = extractICSField(block, 'DTEND');
            const description = extractICSField(block, 'DESCRIPTION');
            const uid = extractICSField(block, 'UID');

            if (!summary || !dtstart) continue;

            // Check if already imported (by UID)
            if (uid && events.some(e => e.icsUid === uid)) continue;

            const startDate = parseICSDate(dtstart);
            if (!startDate) continue;

            const endDate = dtend ? parseICSDate(dtend) : null;

            imported.push({
                id: generateId(),
                icsUid: uid || null,
                title: unescapeICS(summary),
                date: formatDateKey(startDate),
                time: `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`,
                endTime: endDate ? `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}` : null,
                category: 'other',
                notes: description ? unescapeICS(description) : '',
                notify: true,
                completed: false,
                createdAt: new Date().toISOString(),
                source: 'ics'
            });
        }

        return imported;
    }

    function extractICSField(block, field) {
        // Handle both simple and complex field formats (e.g., DTSTART;VALUE=DATE:20210101)
        const regex = new RegExp(`(?:^|\\n)${field}[^:]*:(.+?)(?:\\r?\\n(?! )| *$)`, 's');
        const match = block.match(regex);
        return match ? match[1].replace(/\r?\n /g, '').trim() : null;
    }

    function parseICSDate(dateStr) {
        // Format: 20210101T120000Z or 20210101T120000 or 20210101
        const clean = dateStr.replace(/[^0-9TZ]/g, '');

        if (clean.length >= 8) {
            const year = parseInt(clean.substr(0, 4));
            const month = parseInt(clean.substr(4, 2)) - 1;
            const day = parseInt(clean.substr(6, 2));
            let hours = 0, minutes = 0;

            if (clean.length >= 13) {
                hours = parseInt(clean.substr(9, 2));
                minutes = parseInt(clean.substr(11, 2));
            }

            if (clean.endsWith('Z')) {
                return new Date(Date.UTC(year, month, day, hours, minutes));
            }
            return new Date(year, month, day, hours, minutes);
        }
        return null;
    }

    function unescapeICS(str) {
        return str
            .replace(/\\n/g, '\n')
            .replace(/\\,/g, ',')
            .replace(/\\;/g, ';')
            .replace(/\\\\/g, '\\');
    }

    function showImportStatus(message, type) {
        DOM.importStatus.textContent = message;
        DOM.importStatus.className = `import-status ${type}`;
        DOM.importStatus.classList.remove('hidden');
    }

    // ─── Text-to-Speech (Siri Voice) ────────────────────────────────
    function readTodayEvents() {
        if (isSpeaking) {
            stopSpeaking();
            return;
        }

        const dayEvents = getTodayEvents();
        const uncompleted = dayEvents.filter(e => !e.completed);

        if (dayEvents.length === 0) {
            speak('วันนี้ไม่มีกิจกรรมที่ต้องทำ');
            return;
        }

        // Build speech text
        const dateText = `${formatThaiDay(currentDate)} ${formatThaiDate(currentDate)}`;
        let speechText = `สวัสดีค่ะ ${dateText} `;

        if (uncompleted.length === 0) {
            speechText += 'กิจกรรมทั้งหมดเสร็จเรียบร้อยแล้วค่ะ ยินดีด้วย!';
        } else {
            speechText += `คุณมี ${uncompleted.length} กิจกรรมที่ต้องทำ `;

            uncompleted.forEach((evt, i) => {
                speechText += `รายการที่ ${i + 1}: ${evt.title} `;
            });

            speechText += 'หมดแล้วค่ะ สู้ๆนะคะ!';
        }

        speak(speechText);
    }

    function speak(text) {
        if (!('speechSynthesis' in window)) {
            showToast('อุปกรณ์นี้ไม่รองรับ Text-to-Speech', 'error');
            return;
        }

        stopSpeaking();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'th-TH';
        utterance.rate = 0.9;
        utterance.pitch = 1;

        // Try to find Thai voice (Siri on iOS)
        const voices = speechSynthesis.getVoices();
        const thaiVoice = voices.find(v => v.lang.startsWith('th'));
        if (thaiVoice) {
            utterance.voice = thaiVoice;
        }

        utterance.onstart = () => {
            isSpeaking = true;
            DOM.btnVoice.classList.add('speaking');
        };

        utterance.onend = () => {
            isSpeaking = false;
            DOM.btnVoice.classList.remove('speaking');
        };

        utterance.onerror = () => {
            isSpeaking = false;
            DOM.btnVoice.classList.remove('speaking');
        };

        speechSynthesis.speak(utterance);
    }

    function stopSpeaking() {
        speechSynthesis.cancel();
        isSpeaking = false;
        DOM.btnVoice.classList.remove('speaking');
    }

    // Pre-load voices (needed on some browsers)
    if ('speechSynthesis' in window) {
        speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
    }

    // ─── Notifications ──────────────────────────────────────────────
    async function requestNotificationPermission() {
        if (!('Notification' in window)) {
            showToast('อุปกรณ์นี้ไม่รองรับ Notification', 'error');
            return;
        }

        const permission = await Notification.requestPermission();
        updateNotificationStatus();

        if (permission === 'granted') {
            showToast('อนุญาตแจ้งเตือนเรียบร้อย!', 'success');
            scheduleNotifications();
        }
    }

    function updateNotificationStatus() {
        if (!('Notification' in window)) {
            DOM.permissionText.textContent = 'ไม่รองรับ';
            return;
        }

        const status = Notification.permission;
        const statusMap = {
            granted: 'อนุญาตแล้ว ✅',
            denied: 'ถูกปฏิเสธ ❌',
            default: 'ยังไม่ได้ตั้งค่า'
        };
        DOM.permissionText.textContent = statusMap[status] || status;

        if (status === 'granted') {
            DOM.btnRequestPermission.textContent = 'อนุญาตแล้ว';
            DOM.btnRequestPermission.disabled = true;
            DOM.notificationDot.classList.add('hidden');
        } else {
            DOM.notificationDot.classList.remove('hidden');
        }
    }

    function scheduleNotifications() {
        // Clear existing timers
        notificationTimers.forEach(t => clearTimeout(t));
        notificationTimers = [];

        if (!('Notification' in window) || Notification.permission !== 'granted') return;

        const now = new Date();
        const todayKey = formatDateKey(now);
        const todayEvents = events.filter(e => e.date === todayKey && !e.completed && e.notify !== false);

        todayEvents.forEach(evt => {
            if (!evt.time) return;

            const [h, m] = evt.time.split(':').map(Number);
            const eventTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);

            // Notify 15 minutes before
            if (settings.beforeEvent) {
                const notifyTime = new Date(eventTime.getTime() - 15 * 60 * 1000);
                const delay = notifyTime.getTime() - now.getTime();

                if (delay > 0) {
                    const timer = setTimeout(() => {
                        showSystemNotification(
                            `⏰ อีก 15 นาที: ${evt.title}`,
                            `เวลา ${formatTime(evt.time)}${evt.notes ? ' — ' + evt.notes : ''}`
                        );
                    }, delay);
                    notificationTimers.push(timer);
                }
            }
        });

        // Morning summary
        if (settings.dailySummary) {
            const [mh, mm] = settings.morningTime.split(':').map(Number);
            const morningTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), mh, mm);
            const morningDelay = morningTime.getTime() - now.getTime();

            if (morningDelay > 0) {
                const timer = setTimeout(() => {
                    const count = events.filter(e => e.date === todayKey && !e.completed).length;
                    showSystemNotification(
                        '🌅 สรุปกิจกรรมวันนี้',
                        `คุณมี ${count} กิจกรรมที่ต้องทำวันนี้`
                    );

                    if (settings.autoVoice) {
                        readTodayEvents();
                    }
                }, morningDelay);
                notificationTimers.push(timer);
            }
        }
    }

    function showSystemNotification(title, body) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body,
                icon: 'icons/icon-192.png',
                badge: 'icons/icon-192.png',
                vibrate: [200, 100, 200]
            });
        }
    }

    // ─── Settings ────────────────────────────────────────────────────
    function loadSettingsUI() {
        DOM.settingDailySummary.checked = settings.dailySummary;
        DOM.settingBeforeEvent.checked = settings.beforeEvent;
        DOM.settingAutoVoice.checked = settings.autoVoice;
        DOM.settingMorningTime.value = settings.morningTime;
    }

    function saveSettingsFromUI() {
        settings.dailySummary = DOM.settingDailySummary.checked;
        settings.beforeEvent = DOM.settingBeforeEvent.checked;
        settings.autoVoice = DOM.settingAutoVoice.checked;
        settings.morningTime = DOM.settingMorningTime.value;
        saveSettings();
        scheduleNotifications();
        showToast('บันทึกตั้งค่าเรียบร้อย', 'success');
        closeModal('modal-notifications');
    }

    // ─── Modal Helpers ───────────────────────────────────────────────
    function openModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.remove('hidden');
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
        }
    }

    function closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }

    // ─── Toast ───────────────────────────────────────────────────────
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        DOM.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ─── Service Worker ──────────────────────────────────────────────
    async function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('sw.js');
            } catch (err) {
                console.log('SW registration failed:', err);
            }
        }
    }

    // ─── Event Bindings ──────────────────────────────────────────────
    function bindEvents() {
        // Navigation
        DOM.btnPrevDay.addEventListener('click', () => navigateDay(-1));
        DOM.btnNextDay.addEventListener('click', () => navigateDay(1));

        // Return to today on double tap/click
        DOM.dateInfo.addEventListener('dblclick', () => {
            currentDate = new Date();
            updateDateDisplay();
            renderEvents();
            showToast('กลับสู่วันนี้', 'info');
        });

        // Add event
        DOM.btnAdd.addEventListener('click', openAddEvent);

        // Event form submit
        DOM.eventForm.addEventListener('submit', handleEventSubmit);

        // Delete event
        DOM.btnDeleteEvent.addEventListener('click', () => {
            const id = DOM.eventId.value;
            if (id && confirm('ลบกิจกรรมนี้?')) {
                deleteEvent(id);
                closeModal('modal-event');
            }
        });

        // Voice reading
        DOM.btnVoice.addEventListener('click', readTodayEvents);

        // Import
        DOM.btnImport.addEventListener('click', () => {
            DOM.importStatus.classList.add('hidden');
            DOM.icsUrl.value = localStorage.getItem(STORAGE_KEYS.ICS_URL) || '';
            openModal('modal-import');
        });
        DOM.btnImportSubmit.addEventListener('click', handleImport);
        DOM.icsFile.addEventListener('change', () => {
            DOM.icsFileName.textContent = DOM.icsFile.files[0]?.name || '';
        });

        // Notification settings
        DOM.btnNotifSettings.addEventListener('click', () => {
            loadSettingsUI();
            updateNotificationStatus();
            openModal('modal-notifications');
        });
        DOM.btnRequestPermission.addEventListener('click', requestNotificationPermission);
        DOM.btnSaveSettings.addEventListener('click', saveSettingsFromUI);

        // Close modals
        $$('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                closeModal(btn.dataset.close);
            });
        });

        $$('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    closeModal(overlay.id);
                }
            });
        });

        // Swipe navigation for mobile
        let touchStartX = 0;
        let touchEndX = 0;

        document.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            const diff = touchStartX - touchEndX;

            if (Math.abs(diff) > 80) {
                if (diff > 0) {
                    navigateDay(1); // Swipe left = next day
                } else {
                    navigateDay(-1); // Swipe right = prev day
                }
            }
        }, { passive: true });
    }

    // ─── Start ───────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', init);
})();
