// ===== SEATSYNC — APPLICATION LOGIC =====

// ===== CONFIGURATION =====
const CYCLE_START = new Date(2026, 3, 6); // April 6, 2026 — Week 1 Monday
const BOOKING_CUTOFF_HOUR = 15; // 3 PM

const HOLIDAYS = {
    '2026-01-26': 'Republic Day', '2026-03-10': 'Holi', '2026-04-02': 'Ram Navami',
    '2026-04-10': 'Good Friday', '2026-04-14': 'Ambedkar Jayanti', '2026-05-01': 'May Day',
    '2026-08-15': 'Independence Day', '2026-10-02': 'Gandhi Jayanti', '2026-10-20': 'Dussehra',
    '2026-11-09': 'Diwali', '2026-11-10': 'Diwali Day 2', '2026-11-27': 'Guru Nanak Jayanti',
    '2026-12-25': 'Christmas',
};

const SQUAD_DATA = [
    { id: 1, name: 'Alpha', batch: 1 }, { id: 2, name: 'Beta', batch: 1 },
    { id: 3, name: 'Gamma', batch: 1 }, { id: 4, name: 'Delta', batch: 1 },
    { id: 5, name: 'Epsilon', batch: 1 }, { id: 6, name: 'Zeta', batch: 2 },
    { id: 7, name: 'Eta', batch: 2 }, { id: 8, name: 'Theta', batch: 2 },
    { id: 9, name: 'Iota', batch: 2 }, { id: 10, name: 'Kappa', batch: 2 },
];

const EMPLOYEE_NAMES = [
    ['Shivam Sharma','Priya Patel','Rohan Gupta','Sneha Reddy','Vikram Singh','Ananya Joshi','Karthik Nair','Meera Iyer'],
    ['Arjun Kumar','Divya Banerjee','Ishaan Malhotra','Kavya Rao','Nikhil Verma','Pooja Choudhury','Rahul Menon','Sana Khan'],
    ['Aditya Mishra','Bhavna Desai','Chirag Thakur','Diya Hegde','Gaurav Pandey','Harini Suresh','Jai Kapoor','Lakshmi Prasad'],
    ['Amit Tiwari','Deepa Kulkarni','Farhan Qureshi','Geeta Yadav','Harsh Srivastava','Isha Bhatt','Kunal Saxena','Mansi Agarwal'],
    ['Abhishek Das','Chitra Naik','Dev Bose','Fatima Syed','Girish Rathore','Hema Pillai','Jasmin Fernandes','Kiran Shetty'],
    ['Manoj Chauhan','Neha Goswami','Om Rajput','Pallavi Jain','Rajesh Dubey','Shilpa Mehta','Tushar Biswas','Uma Devi'],
    ['Ajay Rawat','Bharat Sethi','Chandan Mohan','Damini Khatri','Gaurav Dhawan','Heena Sheikh','Ivan DSouza','Jyoti Bhat'],
    ['Akash Arora','Bindu Chawla','Dhanush Murthy','Ekta Saini','Faisal Ansari','Gauri Kadam','Hemant Roy','Indira Nambiar'],
    ['Animesh Ghosh','Brij Tandon','Charu Bhargava','Dev Prakash','Ela More','Firoz Pathan','Gitanjali Sen','Himanshu Tyagi'],
    ['Ashwin Pai','Bhumika Purohit','Chiranjeev Rana','Durga Vyas','Eshwar Iyengar','Falguni Trivedi','Ganesh Mistry','Hansa Parikh'],
];

const ZONES = ['A', 'B', 'C', 'D', 'E'];

// ===== BUILD DATA =====
const employees = [];
const seats = [];

function buildData() {
    SQUAD_DATA.forEach((squad, si) => {
        EMPLOYEE_NAMES[si].forEach((name, mi) => {
            employees.push({ id: `E${si * 8 + mi + 1}`, name, squadId: squad.id, squadName: squad.name, batch: squad.batch, seatIndex: mi });
        });
    });
    ZONES.forEach(z => { for (let i = 1; i <= 8; i++) seats.push({ id: `${z}${i}`, zone: z, type: 'fixed', pos: i }); });
    for (let i = 1; i <= 10; i++) seats.push({ id: `F${i}`, zone: 'F', type: 'floater', pos: i });
}

// ===== STATE =====
let state = {
    currentUserId: 'E1',
    selectedDate: null,
    cycleOffset: 0,
};

// ===== STORAGE =====
function getActions() { return JSON.parse(localStorage.getItem('seatsync_actions') || '[]'); }
function saveActions(actions) { localStorage.setItem('seatsync_actions', JSON.stringify(actions)); }

function addAction(dateKey, seatId, employeeId, type) {
    const actions = getActions();
    // Remove any existing action for same date+seat+employee
    const filtered = actions.filter(a => !(a.dateKey === dateKey && a.seatId === seatId && a.employeeId === employeeId));
    filtered.push({ dateKey, seatId, employeeId, type, timestamp: Date.now() });
    saveActions(filtered);
}

