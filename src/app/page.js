'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { getInitialData, addBookingAction, removeBookingAction, saveVacation, deleteVacation } from './actions';
import { 
  dateKey, getScheduledBatch, getWeekType, getCycleMonday, getWeekDays, 
  formatDateShort, formatDateFull, isHoliday, DAY_NAMES, isPast, isToday, isBookingOpen
} from '@/lib/utils';
import { SQUAD_DATA, ZONES, BOOKING_CUTOFF_HOUR } from '@/lib/constants';
import { Search, MapPin, Calendar, Umbrella, RefreshCw, X, ChevronLeft, ChevronRight, User } from 'lucide-react';

export default function SeatSyncRoot() {
  const [state, setState] = useState({
    currentUserId: 'E1',
    selectedDate: new Date(),
    cycleOffset: 0,
    employees: [],
    actions: [],
    vacations: [],
    loading: true,
    searchQuery: '',
    searchBadge: '',
    showVacationModal: false,
    toast: null
  });

  const fetchData = useCallback(async (date) => {
    try {
      const data = await getInitialData(date);
      setState(prev => ({ ...prev, ...data, loading: false }));
    } catch (err) {
      console.error('Fetch error:', err);
      showToast('Error connecting to database', 'error');
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    // Initial fix for weekend/holiday selection
    const d = new Date();
    if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    if (d.getDay() === 6) d.setDate(d.getDate() + 2);
    setState(prev => ({ ...prev, selectedDate: d }));
    fetchData(d);
  }, [fetchData]);

  const showToast = (message, type) => {
    setState(prev => ({ ...prev, toast: { message, type } }));
    setTimeout(() => {
      setState(prev => ({ ...prev, toast: null }));
    }, 3500);
  };


  const handleDateSelect = (d) => {
    setState(prev => ({ ...prev, selectedDate: d }));
    fetchData(d);
  };

  const handleUserChange = (id) => {
    setState(prev => ({ ...prev, currentUserId: id }));
  };

  // Seat Allocation Logic
  const getAllocations = () => {
    const d = state.selectedDate;
    const dk = dateKey(d);
    const batch = getScheduledBatch(d);
    const hol = isHoliday(d);
    // Setup seats array
    ZONES.forEach(z => { for (let i = 1; i <= 8; i++) seats.push({ id: `${z}${i}`, zone: z, type: 'fixed' }); });
    for (let i = 1; i <= 10; i++) seats.push({ id: `F${i}`, zone: 'F', type: 'floater' });

    // Initialize ALL seats as potentially available
    seats.forEach(s => {
      alloc[s.id] = { seat: s, status: hol ? 'holiday' : 'weekend', employee: null };
    });

    if (batch === 0 || hol) return alloc;
    
    // Set all fixed seats to 'locked' by default for this day (unless they belong to active batch)
    seats.filter(s => s.type === 'fixed').forEach(s => {
      alloc[s.id].status = 'locked'; 
    });

    // Overwrite with Auto-assigned seats for the ACTIVE batch
    const batchSquads = SQUAD_DATA.filter(sq => sq.batch === batch);
    batchSquads.forEach((squad, zoneIdx) => {
      const zone = ZONES[zoneIdx];
      
      // Mark all seats in this active zone as 'available' first (if no one is assigned)
      for(let i=1; i<=8; i++) {
          alloc[`${zone}${i}`].status = 'available';
      }

      const squadEmployees = state.employees.filter(e => e.squadId === squad.id);
      squadEmployees.forEach((emp, idx) => {
        const seatId = `${zone}${idx + 1}`;
        const sObj = seats.find(s => s.id === seatId);
        if (!sObj) return;

        const isReleased = state.actions.some(a => a.dateKey === dk && a.seatId === seatId && a.employeeId === emp.id && a.type === 'release');
        const onVacation = state.vacations.some(v => v.employeeId === emp.id && dk >= v.startDate && dk <= v.endDate);
        const booking = state.actions.find(a => a.dateKey === dk && a.seatId === seatId && a.type === 'book');

        if (isReleased || onVacation) {
          if (booking) {
            const booker = state.employees.find(e => e.id === booking.employeeId);
            alloc[seatId] = { seat: sObj, status: 'booked', employee: booker, releasedBy: emp };
          } else {
            alloc[seatId] = { seat: sObj, status: 'released', employee: null, releasedBy: emp, isVacation: onVacation };
          }
        } else {
          alloc[seatId] = { seat: sObj, status: 'occupied', employee: emp };
        }
      });
    });

    // Floaters
    for (let i = 1; i <= 10; i++) {
        const seatId = `F${i}`;
        const booking = state.actions.find(a => a.dateKey === dk && a.seatId === seatId && a.type === 'book');
        if (booking) {
            const booker = state.employees.find(e => e.id === booking.employeeId);
            alloc[seatId] = { seat: seats.find(s => s.id === seatId), status: 'booked', employee: booker };
        } else {
            alloc[seatId] = { seat: seats.find(s => s.id === seatId), status: 'available', employee: null };
        }
    }
    return alloc;
  };

  // Helper: Get user's current seat for high-level UI
  const userSeat = () => {
    const alloc = getAllocations();
    for (const [seatId, info] of Object.entries(alloc)) {
        if (info.employee && info.employee.id === state.currentUserId) return { seatId, ...info };
    }
    return null;
  };

  if (state.loading) return <div className="loading-spinner">Loading SeatSync...</div>;

  if (state.loading) return <div className="loading-spinner">Loading SeatSync...</div>;

  const currentUser = state.employees.find(e => e.id === state.currentUserId) || state.employees[0];
  const dbEmpty = state.employees.length === 0;

  return (
    <div className="main-container">
      {dbEmpty && (
        <div className="info-bar" style={{borderStyle:'dashed', borderColor:'var(--released)', background:'var(--released-bg)', marginTop:'20px'}}>
             <span style={{color:'var(--released)', fontWeight:'600'}}>📭 Database Empty: No employee data found. Please run your seeding script.</span>
             <button className="action-btn" onClick={() => fetchData(state.selectedDate)}><RefreshCw size={12}/> Refresh</button>
        </div>
      )}
      {state.toast && (
        <div id="toast-container">
          <div className={`toast ${state.toast.type}`}>
            {state.toast.message}
          </div>
        </div>
      )}

      {state.showVacationModal && (
        <VacationModal 
          onClose={() => setState(prev => ({...prev, showVacationModal: false}))}
          currentUserId={state.currentUserId}
          vacations={state.vacations}
          onSave={async (v) => {
            await saveVacation(v);
            fetchData(state.selectedDate);
            showToast("Vacation saved!", "success");
          }}
          onDelete={async (id) => {
            await deleteVacation(id);
            fetchData(state.selectedDate);
            showToast("Vacation removed.", "info");
          }}
        />
      )}

      <Header 
        currentUserId={state.currentUserId}
        currentUser={currentUser}
        employees={state.employees}
        onUserChange={handleUserChange}
        selectedDate={state.selectedDate}
        searchQuery={state.searchQuery}
        onSearchChange={(q) => setState(prev => ({...prev, searchQuery: q}))}
        searchBadge={state.searchBadge}
      />

      <InfoBar currentUser={currentUser} selectedDate={state.selectedDate} />

      <CalendarSection 
        selectedDate={state.selectedDate}
        onDateSelect={handleDateSelect}
        offset={state.cycleOffset}
        onOffsetChange={(o) => setState(prev => ({ ...prev, cycleOffset: o }))}
        onVacationClick={() => setState(prev => ({ ...prev, showVacationModal: true }))}
      />

      <StatsStrip allocations={getAllocations()} />

      <Legend />

      <SeatMap 
        allocations={getAllocations()}
        currentUser={currentUser}
        selectedDate={state.selectedDate}
        userOnVacation={state.vacations.some(v => v.employeeId === state.currentUserId && dateKey(state.selectedDate) >= v.startDate && dateKey(state.selectedDate) <= v.endDate)}
        onAction={async (action) => {
            const dk = action.dk;
            const sid = action.sid;
            const eid = action.eid;

            if (action.type === 'book') {
                // RULE: One person = one seat per day
                const currentAlloc = getAllocations();
                const existing = Object.entries(currentAlloc).find(([_, info]) => info.employee?.id === eid);
                
                if (existing) {
                    showToast(`❌ You already have seat ${existing[0]} for this date.`, 'warning');
                    return;
                }
                await addBookingAction(dk, sid, eid, 'book');
                showToast(`Seat ${sid} booked!`, 'success');
            }
            else if (action.type === 'release') {
                await addBookingAction(dk, sid, eid, 'release');
                showToast(`Seat ${sid} released.`, 'info');
            }
            else if (action.type === 'cancel-book') {
                await removeBookingAction(dk, sid, eid, 'book');
                showToast(`Booking cancelled.`, 'info');
            }
            else if (action.type === 'cancel-release') {
                await removeBookingAction(dk, sid, eid, 'release');
                showToast(`Release undone.`, 'success');
            }
            fetchData(state.selectedDate);
        }}
        searchQuery={state.searchQuery}
        showToast={showToast}
        showVacationTrigger={() => setState(prev => ({ ...prev, showVacationModal: true }))}
      />

      <MySchedule 
        currentUser={currentUser}
        cycleOffset={state.cycleOffset}
        actions={state.actions}
        vacations={state.vacations}
        fetchData={() => fetchData(state.selectedDate)}
        onAction={async (action) => {
          const dk = action.dk;
          const sid = action.sid;
          const eid = action.eid;
          if (action.type === 'release') await addBookingAction(dk, sid, eid, 'release');
          else if (action.type === 'cancel-book') await removeBookingAction(dk, sid, eid, 'book');
          else if (action.type === 'cancel-release') await removeBookingAction(dk, sid, eid, 'release');
          fetchData(state.selectedDate);
        }}
      />
    </div>
  );
}

// --- Subcomponents ---

function Header({ currentUserId, currentUser, employees, onUserChange, selectedDate, searchQuery, onSearchChange, searchBadge }) {
  const wt = getWeekType(selectedDate);
  return (
    <header>
      <div className="logo">
        <svg viewBox="0 0 32 32" fill="none"><rect x="2" y="14" width="28" height="4" rx="2" fill="url(#g1)"/><rect x="6" y="18" width="4" height="10" rx="1.5" fill="#06b6d4"/><rect x="22" y="18" width="4" height="10" rx="1.5" fill="#8b5cf6"/><rect x="8" y="6" width="16" height="10" rx="3" fill="url(#g1)"/><defs><linearGradient id="g1" x1="0" y1="0" x2="32" y2="32"><stop stopColor="#06b6d4"/><stop offset="1" stopColor="#8b5cf6"/></linearGradient></defs></svg>
        <span>SeatSync</span>
      </div>
      <div className="header-right">
        <div className="search-wrap">
          <Search size={14} />
          <input type="text" placeholder="Find employee..." value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} />
          {searchBadge && <span id="search-result-badge">{searchBadge}</span>}
        </div>
        <span className="week-badge">
          Week {wt} of 2
        </span>
        <div className="user-select-wrap">
            <label><User size={12} /> Logged in as:</label>
            <select value={currentUserId} onChange={(e) => onUserChange(e.target.value)}>
                {SQUAD_DATA.map(sq => (
                    <optgroup key={sq.id} label={`${sq.name} (Batch ${sq.batch})`}>
                        {employees.filter(e => e.squadId === sq.id).map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.name}</option>
                        ))}
                    </optgroup>
                ))}
            </select>
        </div>
      </div>
    </header>
  );
}

