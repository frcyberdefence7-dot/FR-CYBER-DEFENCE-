import React, { useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, Trash2 } from 'lucide-react';
import type { Appointment, DoctorSchedule } from '../../types/hms.ts';

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TIME_BANDS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

function getStartOfWeekMonday(baseDate: Date): Date {
  const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  const day = d.getDay(); // 0 = Sun, 1 = Mon
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isTimeInShift(hourStr: string, start: string, end: string): boolean {
  return hourStr >= start.slice(0, 5) && hourStr < end.slice(0, 5);
}

interface WeeklyScheduleViewProps {
  schedules: DoctorSchedule[];
  appointments: Appointment[];
  onStartConsultation: (appointment: Appointment) => void;
  onRemoveLeave: (scheduleId: number) => void;
  onQuickBlockLeave: (dateStr: string) => void;
  onUpdateShift?: (dayOfWeek: number, startTime: string, endTime: string) => Promise<void>;
}

export const WeeklyScheduleView: React.FC<WeeklyScheduleViewProps> = ({
  schedules,
  appointments,
  onStartConsultation,
  onRemoveLeave,
  onQuickBlockLeave,
  onUpdateShift,
}) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [editingShiftDay, setEditingShiftDay] = useState<number | null>(null);
  const [shiftStart, setShiftStart] = useState('09:00');
  const [shiftEnd, setShiftEnd] = useState('17:00');
  const [savingShift, setSavingShift] = useState(false);

  const todayStr = useMemo(() => toIsoDate(new Date()), []);

  const weekDays = useMemo(() => {
    const today = new Date();
    const monday = getStartOfWeekMonday(today);
    monday.setDate(monday.getDate() + weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const dateObj = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      return {
        dateStr: toIsoDate(dateObj),
        dayOfWeek: dateObj.getDay(),
        shortLabel: WEEKDAY_SHORT[dateObj.getDay()],
        dayNum: dateObj.getDate(),
        monthShort: dateObj.toLocaleString('en-US', { month: 'short' }),
      };
    });
  }, [weekOffset]);

  const weeklyShifts = useMemo(
    () => schedules.filter((s) => !s.isLeave),
    [schedules]
  );

  const leaveMap = useMemo(() => {
    const map = new Map<string, DoctorSchedule>();
    for (const s of schedules) {
      if (s.isLeave && s.leaveDate) {
        map.set(s.leaveDate, s);
      }
    }
    return map;
  }, [schedules]);

  const consultationsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const appt of appointments) {
      if (appt.status === 'cancelled') continue;
      const list = map.get(appt.appointmentDate) || [];
      list.push(appt);
      map.set(appt.appointmentDate, list);
    }
    for (const [k, list] of map.entries()) {
      list.sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
      map.set(k, list);
    }
    return map;
  }, [appointments]);

  const weekStats = useMemo(() => {
    let shiftDays = 0;
    let leaveCount = 0;
    let confirmedConsults = 0;

    for (const day of weekDays) {
      const leave = leaveMap.get(day.dateStr);
      const shift = weeklyShifts.find((s) => s.dayOfWeek === day.dayOfWeek);
      if (leave) leaveCount += 1;
      else if (shift) shiftDays += 1;
      confirmedConsults += (consultationsByDate.get(day.dateStr) || []).length;
    }

    return { shiftDays, leaveCount, confirmedConsults };
  }, [weekDays, leaveMap, weeklyShifts, consultationsByDate]);

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingShiftDay === null || !onUpdateShift) return;
    setSavingShift(true);
    try {
      await onUpdateShift(editingShiftDay, shiftStart, shiftEnd);
      setEditingShiftDay(null);
    } finally {
      setSavingShift(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Calendar Header & Controls */}
      <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-700" />
            Weekly Schedule & Consultations Calendar
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
            {weekDays[0].monthShort} {weekDays[0].dayNum} – {weekDays[6].monthShort} {weekDays[6].dayNum}
            {' · '}
            {weekStats.shiftDays} OPD Shifts · {weekStats.confirmedConsults} Consultations ·{' '}
            {weekStats.leaveCount} Leave Days
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setWeekOffset((w) => w - 1)}
            aria-label="Previous week"
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setWeekOffset(0)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-800 whitespace-nowrap cursor-pointer"
          >
            This Week
          </button>
          <button
            type="button"
            onClick={() => setWeekOffset((w) => w + 1)}
            aria-label="Next week"
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Inline Shift Editor Drawer */}
      {editingShiftDay !== null && onUpdateShift && (
        <form
          onSubmit={handleSaveShift}
          className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs"
        >
          <div className="font-semibold text-slate-800">
            Adjust OPD Shift for {WEEKDAY_SHORT[editingShiftDay]}:
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="time"
              required
              value={shiftStart}
              onChange={(e) => setShiftStart(e.target.value)}
              className="px-2.5 py-1.5 font-mono bg-white border border-slate-300 rounded-lg"
            />
            <span className="text-slate-500">to</span>
            <input
              type="time"
              required
              value={shiftEnd}
              onChange={(e) => setShiftEnd(e.target.value)}
              className="px-2.5 py-1.5 font-mono bg-white border border-slate-300 rounded-lg"
            />
            <button
              type="submit"
              disabled={savingShift}
              className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg cursor-pointer"
            >
              {savingShift ? 'Saving...' : 'Save Shift'}
            </button>
            <button
              type="button"
              onClick={() => setEditingShiftDay(null)}
              className="px-2.5 py-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Legend */}
      <div className="px-6 py-2.5 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center gap-6 text-[11px] text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-teal-50 border border-teal-300" />
          Assigned OPD Shift
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-slate-900" />
          Confirmed / Active Consultation
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-amber-100 border border-amber-300" />
          Scheduled Leave / Blocked
        </span>
      </div>

      {/* 7-Day Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[820px]">
          {/* Day Headers */}
          <div className="grid grid-cols-8 border-b border-slate-200 bg-slate-50 text-xs">
            <div className="px-3 py-3 font-mono text-slate-500 border-r border-slate-200">
              Time
            </div>
            {weekDays.map((day) => {
              const isToday = day.dateStr === todayStr;
              const shift = weeklyShifts.find((s) => s.dayOfWeek === day.dayOfWeek);
              const leave = leaveMap.get(day.dateStr);

              return (
                <div
                  key={day.dateStr}
                  className={`px-3 py-2.5 border-r last:border-r-0 border-slate-200 ${
                    isToday ? 'bg-teal-50/70' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold ${isToday ? 'text-teal-800' : 'text-slate-900'}`}>
                      {day.shortLabel}
                    </span>
                    <span
                      className={`font-mono text-xs tabular-nums ${
                        isToday ? 'text-teal-800 font-bold' : 'text-slate-500'
                      }`}
                    >
                      {day.dayNum} {day.monthShort}
                    </span>
                  </div>

                  {leave ? (
                    <div className="mt-1.5 flex items-center justify-between gap-1 text-[11px] text-amber-800 font-medium">
                      <span className="truncate" title={leave.leaveReason || 'Leave'}>
                        Leave
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemoveLeave(leave.id)}
                        title="Remove leave block"
                        className="text-rose-700 hover:text-rose-900 cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : shift ? (
                    <div className="mt-1.5 flex items-center justify-between gap-1 text-[11px] text-teal-800 font-mono tabular-nums">
                      <span>
                        {shift.startTime}–{shift.endTime}
                      </span>
                      {onUpdateShift && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingShiftDay(day.dayOfWeek);
                            setShiftStart(shift.startTime);
                            setShiftEnd(shift.endTime);
                          }}
                          className="text-[10px] font-sans font-semibold text-slate-500 hover:text-teal-800 cursor-pointer"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="mt-1.5 text-[11px] text-slate-400">Off Duty</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Hourly Schedule Matrix */}
          <div className="divide-y divide-slate-200">
            {TIME_BANDS.map((bandHour) => {
              const bandPrefix = bandHour.slice(0, 2); // e.g., "09"
              return (
                <div key={bandHour} className="grid grid-cols-8 min-h-[58px]">
                  <div className="px-3 py-2 border-r border-slate-200 bg-slate-50/40 font-mono text-[11px] text-slate-500 tabular-nums flex items-start gap-1">
                    <Clock className="w-3 h-3 mt-0.5 text-slate-400 shrink-0" />
                    {bandHour}
                  </div>

                  {weekDays.map((day) => {
                    const leave = leaveMap.get(day.dateStr);
                    const shift = weeklyShifts.find((s) => s.dayOfWeek === day.dayOfWeek);
                    const inShift =
                      !leave && shift ? isTimeInShift(bandHour, shift.startTime, shift.endTime) : false;

                    const dayAppts = consultationsByDate.get(day.dateStr) || [];
                    const slotAppts = dayAppts.filter((a) => a.timeSlot.startsWith(bandPrefix));

                    return (
                      <div
                        key={`${day.dateStr}-${bandHour}`}
                        className={`p-1.5 border-r last:border-r-0 border-slate-200 space-y-1 transition-colors ${
                          leave
                            ? 'bg-amber-50/70'
                            : inShift
                              ? 'bg-teal-50/30'
                              : 'bg-slate-50/40'
                        }`}
                      >
                        {leave && bandHour === '09:00' && (
                          <div className="p-1.5 rounded bg-amber-100/80 border border-amber-200 text-[10px] text-amber-900">
                            <div className="font-semibold">Leave Day</div>
                            <div className="truncate">{leave.leaveReason || 'Unavailable'}</div>
                          </div>
                        )}

                        {slotAppts.map((appt) => {
                          const isCompleted = appt.status === 'completed';
                          const isActive =
                            appt.status === 'in_consultation' || appt.status === 'checked_in';
                          return (
                            <button
                              key={appt.id}
                              type="button"
                              onClick={() => onStartConsultation(appt)}
                              title={`Open consultation for ${appt.patientName} (${appt.bookingId})`}
                              className={`w-full text-left p-1.5 rounded border text-[11px] leading-tight cursor-pointer transition-colors ${
                                isCompleted
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950 hover:bg-emerald-100'
                                  : isActive
                                    ? 'bg-teal-700 border-teal-800 text-white hover:bg-teal-800'
                                    : 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800'
                              }`}
                            >
                              <div className="flex items-center justify-between font-mono text-[10px] opacity-90 tabular-nums">
                                <span>{appt.timeSlot}</span>
                                <span>#{appt.tokenNumber}</span>
                              </div>
                              <div className="font-semibold truncate mt-0.5">{appt.patientName}</div>
                              <div className="text-[10px] opacity-80 capitalize truncate">
                                {appt.status.replace('_', ' ')}
                              </div>
                            </button>
                          );
                        })}

                        {!leave && inShift && slotAppts.length === 0 && bandHour === '09:00' && (
                          <button
                            type="button"
                            onClick={() => onQuickBlockLeave(day.dateStr)}
                            className="w-full text-left text-[10px] text-slate-400 hover:text-amber-700 px-1 py-0.5 cursor-pointer"
                          >
                            + Block date
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