function removeAction(dateKey, seatId, employeeId, type) {
    const actions = getActions();
    saveActions(actions.filter(a => !(a.dateKey === dateKey && a.seatId === seatId && a.employeeId === employeeId && a.type === type)));
}

function getVacations() { return JSON.parse(localStorage.getItem('seatsync_vacations') || '[]'); }
function saveVacations(vacations) { localStorage.setItem('seatsync_vacations', JSON.stringify(vacations)); }

function addVacation(employeeId, startDate, endDate, leaveType, isPenalty) {
    const vacations = getVacations();
    vacations.push({ id: Date.now().toString(), employeeId, startDate, endDate, leaveType, isPenalty, createdAt: Date.now() });
    saveVacations(vacations);
}

function deleteVacation(id) {
    saveVacations(getVacations().filter(v => v.id !== id));
}

// ===== DATE HELPERS =====
function dateKey(d) {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function getWeekType(d) {
    const dt = new Date(d);
    const monday = new Date(dt);
    monday.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const start = new Date(CYCLE_START);
    start.setHours(0, 0, 0, 0);
    const diffWeeks = Math.round((monday - start) / (7 * 24 * 60 * 60 * 1000));
    return ((diffWeeks % 2) + 2) % 2 === 0 ? 1 : 2;
}

function getScheduledBatch(d) {
    const dt = new Date(d);
    const dow = dt.getDay();
    if (dow === 0 || dow === 6) return 0;
    const wt = getWeekType(d);
    if (wt === 1) return dow <= 3 ? 1 : 2;
    return dow <= 3 ? 2 : 1;
}

function isHoliday(d) { return HOLIDAYS[dateKey(d)] || null; }

function isToday(d) { return dateKey(d) === dateKey(new Date()); }

function isPast(d) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dt = new Date(d); dt.setHours(0, 0, 0, 0);
    return dt < today;
}

function isBookingLocked(d) {
    if (isPast(d)) return true;
    if (isToday(d) && new Date().getHours() >= BOOKING_CUTOFF_HOUR) return true;
    return false;
}

function getCycleMonday(offset) {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    // Adjust to cycle start (week 1 monday)
    const wt = getWeekType(monday);
    if (wt === 2) monday.setDate(monday.getDate() - 7);
    monday.setDate(monday.getDate() + offset * 14);
    return monday;
}

function getWeekDays(mondayDate, numDays) {
    const days = [];
    for (let i = 0; i < numDays; i++) {
        const d = new Date(mondayDate);
        d.setDate(mondayDate.getDate() + i);
        if (d.getDay() !== 0 && d.getDay() !== 6) days.push(new Date(d));
    }
    return days;
}