function InfoBar({ currentUser, selectedDate }) {
  const batch = getScheduledBatch(selectedDate);
  const hol = isHoliday(selectedDate);
  return (
    <div className="info-bar">
      <div className="batch-label">
        Your Batch: <strong>Batch {currentUser?.batch} ({currentUser?.squadName})</strong>
      </div>
      {hol ? (
        <span className="day-status holiday">🏖️ Holiday — {hol}</span>
      ) : batch === 0 ? (
        <span className="day-status weekend">Weekend</span>
      ) : batch === currentUser?.batch ? (
        <span className="day-status b1">✅ Your Designated Day</span>
      ) : (
        <span className="day-status b2">Batch {batch}'s Day</span>
      )}
    </div>
  );
}

function CalendarSection({ selectedDate, onDateSelect, offset, onOffsetChange, onVacationClick }) {
  const monday = getCycleMonday(offset);
  const w1 = getWeekDays(monday, 7);
  const w2 = getWeekDays(new Date(monday.getTime() + 7 * 86400000), 7);
  const wt1 = getWeekType(monday);
  const wt2 = wt1 === 1 ? 2 : 1;

  return (
    <section className="calendar-section">
      <div className="calendar-nav">
        <h3>{formatDateShort(w1[0])} — {formatDateShort(new Date(w2[w2.length-1]))}</h3>
        <div className="nav-arrows">
            <button className="today-btn" onClick={() => { onOffsetChange(0); onDateSelect(new Date()); }}><MapPin size={14}/> Today</button>
            <button className="today-btn" onClick={onVacationClick}>🏖️ Vacation</button>
            <button onClick={() => onOffsetChange(offset - 1)}><ChevronLeft size={16}/></button>
            <button onClick={() => onOffsetChange(offset + 1)}><ChevronRight size={16}/></button>
        </div>
      </div>
      <div className="calendar-grid">
        <WeekCol label={`Week ${wt1}`} days={w1} selectedDate={selectedDate} onDateSelect={onDateSelect} />
        <WeekCol label={`Week ${wt2}`} days={w2} selectedDate={selectedDate} onDateSelect={onDateSelect} />
      </div>
    </section>
  );
}

