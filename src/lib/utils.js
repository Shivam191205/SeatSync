import { CYCLE_START, HOLIDAYS } from './constants';

export function dateKey(d) {
    const dt = d instanceof Date ? d : new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

export function getWeekType(d) {
    const dt = d instanceof Date ? d : new Date(d);
    const monday = new Date(dt);
    monday.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const start = new Date(CYCLE_START);
    start.setHours(0, 0, 0, 0);
    const diffWeeks = Math.round((monday - start) / (7 * 24 * 60 * 60 * 1000));
    return ((diffWeeks % 2) + 2) % 2 === 0 ? 1 : 2;
}

export function getScheduledBatch(d) {
    const dt = d instanceof Date ? d : new Date(d);
    const dow = dt.getDay();
    if (dow === 0 || dow === 6) return 0;
    const wt = getWeekType(d);
    if (wt === 1) return dow <= 3 ? 1 : 2;
    return dow <= 3 ? 2 : 1;
}

export function isHoliday(d) {
    return HOLIDAYS[dateKey(d)] || null;
}

export function isPast(d) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dt = new Date(d); dt.setHours(0, 0, 0, 0);
    return dt < today;
}

export function isToday(d) {
    return dateKey(d) === dateKey(new Date());
}

export function isBookingOpen(targetDate) {
    const target = new Date(targetDate); target.setHours(0,0,0,0);
    const now = new Date();
    const today = new Date(); today.setHours(0,0,0,0);
    
    // Can't book past or today
    if (target <= today) return false;
    
    // Find "Previous Day"
    const prevDay = new Date(target);
    prevDay.setDate(prevDay.getDate() - 1);
    prevDay.setHours(0,0,0,0);
    
    // Check if we have already reached or passed the "Previous Day"
    if (now < prevDay) return false;
    
    // If "today" is the previous day, check time/holiday
    if (dateKey(now) === dateKey(prevDay)) {
        if (isHoliday(prevDay)) return true; // Holiday: Open all day
        return now.getHours() >= 15; // Otherwise: 3 PM
    }
    
    // If "today" is even later than the previous day (e.g. today is Tuesday, target is Thursday)
    // Actually, target > today and now >= previous day implies today is the previous day or later.
    return true;
}

export function getCycleMonday(offset, baseDate = new Date()) {
    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() - ((baseDate.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const wt = getWeekType(monday);
    if (wt === 2) monday.setDate(monday.getDate() - 7);
    monday.setDate(monday.getDate() + offset * 14);
    return monday;
}

export function getWeekDays(mondayDate, numDays) {
    const days = [];
    for (let i = 0; i < numDays; i++) {
        const d = new Date(mondayDate);
        d.setDate(mondayDate.getDate() + i);
        if (d.getDay() !== 0 && d.getDay() !== 6) days.push(new Date(d));
    }
    return days;
}

export function formatDateShort(d) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${d.getDate()} ${months[d.getMonth()]}`;
}

export function formatDateFull(d) {
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