function formatDate(d) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${d.getDate()} ${months[d.getMonth()]}`;
}

function formatDateFull(d) {
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ===== SEAT ALLOCATION ENGINE =====
function getSeatAllocations(d) {
    const dk = dateKey(d);
    const batch = getScheduledBatch(d);
    const hol = isHoliday(d);
    const alloc = {};
    const actions = getActions();

    if (batch === 0 || hol) {
        seats.forEach(s => { alloc[s.id] = { seat: s, status: hol ? 'holiday' : 'weekend', employee: null }; });
        return alloc;
    }

    // Auto-assign fixed seats to on-duty batch
    const batchSquads = SQUAD_DATA.filter(sq => sq.batch === batch);
    batchSquads.forEach((squad, zoneIdx) => {
        const zone = ZONES[zoneIdx];
        const squadEmployees = employees.filter(e => e.squadId === squad.id);
        squadEmployees.forEach((emp, idx) => {
            const seatId = `${zone}${idx + 1}`;
            // Check if released
            const isReleased = actions.some(a => a.dateKey === dk && a.seatId === seatId && a.employeeId === emp.id && a.type === 'release');
            // Check if on vacation
            const vacations = getVacations();
            const onVacation = vacations.some(v => v.employeeId === emp.id && dk >= v.startDate && dk <= v.endDate);
            
            // Check if someone booked this released seat
            const booking = actions.find(a => a.dateKey === dk && a.seatId === seatId && a.type === 'book');
            if (isReleased || onVacation) {
                if (booking) {
                    const booker = employees.find(e => e.id === booking.employeeId);
                    alloc[seatId] = { seat: seats.find(s => s.id === seatId), status: 'booked', employee: booker, releasedBy: emp };
                } else {
                    alloc[seatId] = { seat: seats.find(s => s.id === seatId), status: 'released', employee: null, releasedBy: emp, isVacation: onVacation };
                }
            } else {
                alloc[seatId] = { seat: seats.find(s => s.id === seatId), status: 'occupied', employee: emp };
            }
        });
    });

    // Floater seats
    for (let i = 1; i <= 10; i++) {
        const seatId = `F${i}`;
        const booking = actions.find(a => a.dateKey === dk && a.seatId === seatId && a.type === 'book');
        if (booking) {
            const booker = employees.find(e => e.id === booking.employeeId);
            alloc[seatId] = { seat: seats.find(s => s.id === seatId), status: 'booked', employee: booker };
        } else {
            alloc[seatId] = { seat: seats.find(s => s.id === seatId), status: 'available', employee: null };
        }
    }

    return alloc;
}

// ===== CURRENT USER HELPERS =====
function currentUser() { return employees.find(e => e.id === state.currentUserId); }

function getUserSeatForDate(d) {
    const alloc = getSeatAllocations(d);
    for (const [seatId, info] of Object.entries(alloc)) {
        if (info.employee && info.employee.id === state.currentUserId) return { seatId, ...info };
    }
    return null;
}

// ===== RENDERING =====
function renderApp() {
    renderHeader();
    renderInfoBar();
    renderCalendar();
    renderStats();
    renderLegend();
    renderSeatMap();
    renderMySchedule();
}

function renderHeader() {
    const user = currentUser();
    document.getElementById('user-select').value = state.currentUserId;
    const wt = getWeekType(state.selectedDate);
    document.querySelector('.week-badge').innerHTML = `<span class="dot" style="background:${wt === 1 ? 'var(--batch1)' : 'var(--batch2)'}"></span> Week ${wt} of 2`;
    updateClock();
}

function updateClock() {
    const now = new Date();
    const h = now.getHours(), m = now.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    document.querySelector('.clock').textContent = `${((h % 12) || 12)}:${String(m).padStart(2, '0')} ${ampm}`;
}

function renderInfoBar() {
    const user = currentUser();
    const batch = getScheduledBatch(state.selectedDate);
    const hol = isHoliday(state.selectedDate);
    const bar = document.querySelector('.info-bar');
    let batchLabel = `Your Batch: <strong>Batch ${user.batch} (${user.squadName})</strong>`;
    let statusHtml = '';
    if (hol) {
        statusHtml = `<span class="day-status holiday">🏖️ Holiday — ${hol}</span>`;
    } else if (batch === 0) {
        statusHtml = `<span class="day-status weekend">Weekend</span>`;
    } else if (batch === user.batch) {
        statusHtml = `<span class="day-status b${batch}">✅ Your Designated Day</span>`;
    } else {
        statusHtml = `<span class="day-status b${batch}">Batch ${batch}'s Day</span>`;
    }
    bar.innerHTML = `<div class="batch-label">${batchLabel}</div>${statusHtml}`;
}

function renderCalendar() {
    const cycleMonday = getCycleMonday(state.cycleOffset);
    const w1Monday = new Date(cycleMonday);
    const w2Monday = new Date(cycleMonday); w2Monday.setDate(w2Monday.getDate() + 7);
    const w1Days = getWeekDays(w1Monday, 7);
    const w2Days = getWeekDays(w2Monday, 7);
    const wt1 = getWeekType(w1Monday);
    const wt2 = wt1 === 1 ? 2 : 1;

    document.querySelector('.cal-title').textContent = `${formatDate(w1Monday)} — ${formatDate(new Date(w2Monday.getTime() + 4 * 86400000))}`;

    const renderDays = (days, containerId) => {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        days.forEach(d => {
            const batch = getScheduledBatch(d);
            const hol = isHoliday(d);
            const sel = dateKey(d) === dateKey(state.selectedDate);
            const today = isToday(d);
            let cls = 'day-card';
            if (sel) cls += batch === 2 ? ' selected b2-day' : ' selected';
            if (today) cls += ' today';
            if (hol) cls += ' holiday-day';
            let batchBadge = '';
            if (hol) batchBadge = `<span class="day-batch hol">Holiday</span>`;
            else if (batch === 1) batchBadge = `<span class="day-batch b1">B1</span>`;
            else if (batch === 2) batchBadge = `<span class="day-batch b2">B2</span>`;
            const card = document.createElement('div');
            card.className = cls;
            card.innerHTML = `<div class="day-name">${DAY_NAMES[d.getDay()]}</div><div class="day-num">${d.getDate()}</div>${batchBadge}`;
            card.onclick = () => { state.selectedDate = new Date(d); renderApp(); };
            container.appendChild(card);
        });
    };

    document.getElementById('w1-label').textContent = `Week ${wt1} — ${formatDate(w1Monday)} to ${formatDate(w1Days[w1Days.length - 1])}`;
    document.getElementById('w2-label').textContent = `Week ${wt2} — ${formatDate(w2Monday)} to ${formatDate(w2Days[w2Days.length - 1])}`;
    renderDays(w1Days, 'w1-days');
    renderDays(w2Days, 'w2-days');
}