function WeekCol({ label, days, selectedDate, onDateSelect }) {
  return (
    <div className="week-col">
      <h4>{label}</h4>
      <div className="days-row">
        {days.map(d => {
           const batch = getScheduledBatch(d);
           const hol = isHoliday(d);
           const isSel = dateKey(d) === dateKey(selectedDate);
           const isTdy = dateKey(d) === dateKey(new Date());
           return (
             <div 
               key={dateKey(d)}
               className={`day-card ${isSel ? (batch === 2 ? 'selected b2-day' : 'selected') : ''} ${isTdy ? 'today' : ''} ${hol ? 'holiday-day' : ''}`}
               onClick={() => onDateSelect(d)}
             >
                <div className="day-name">{DAY_NAMES[d.getDay()]}</div>
                <div className="day-num">{d.getDate()}</div>
                {hol ? <span className="day-batch hol">Hol</span> : <span className={`day-batch b${batch}`}>B{batch}</span>}
             </div>
           );
        })}
      </div>
    </div>
  );
}

function StatsStrip({ allocations }) {
  let total = 50, occupied = 0, available = 0, released = 0, booked = 0;
  Object.values(allocations).forEach(a => {
    if (a.status === 'occupied') occupied++;
    else if (a.status === 'available' || a.status === 'released') { available++; if (a.status === 'released') released++; }
    else if (a.status === 'booked') booked++;
  });
  occupied += booked;
  const util = Math.round((occupied/total)*100);

  return (
    <div className="stats-row">
      <StatCard val={total} label="Total Seats" type="total" />
      <StatCard val={occupied} label="Occupied" type="occupied" />
      <StatCard val={available} label="Available" type="avail" />
      <StatCard val={released} label="Released" type="released" />
      <StatCard val={util + '%'} label="Utilization" type="util" />
    </div>
  );
}

