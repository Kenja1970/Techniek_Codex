const UNIT_TO_MINUTES = {
  seconds: 1 / 60,
  minutes: 1,
  hours: 60,
  shifts: 480,
  days: 1440
};

export function toMinutes(value, unit = "minutes") {
  return Number(value || 0) * (UNIT_TO_MINUTES[unit] || 1);
}

export function fromMinutes(value, unit = "minutes") {
  return Number(value || 0) / (UNIT_TO_MINUTES[unit] || 1);
}

export function formatDuration(minutes) {
  if (minutes < 1) return `${Math.round(minutes * 60)} sec`;
  if (minutes < 60) return `${minutes.toFixed(1)} min`;
  if (minutes < 1440) return `${(minutes / 60).toFixed(1)} hr`;
  return `${(minutes / 1440).toFixed(1)} days`;
}

export function formatSimTime(minutes, settings = {}) {
  const shiftLength = Number(settings.shiftLength || 480);
  const shiftsPerDay = Number(settings.shiftsPerDay || 2);
  const dayLength = shiftLength * shiftsPerDay;
  const day = Math.floor(minutes / dayLength) + 1;
  const withinDay = minutes % dayLength;
  const shift = Math.floor(withinDay / shiftLength) + 1;
  const withinShift = Math.floor(withinDay % shiftLength);
  const hour = Math.floor(withinShift / 60);
  const minute = withinShift % 60;
  return `Day ${day} · Shift ${shift} · ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} simulated time`;
}

export function isWithinCalendar(minutes, calendar = {}, settings = {}) {
  const shiftLength = Number(settings.shiftLength || calendar.shiftLength || 480);
  const shiftsPerDay = Number(settings.shiftsPerDay || calendar.shiftsPerDay || 2);
  const workingDays = calendar.workingDays || [1, 2, 3, 4, 5];
  const dayLength = shiftLength * shiftsPerDay;
  const dayIndex = Math.floor(minutes / dayLength);
  const weekday = (dayIndex % 7) + 1;
  const withinDay = minutes % dayLength;
  return workingDays.includes(weekday) && withinDay < dayLength;
}

export function nextCalendarOpen(minutes, calendar = {}, settings = {}) {
  let probe = Math.ceil(minutes);
  for (let i = 0; i < 10080; i += 1) {
    if (isWithinCalendar(probe, calendar, settings)) return probe;
    probe += 15;
  }
  return Math.ceil(minutes + 60);
}