function renderStats() {
    const alloc = getSeatAllocations(state.selectedDate);
    let total = 50, occupied = 0, available = 0, released = 0, booked = 0;
    Object.values(alloc).forEach(a => {
        if (a.status === 'occupied') occupied++;
        else if (a.status === 'available' || a.status === 'released') { available++; if (a.status === 'released') released++; }
        else if (a.status === 'booked') booked++;
    });
    occupied += booked;
    const utilPct = Math.round(((occupied) / total) * 100);
    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-occupied').textContent = occupied;
    document.getElementById('stat-available').textContent = available;
    document.getElementById('stat-released').textContent = released;
    document.getElementById('stat-util').textContent = utilPct + '%';
}

function renderLegend() { /* static HTML, no dynamic render needed */ }

function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function renderSeatMap() {
    const alloc = getSeatAllocations(state.selectedDate);
    const batch = getScheduledBatch(state.selectedDate);
    const hol = isHoliday(state.selectedDate);
    const user = currentUser();
    const locked = isBookingLocked(state.selectedDate);
    const past = isPast(state.selectedDate);
    // Check if user already has a seat (auto-assigned or booked) for this date
    const userHasSeat = getUserSeatForDate(state.selectedDate);
    const floorPlan = document.getElementById('floor-plan');
    floorPlan.innerHTML = '';

    document.getElementById('seatmap-date').textContent = formatDateFull(state.selectedDate);

    if (hol) {
        floorPlan.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;">
            <div style="font-size:48px;margin-bottom:12px;">🏖️</div>
            <h3 style="color:var(--holiday);margin-bottom:8px;">Holiday — ${hol}</h3>
            <p style="color:var(--text-muted);font-size:14px;">No bookings available on holidays. Enjoy your day off!</p></div>`;
        return;
    }
    if (batch === 0) {
        floorPlan.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;">
            <div style="font-size:48px;margin-bottom:12px;">📅</div>
            <h3 style="color:var(--text-muted);margin-bottom:8px;">Weekend</h3>
            <p style="color:var(--text-muted);font-size:14px;">Office is closed on weekends.</p></div>`;
        return;
    }

    const batchSquads = SQUAD_DATA.filter(sq => sq.batch === batch);

    // Render fixed zones
    ZONES.forEach((zone, zi) => {
        const squad = batchSquads[zi];
        const zoneCard = document.createElement('div');
        zoneCard.className = 'zone-card';
        zoneCard.innerHTML = `<div class="zone-header"><h3>Zone ${zone}</h3><span class="squad-badge b${batch}">${squad.name} · Batch ${batch}</span></div>`;
        const grid = document.createElement('div');
        grid.className = 'seats-grid';
        for (let i = 1; i <= 8; i++) {
            const seatId = `${zone}${i}`;
            const info = alloc[seatId];
            grid.appendChild(createSeatElement(seatId, info, user, locked, past, batch, userHasSeat));
        }
        zoneCard.appendChild(grid);
        floorPlan.appendChild(zoneCard);
    });

    // Floater zone
    const floaterCard = document.createElement('div');
    floaterCard.className = 'zone-card floater-zone';
    floaterCard.innerHTML = `<div class="zone-header"><h3>🔄 Floater Zone</h3><span class="squad-badge" style="background:var(--available-bg);color:var(--available);">10 Flex Seats</span></div>`;
    const fGrid = document.createElement('div');
    fGrid.className = 'seats-grid';
    for (let i = 1; i <= 10; i++) {
        const seatId = `F${i}`;
        const info = alloc[seatId];
        fGrid.appendChild(createSeatElement(seatId, info, user, locked, past, batch, userHasSeat));
    }
    floaterCard.appendChild(fGrid);
    floorPlan.appendChild(floaterCard);
}