function StatCard({ val, label, type }) {
  return (
    <div className="stat-card">
      <div className={`stat-val ${type}`}>{val}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function Legend() {
  return (
    <div className="legend">
      <LegendItem color="var(--batch1)" label="Occupied" />
      <LegendItem color="var(--your-seat)" label="Your Seat" isSpecial />
      <LegendItem color="var(--available)" label="Available" />
      <LegendItem color="var(--released)" label="Released" />
      <LegendItem color="var(--booked)" label="Booked" />
      <LegendItem color="var(--holiday)" label="Holiday" />
    </div>
  );
}

function LegendItem({ color, label, isSpecial }) {
  return (
    <div className="legend-item">
      <span className="legend-dot" style={{background: color, boxShadow: isSpecial ? `0 0 6px ${color}` : 'none'}}></span>
      {label}
    </div>
  );
}

function SeatMap({ allocations, currentUser, selectedDate, onAction, searchQuery, showToast, userOnVacation }) {
  const hol = isHoliday(selectedDate);
  const batch = getScheduledBatch(selectedDate);
  
  // Check if current user has any seat for this day
  const userHasSeat = Object.entries(allocations).find(([_, info]) => info.employee?.id === currentUser?.id);

  if (hol || batch === 0) return (
    <section className="seatmap-section">
      <div className="seatmap-title">🏢 Floor Plan — <span className="date-label">{formatDateFull(selectedDate)}</span></div>
      <div className="floor-plan">
        <div style={{gridColumn:'1/-1', textAlign:'center', padding: '60px 20px'}}><h3>{hol ? `🏖️ Holiday: ${hol}` : '📅 Weekend'}</h3></div>
      </div>
    </section>
  );

  const batchSquads = SQUAD_DATA.filter(sq => sq.batch === batch);

  return (
    <section className="seatmap-section">
      <div className="seatmap-title">🏢 Floor Plan — <span className="date-label">{formatDateFull(selectedDate)}</span></div>
      <div className="floor-plan">
        {ZONES.map((zone, zi) => (
          <div key={zone} className="zone-card">
            <div className="zone-header"><h3>Zone {zone}</h3><span className={`squad-badge b${batch}`}>{batchSquads[zi].name} · B{batch}</span></div>
            <div className="seats-grid">
               {[1,2,3,4,5,6,7,8].map(i => {
                 const sid = `${zone}${i}`;
                 return <Seat key={sid} sid={sid} info={allocations[sid]} user={currentUser} selectedDate={selectedDate} onAction={onAction} searchQuery={searchQuery} hasAnySeat={userHasSeat} userOnVacation={userOnVacation} />;
               })}
            </div>
          </div>
        ))}
        <div className="zone-card floater-zone">
            <div className="zone-header"><h3>🔄 Floater Zone</h3><span className="squad-badge" style={{background:'var(--available-bg)', color:'var(--available)'}}>10 Flex Seats</span></div>
            <div className="seats-grid">
               {[1,2,3,4,5,6,7,8,9,10].map(i => {
                 const sid = `F${i}`;
                 return <Seat key={sid} sid={sid} info={allocations[sid]} user={currentUser} selectedDate={selectedDate} onAction={onAction} searchQuery={searchQuery} hasAnySeat={userHasSeat} userOnVacation={userOnVacation} />;
               })}
            </div>
        </div>
      </div>
    </section>
  );
}

function Seat({ sid, info, user, selectedDate, onAction, searchQuery, hasAnySeat, userOnVacation }) {
  if (!info) return null;
  const isYours = info.employee?.id === user?.id;
  const highlight = searchQuery && info.employee?.name.toLowerCase().includes(searchQuery.toLowerCase());
  
  const bookingOpen = isBookingOpen(selectedDate);
  const isLocked = isPast(selectedDate) || isToday(selectedDate) || userOnVacation || (!bookingOpen && !isYours);
  const canBook = (info.status === 'available' || (info.status === 'released' && info.releasedBy?.id !== user?.id)) && !hasAnySeat && !isLocked;
  
  let cls = `seat ${highlight ? 'search-highlight' : ''}`;
  if (info.status === 'occupied') cls += isYours ? ' your-seat' : (info.employee?.batch === 2 ? ' occupied-b2' : ' occupied');
  else if (info.status === 'released') cls += ' released';
  else if (info.status === 'available') cls += ' available floater-seat';
  else if (info.status === 'booked') cls += (isYours ? ' your-seat' : ' booked');

  // Locking logic
  if ((!isYours && !canBook && (info.status === 'available' || info.status === 'released')) || isLocked) {
      if (!isYours || (isYours && isLocked && (info.status === 'available' || info.status === 'released'))) {
        cls += ' locked-seat';
      }
  }

  const handleClick = () => {
    if (isLocked && (info.status === 'available' || info.status === 'released')) return;
    const dk = dateKey(selectedDate);
    if (info.status === 'occupied' && isYours) onAction({ type: 'release', dk, sid, eid: user.id });
    else if (info.status === 'released' && isYours) onAction({ type: 'cancel-release', dk, sid, eid: user.id });
    else if ((info.status === 'available' || info.status === 'released') && !isYours) {
        onAction({ type: 'book', dk, sid, eid: user.id });
    }
    else if (info.status === 'booked' && isYours) onAction({ type: 'cancel-book', dk, sid, eid: user.id });
  };

  const initials = info.employee ? info.employee.name.split(' ').map(n=>n[0]).join('').slice(0,2) : (info.status === 'released' ? '✕' : '+');

  let title = sid;
  if (!isYours && hasAnySeat && (info.status === 'available' || info.status === 'released')) {
      title += ` (Locked: You already have seat ${hasAnySeat[0]})`;
  } else if (!bookingOpen && !isYours && (info.status === 'available' || info.status === 'released')) {
      const prev = new Date(selectedDate); prev.setDate(prev.getDate()-1);
      title += ` (Booking opens 3 PM on ${prev.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][prev.getMonth()]})`;
  }

  return (
    <div className={cls} onClick={handleClick} title={title}>
      <span className="seat-id">{sid}</span>
      <div className="seat-avatar">{initials}</div>
      <span className="seat-name">{info.employee ? info.employee.name.split(' ')[0] : (info.status === 'released' ? 'Released' : 'Available')}</span>
    </div>
  );
}

function MySchedule({ currentUser, cycleOffset, actions, vacations, fetchData, onAction }) {
  const dKey = (d) => {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  };

  const monday = getCycleMonday(cycleOffset);
  const allDays = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    if (d.getDay() !== 0 && d.getDay() !== 6) allDays.push(d);
  }

  const todayStr = dKey(new Date());

  return (
    <section className="schedule-section">
      <h3>📋 My Schedule — 2-Week Cycle</h3>
      <table className="schedule-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Day</th>
            <th>Status</th>
            <th>Seat</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {allDays.map(d => {
            const dk = dKey(d);
            const batch = getScheduledBatch(d);
            const hol = isHoliday(d);
            const today = dk === todayStr;
            
            const onVacation = vacations.some(v => v.employeeId === currentUser?.id && dk >= v.startDate && dk <= v.endDate);
            
            let statusHtml = null, seatHtml = '—', actionBtn = null, currentSeatId = null;

            if (hol) {
              statusHtml = <span className="status-badge" style={{background:'var(--holiday-bg)', color:'var(--holiday)'}}>Holiday</span>;
            } else if (onVacation) {
              statusHtml = <span className="status-badge" style={{background:'var(--available-bg)', color:'var(--available)'}}>On Leave</span>;
            } else if (batch === currentUser?.batch) {
              const squadIdx = SQUAD_DATA.filter(sq => sq.batch === batch).findIndex(sq => sq.id === currentUser.squadId);
              const zone = ZONES[squadIdx];
              currentSeatId = `${zone}${currentUser.seatIndex + 1}`;
              const isReleased = actions.some(a => a.dateKey === dk && a.seatId === currentSeatId && a.employeeId === currentUser.id && a.type === 'release');

              if (isReleased) {
                statusHtml = <span className="status-badge released-badge">Released</span>;
                seatHtml = <span style={{textDecoration:'line-through', opacity:0.5}}>{currentSeatId}</span>;
              } else {
                statusHtml = <span className="status-badge auto">Auto-Assigned</span>;
                seatHtml = <strong>{currentSeatId}</strong>;
              }
            } else {
              const booking = actions.find(a => a.dateKey === dk && a.employeeId === currentUser.id && a.type === 'book');
              if (booking) {
                statusHtml = <span className="status-badge booked-badge">Booked</span>;
                seatHtml = <strong>{booking.seatId}</strong>;
                currentSeatId = booking.seatId;
              } else {
                statusHtml = <span className="status-badge off">Off Day</span>;
              }
            }

            const isLocked = isPast(d) || isToday(d) || !isBookingOpen(d);

            return (
              <tr key={dk} style={{background: today ? 'rgba(59,130,246,0.06)' : 'transparent'}}>
                <td>{today ? '📍 ' : ''}{formatDateShort(d)}</td>
                <td>{DAY_NAMES[d.getDay()]}</td>
                <td>{statusHtml}</td>
                <td>{seatHtml}</td>
                <td>
                  {!isLocked && !onVacation && (
                    batch === currentUser?.batch && !isHoliday(d) ? (
                      actions.some(a => a.dateKey === dk && a.employeeId === currentUser.id && a.type === 'release') ? (
                         <button className="action-btn cancel" onClick={() => onAction({type:'cancel-release', dk, sid: currentSeatId, eid: currentUser.id})}>Undo</button>
                      ) : (
                         <button className="action-btn release" onClick={() => onAction({type:'release', dk, sid: currentSeatId, eid: currentUser.id})}>Release</button>
                      )
                    ) : (
                      actions.find(a => a.dateKey === dk && a.employeeId === currentUser.id && a.type === 'book') && (
                          <button className="action-btn cancel" onClick={() => onAction({type:'cancel-book', dk, sid: currentSeatId, eid: currentUser.id})}>Cancel</button>
                      )
                    )
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function VacationModal({ onClose, currentUserId, vacations, onSave, onDelete }) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [type, setType] = useState('Personal');

  const stats = () => {
    const currentYear = new Date().getFullYear().toString();
    const userVacations = vacations.filter(v => v.employeeId === currentUserId && v.startDate.startsWith(currentYear));
    let total = 0;
    userVacations.forEach(v => {
      const d1 = new Date(v.startDate);
      const d2 = new Date(v.endDate);
      total += Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
    });
    return total;
  };

  const totalUsed = stats();

  const handleSave = () => {
    if (!start || !end) return;
    const s = new Date(start);
    const e = new Date(end);
    if (e < s) return;
    const diff = Math.ceil(Math.abs(e - s) / (1000 * 60 * 60 * 24)) + 1;
    if (diff > 5) return;

    onSave({
      id: Date.now().toString(),
      employeeId: currentUserId,
      startDate: start,
      endDate: end,
      leaveType: type,
      isPenalty: totalUsed + diff > 15
    });
  };

  return (
    <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h3>🏖️ Vacation Manager</h3>
        <p>Plan your leaves. Your seat will be automatically released for the selected period.</p>
        
        <div className="vacation-form">
          <div className="form-group">
            <label>Leave Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="Personal">Personal Leave</option>
              <option value="Sick">Sick Leave</option>
              <option value="Work from Anywhere">Work from Anywhere</option>
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Start Date</label>
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <div className="balance-info">
            Annual Balance: <span>{15 - totalUsed} / 15</span> days
            {totalUsed > 15 && <div className="penalty-tag">⚠️ Penalty Applied</div>}
          </div>
          <button className="modal-btn primary" style={{width:'100%', marginTop:'10px'}} onClick={handleSave}>Save Vacation</button>
        </div>

        <div className="vacation-list-wrap">
          <h4>Scheduled Vacations</h4>
          <ul className="vac_list">
            {vacations.filter(v => v.employeeId === currentUserId).length === 0 ? (
              <li style={{fontSize:'12px', color:'var(--text-muted)', textAlign:'center', padding:'10px'}}>No vacations scheduled</li>
            ) : (
                vacations.filter(v => v.employeeId === currentUserId).map(v => (
                <li key={v.id} className="vac-item">
                  <div className="vac-details">
                    <span className="vac-type">{v.leaveType} {v.isPenalty && '(Penalty)'}</span>
                    <span className="vac-dates">{v.startDate} to {v.endDate}</span>
                  </div>
                  <button className="vac-delete" onClick={() => onDelete(v.id)}>✕</button>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="modal-actions" style={{marginTop:'20px'}}>
          <button className="modal-btn secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
