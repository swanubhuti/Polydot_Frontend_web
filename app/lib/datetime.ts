export function toUTCDay(localDatetime: Date) {
  return Date.UTC(localDatetime.getFullYear(), localDatetime.getMonth(), localDatetime.getDate(), 0, 0, 0, 0);
}

export function getCurrentMonthYear() {
  const now = new Date();
  const nowUTC = toUTCDay(now);
  const date = new Date(nowUTC);
  return { month: date.getUTCMonth(), year: date.getUTCFullYear() };
}

export function getLastDayOfMonth(month: number, year: number) {
  return new Date(toUTCDay(new Date(year, month + 1, 0)));
}

export function getFirstDayOfMonth(month: number, year: number) {
  return new Date(toUTCDay(new Date(year, month, 1)));
}

export function getDaysRange(s: Date, e :Date) {
  let range: Date[] = [];
  const start = new Date(toUTCDay(s));
  const end = new Date(toUTCDay(e));
  let curr = start;

  while (curr <= end) {
    range.push(curr);
    const d = new Date(toUTCDay(curr));
    d.setUTCDate(d.getUTCDate() + 1);
    curr = d;
  }
  return range;
}

export function getMonthName(month: number) {
  const now = new Date(toUTCDay(new Date()));
  now.setUTCMonth(month);
  return now.toLocaleDateString('default', { month: 'long' });
}

export function isSameDay(d1: Date | undefined, d2: Date | undefined) {
  if (d1 == undefined || d2 == undefined) {
    return false;
  }
  return (
    d1 &&
    d1.getUTCDate() == d2.getUTCDate() &&
    d1.getUTCMonth() === d2.getUTCMonth() &&
    d1.getUTCFullYear() == d2.getUTCFullYear()
  );
}

export function isBetweenDates(
  range: {
    start: Date;
    end: Date;
  },
  d: Date
) {
  if (range.start < range.end) {
    return range.start.getTime() <= d.getTime() && d.getTime() <= range.end.getTime();
  }

  return range.end.getTime() <= d.getTime() && d.getTime() <= range.start.getTime();
}

export function dd_mm_yyyy(d: Date) {
  const yyyy = d.getUTCFullYear();
  const mm = `${d.getUTCMonth() + 1}`.padStart(2, '0');
  const dd = `${d.getUTCDate()}`.padStart(2, '0');

  return `${dd}/${mm}/${yyyy}`;
}

export function today() {
  return new Date(toUTCDay(new Date()));
}