function createSeatElement(seatId, info, user, locked, past, scheduledBatch, userHasSeat) {
    const el = document.createElement('div');
    el.className = 'seat';
    const isYours = info.employee && info.employee.id === user.id;
    // User cannot book another seat if they already have one for this day
    const canBook = !locked && !past && !userHasSeat;

    if (info.status === 'occupied') {
        el.classList.add(isYours ? 'your-seat' : (info.employee.batch === 2 ? 'occupied-b2' : 'occupied'));
        el.innerHTML = `<span class="seat-id">${seatId}</span><div class="seat-avatar">${getInitials(info.employee.name)}</div><span class="seat-name">${info.employee.name.split(' ')[0]}</span>`;
        el.title = `${seatId} — ${info.employee.name}\n${info.employee.squadName} · Batch ${info.employee.batch}${isYours ? '\n★ Your Seat (click to release)' : ''}`;
        if (isYours && !locked && !past) {
            el.onclick = () => confirmRelease(seatId, info.employee);
        }
    } else if (info.status === 'released') {
        el.classList.add('released');
        el.innerHTML = `<span class="seat-id">${seatId}</span><div class="seat-avatar" style="background:var(--released);">✕</div><span class="seat-name">Released</span>`;
        // Only allow booking if user has NO seat for this day
        if (canBook && user.batch !== scheduledBatch) {
            el.title = `${seatId} — Released by ${info.releasedBy.name}\nClick to book`;
            el.onclick = () => confirmBook(seatId);
        } else if (!locked && !past && info.releasedBy && info.releasedBy.id === user.id) {
            el.title = `${seatId} — Released by you\nClick to undo release`;
            el.onclick = () => confirmCancelRelease(seatId, info.releasedBy);
        } else {
            el.title = `${seatId} — Released by ${info.releasedBy.name}`;
            if (userHasSeat) {
                el.title += `\n🔒 You already have seat ${userHasSeat.seatId}`;
                el.classList.add('locked-seat');
            }
        }
    } else if (info.status === 'available') {
        el.classList.add('available', 'floater-seat');
        // Only allow booking if user has NO seat for this day
        if (canBook) {
            el.innerHTML = `<span class="seat-id">${seatId}</span><div class="seat-avatar" style="background:var(--available);opacity:0.3;">+</div><span class="seat-name">Available</span>`;
            el.title = `${seatId} — Floater Seat\nClick to book`;
            el.onclick = () => confirmBook(seatId);
        } else {
            el.innerHTML = `<span class="seat-id">${seatId}</span><div class="seat-avatar" style="background:var(--locked);opacity:0.3;">—</div><span class="seat-name">Available</span>`;
            if (userHasSeat) {
                el.title = `${seatId} — Floater Seat\n🔒 You already have seat ${userHasSeat.seatId}`;
            } else {
                el.title = `${seatId} — Floater Seat`;
            }
            el.classList.add('locked-seat');
        }
    } else if (info.status === 'booked') {
        const isYoursBooked = info.employee && info.employee.id === user.id;
        el.classList.add(isYoursBooked ? 'your-seat' : 'booked');
        el.innerHTML = `<span class="seat-id">${seatId}</span><div class="seat-avatar">${getInitials(info.employee.name)}</div><span class="seat-name">${info.employee.name.split(' ')[0]}</span>`;
        el.title = `${seatId} — Booked by ${info.employee.name}\n${info.employee.squadName} · Batch ${info.employee.batch}${isYoursBooked ? '\n★ Your Booking (click to cancel)' : ''}`;
        if (isYoursBooked && !locked && !past) {
            el.onclick = () => confirmCancelBooking(seatId, info.employee);
        }
    }

    if (locked && (info.status === 'available' || info.status === 'released')) {
        el.classList.add('locked-seat');
        el.title += past ? '\n🔒 Past date' : '\n🔒 Booking closed (after 3 PM)';
    }

    return el;
}

// ===== MY SCHEDULE =====
function renderMySchedule() {
    const tbody = document.getElementById('schedule-body');
    tbody.innerHTML = '';
    const user = currentUser();
    const cycleMonday = getCycleMonday(state.cycleOffset);
    const allDays = [];
    for (let i = 0; i < 14; i++) {
        const d = new Date(cycleMonday);
        d.setDate(cycleMonday.getDate() + i);
        if (d.getDay() !== 0 && d.getDay() !== 6) allDays.push(d);
    }

    allDays.forEach(d => {
        const dk = dateKey(d);
        const batch = getScheduledBatch(d);
        const hol = isHoliday(d);
        const locked = isBookingLocked(d);
        const past = isPast(d);
        const today = isToday(d);
        const actions = getActions();

        const tr = document.createElement('tr');
        if (today) tr.style.background = 'rgba(59,130,246,0.06)';

        let statusHtml = '', seatHtml = '—', actionHtml = '';

        if (hol) {
            statusHtml = `<span class="status-badge" style="background:var(--holiday-bg);color:var(--holiday);">Holiday</span>`;
        } else if (batch === user.batch) {
            // Designated day — find their auto-assigned seat
            const batchSquads = SQUAD_DATA.filter(sq => sq.batch === batch);
            const squadIdx = batchSquads.findIndex(sq => sq.id === user.squadId);
            const zone = ZONES[squadIdx];
            const seatId = `${zone}${user.seatIndex + 1}`;
            const isReleased = actions.some(a => a.dateKey === dk && a.seatId === seatId && a.employeeId === user.id && a.type === 'release');

            if (isReleased) {
                statusHtml = `<span class="status-badge released-badge">Released</span>`;
                seatHtml = `<span style="text-decoration:line-through;opacity:0.5;">${seatId}</span>`;
                if (!locked && !past) actionHtml = `<button class="action-btn cancel" onclick="confirmCancelRelease('${seatId}', ${JSON.stringify(user).replace(/"/g, '&quot;')})">Undo</button>`;
            } else {
                statusHtml = `<span class="status-badge auto">Auto-Assigned</span>`;
                seatHtml = `<strong>${seatId}</strong>`;
                if (!locked && !past) actionHtml = `<button class="action-btn release" onclick="confirmRelease('${seatId}', ${JSON.stringify(user).replace(/"/g, '&quot;')})">Release</button>`;
            }
        } else {
            // Off day — check if booked a floater
            const booking = actions.find(a => a.dateKey === dk && a.employeeId === user.id && a.type === 'book');
            if (booking) {
                statusHtml = `<span class="status-badge booked-badge">Booked</span>`;
                seatHtml = `<strong>${booking.seatId}</strong>`;
                if (!locked && !past) actionHtml = `<button class="action-btn cancel" onclick="confirmCancelBooking('${booking.seatId}', ${JSON.stringify(user).replace(/"/g, '&quot;')})">Cancel</button>`;
            } else {
                statusHtml = `<span class="status-badge off">Off Day</span>`;
            }
        }

        tr.innerHTML = `<td>${today ? '📍 ' : ''}${formatDate(d)}</td><td>${DAY_NAMES[d.getDay()]}</td><td>${statusHtml}</td><td>${seatHtml}</td><td>${actionHtml}</td>`;
        tbody.appendChild(tr);
    });
}

// ===== CONFIRMATION MODALS =====
function showModal(title, message, confirmText, confirmClass, onConfirm) {
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').innerHTML = message;
    const confirmBtn = document.getElementById('modal-confirm');
    confirmBtn.textContent = confirmText;
    confirmBtn.className = `modal-btn ${confirmClass}`;
    confirmBtn.onclick = () => { onConfirm(); hideModal(); };
    overlay.classList.add('active');
}

function hideModal() { document.getElementById('modal-overlay').classList.remove('active'); }

function confirmRelease(seatId, employee) {
    const dk = dateKey(state.selectedDate);
    if (isBookingLocked(state.selectedDate)) return showToast('Booking is locked for this date', 'error');
    showModal('Release Seat', `Release seat <strong>${seatId}</strong> on <strong>${formatDateFull(state.selectedDate)}</strong>?<br><br>This will mark you as on vacation and free up the seat for others.`, 'Release Seat', 'danger', () => {
        addAction(dk, seatId, employee.id, 'release');
        showToast(`Seat ${seatId} released successfully!`, 'success');
        renderApp();
    });
}

function confirmCancelRelease(seatId, employee) {
    const dk = dateKey(state.selectedDate);
    showModal('Undo Release', `Re-claim seat <strong>${seatId}</strong> on <strong>${formatDateFull(state.selectedDate)}</strong>?`, 'Re-claim Seat', 'primary', () => {
        removeAction(dk, seatId, employee.id, 'release');
        // Also remove any booking on this seat since the original owner is back
        const actions = getActions();
        saveActions(actions.filter(a => !(a.dateKey === dk && a.seatId === seatId && a.type === 'book')));
        showToast(`Seat ${seatId} re-claimed!`, 'info');
        renderApp();
    });
}

function confirmBook(seatId) {
    const dk = dateKey(state.selectedDate);
    const user = currentUser();
    if (isBookingLocked(state.selectedDate)) return showToast('Booking is locked for this date', 'error');

    // RULE: One person = one seat per day (safety check, also enforced in UI)
    const existing = getUserSeatForDate(state.selectedDate);
    if (existing) return showToast(`❌ You already have seat ${existing.seatId} for this date. One person cannot hold two seats.`, 'warning');

    // Double-check: if on-duty batch member hasn't released their seat, block booking
    const batch = getScheduledBatch(state.selectedDate);
    if (batch === user.batch) {
        const actions = getActions();
        const batchSquads = SQUAD_DATA.filter(sq => sq.batch === batch);
        const squadIdx = batchSquads.findIndex(sq => sq.id === user.squadId);
        const zone = ZONES[squadIdx];
        const autoSeatId = `${zone}${user.seatIndex + 1}`;
        const isReleased = actions.some(a => a.dateKey === dk && a.seatId === autoSeatId && a.employeeId === user.id && a.type === 'release');
        if (!isReleased) return showToast(`❌ You already have auto-assigned seat ${autoSeatId}. Release it first if you want a different seat.`, 'warning');
    }

    // Also check if user already booked another seat for this date
    const actions = getActions();
    const existingBooking = actions.find(a => a.dateKey === dk && a.employeeId === user.id && a.type === 'book');
    if (existingBooking) return showToast(`❌ You already booked seat ${existingBooking.seatId} for this date. Cancel it first.`, 'warning');

    showModal('Book Seat', `Book seat <strong>${seatId}</strong> on <strong>${formatDateFull(state.selectedDate)}</strong>?<br><br><small style="color:var(--text-muted);">You can only hold one seat per day.</small>`, 'Confirm Booking', 'primary', () => {
        addAction(dk, seatId, user.id, 'book');
        showToast(`Seat ${seatId} booked successfully!`, 'success');
        createConfetti();
        renderApp();
    });
}

function confirmCancelBooking(seatId, employee) {
    const dk = dateKey(state.selectedDate);
    showModal('Cancel Booking', `Cancel your booking for seat <strong>${seatId}</strong> on <strong>${formatDateFull(state.selectedDate)}</strong>?`, 'Cancel Booking', 'danger', () => {
        removeAction(dk, seatId, employee.id, 'book');
        showToast(`Booking for ${seatId} cancelled`, 'info');
        renderApp();
    });
}

// ===== TOAST =====
function showToast(message, type) {
    const container = document.getElementById('toast-container');
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100%)'; setTimeout(() => toast.remove(), 300); }, 3500);
}

// ===== USER SELECTOR =====
function populateUserSelect() {
    const sel = document.getElementById('user-select');
    sel.innerHTML = '';
    SQUAD_DATA.forEach(squad => {
        const group = document.createElement('optgroup');
        group.label = `${squad.name} (Batch ${squad.batch})`;
        employees.filter(e => e.squadId === squad.id).forEach(emp => {
            const opt = document.createElement('option');
            opt.value = emp.id;
            opt.textContent = emp.name;
            group.appendChild(opt);
        });
        sel.appendChild(group);
    });
    sel.value = state.currentUserId;
    sel.onchange = () => { state.currentUserId = sel.value; renderApp(); };
}

// ===== CONFETTI =====
function createConfetti() {
    const container = document.getElementById('confetti-container');
    if (!container) return;
    const colors = ['#06b6d4','#8b5cf6','#10b981','#f59e0b','#3b82f6','#ec4899'];
    for (let i = 0; i < 60; i++) {
        const p = document.createElement('div');
        p.className = 'confetti-particle';
        p.style.left = `${40 + Math.random() * 20}%`;
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        p.style.animationDelay = `${Math.random() * 0.4}s`;
        p.style.animationDuration = `${1.2 + Math.random() * 1.5}s`;
        p.style.width = `${6 + Math.random() * 6}px`;
        p.style.height = `${6 + Math.random() * 6}px`;
        p.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        container.appendChild(p);
    }
    setTimeout(() => container.innerHTML = '', 3000);
}

// ===== EMPLOYEE SEARCH =====
function handleSearch(query) {
    document.querySelectorAll('.seat.search-highlight').forEach(el => el.classList.remove('search-highlight'));
    const badge = document.getElementById('search-result-badge');
    if (!query || query.length < 2) { if (badge) badge.textContent = ''; return; }
    const alloc = getSeatAllocations(state.selectedDate);
    const matchIds = [];
    for (const [seatId, info] of Object.entries(alloc)) {
        if (info.employee && info.employee.name.toLowerCase().includes(query.toLowerCase())) matchIds.push(seatId);
    }
    if (badge) badge.textContent = matchIds.length > 0 ? `${matchIds.length} found` : 'No match';
    document.querySelectorAll('.seat').forEach(el => {
        const sid = el.querySelector('.seat-id')?.textContent;
        if (sid && matchIds.includes(sid)) {
            el.classList.add('search-highlight');
            if (matchIds.indexOf(sid) === 0) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
}

// ===== KEYBOARD NAVIGATION =====
function setupKeyboard() {
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault();
            const dir = e.key === 'ArrowRight' ? 1 : -1;
            const d = new Date(state.selectedDate);
            d.setDate(d.getDate() + dir);
            if (d.getDay() === 0) d.setDate(d.getDate() + dir);
            if (d.getDay() === 6) d.setDate(d.getDate() + dir);
            state.selectedDate = d;
            renderApp();
        }
        if (e.key === 'Escape') hideModal();
    });
}

// ===== CURSOR GLOW =====
function setupCursorGlow() {
    const glow = document.getElementById('cursor-glow');
    if (!glow) return;
    let mouseX = 0, mouseY = 0, glowX = 0, glowY = 0;
    document.addEventListener('mousemove', (e) => { mouseX = e.clientX; mouseY = e.clientY; });
    document.addEventListener('mousedown', () => glow.classList.add('clicking'));
    document.addEventListener('mouseup', () => glow.classList.remove('clicking'));
    function animate() {
        glowX += (mouseX - glowX) * 0.18;
        glowY += (mouseY - glowY) * 0.18;
        glow.style.left = glowX + 'px';
        glow.style.top = glowY + 'px';
        requestAnimationFrame(animate);
    }
    animate();
}

// ===== TODAY BUTTON =====
function goToToday() {
    state.cycleOffset = 0;
    state.selectedDate = new Date();
    if (state.selectedDate.getDay() === 0) state.selectedDate.setDate(state.selectedDate.getDate() + 1);
    if (state.selectedDate.getDay() === 6) state.selectedDate.setDate(state.selectedDate.getDate() + 2);
    renderApp();
    showToast('Jumped to today', 'info');
}

// ===== INIT =====
function init() {
    buildData();
    state.selectedDate = new Date();
    if (state.selectedDate.getDay() === 0) state.selectedDate.setDate(state.selectedDate.getDate() + 1);
    if (state.selectedDate.getDay() === 6) state.selectedDate.setDate(state.selectedDate.getDate() + 2);

    populateUserSelect();

    document.getElementById('prev-cycle').onclick = () => { state.cycleOffset--; renderApp(); };
    document.getElementById('next-cycle').onclick = () => { state.cycleOffset++; renderApp(); };
    document.getElementById('modal-cancel').onclick = hideModal;
    document.getElementById('modal-overlay').onclick = (e) => { if (e.target === e.currentTarget) hideModal(); };

    // Search
    const searchInput = document.getElementById('search-employee');
    if (searchInput) searchInput.addEventListener('input', (e) => handleSearch(e.target.value));

    // Today button
    const todayBtn = document.getElementById('today-btn');
    if (todayBtn) todayBtn.onclick = goToToday;

    // Keyboard navigation
    setupKeyboard();

    // Trailing cursor glow
    setupCursorGlow();

    // Vacation
    initVacationManager();

    renderApp();
    setInterval(updateClock, 30000);
}

// ===== VACATION MANAGER LOGIC =====
function initVacationManager() {
    const vBtn = document.getElementById('vacation-btn');
    const vModal = document.getElementById('vacation-modal-overlay');
    const vClose = document.getElementById('vacation-close');
    const vSave = document.getElementById('vacation-save');

    if (vBtn) vBtn.onclick = () => {
        vModal.classList.add('active');
        renderVacationManager();
    };

    if (vClose) vClose.onclick = () => {
        vModal.classList.remove('active');
    };

    if (vSave) vSave.onclick = () => {
        const startStr = document.getElementById('vacation-start').value;
        const endStr = document.getElementById('vacation-end').value;
        const leaveType = document.getElementById('leave-type').value;

        if (!startStr || !endStr) {
            showToast('Please select start and end dates.', 'error');
            return;
        }

        const start = new Date(startStr);
        const end = new Date(endStr);
        const today = new Date();
        today.setHours(0,0,0,0);

        if (start < today) {
            showToast('Vacation cannot start in the past.', 'error');
            return;
        }

        if (end < start) {
            showToast('End date cannot be before start date.', 'error');
            return;
        }

        // Calculation of duration
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        if (diffDays > 5) {
            showToast('Maximum leave period is 5 days per entry.', 'error');
            return;
        }

        const stats = getVacationStats(state.currentUserId);
        const currentYear = new Date().getFullYear();
        const isPenalty = stats.totalUsed + diffDays > 15;

        addVacation(state.currentUserId, startStr, endStr, leaveType, isPenalty);
        showToast(`Vacation saved! ${isPenalty ? '⚠️ Penalty applied for exceeding 15 days.' : ''}`, isPenalty ? 'warning' : 'success');
        
        renderVacationManager();
        renderApp();
    };
}

function getVacationStats(empId) {
    const currentYear = new Date().getFullYear().toString();
    const vacations = getVacations().filter(v => v.employeeId === empId && v.startDate.startsWith(currentYear));
    let totalUsed = 0;
    vacations.forEach(v => {
        const d1 = new Date(v.startDate);
        const d2 = new Date(v.endDate);
        const diff = Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
        totalUsed += diff;
    });
    return { totalUsed };
}

function renderVacationManager() {
    const stats = getVacationStats(state.currentUserId);
    document.getElementById('leave-balance').textContent = `${stats.totalUsed} / 15`;
    document.getElementById('penalty-notif').style.display = stats.totalUsed > 15 ? 'block' : 'none';

    const list = document.getElementById('vacation-list');
    list.innerHTML = '';
    
    const vacations = getVacations().filter(v => v.employeeId === state.currentUserId);
    
    if (vacations.length === 0) {
        list.innerHTML = '<li style="font-size:12px; color:var(--text-muted); text-align:center; padding:10px;">No vacations scheduled</li>';
    }

    vacations.sort((a,b) => a.startDate.localeCompare(b.startDate)).forEach(v => {
        const item = document.createElement('li');
        item.className = 'vac-item';
        item.innerHTML = `
            <div class="vac-details">
                <span class="vac-type">${v.leaveType}${v.isPenalty ? ' <span style="color:var(--holiday)">(Penalty)</span>' : ''}</span>
                <span class="vac-dates">${v.startDate} to ${v.endDate}</span>
            </div>
            <button class="vac-delete" onclick="handleDeleteVacation('${v.id}')">✕</button>
        `;
        list.appendChild(item);
    });
}

window.handleDeleteVacation = (id) => {
    deleteVacation(id);
    renderVacationManager();
    renderApp();
    showToast('Vacation cancelled.', 'info');
};

document.addEventListener('DOMContentLoaded', init);
