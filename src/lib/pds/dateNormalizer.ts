// src/lib/pds/dateNormalizer.ts

const pad2 = (n: number) => String(n).padStart(2, '0');

const monthMap: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

export function isDDMMYYYY(s: string): boolean {
  return /^\d{2}-\d{2}-\d{4}$/.test(s);
}

export function normalizeDateToDDMMYYYY(input: unknown): string {
  if (input === null || input === undefined) return '';

  let s = String(input).trim();
  if (!s) return '';

  // normalize whitespace
  s = s.replace(/\s+/g, ' ');

  // Already dd-mm-yyyy / dd/mm/yyyy / dd.mm.yyyy
  {
    const m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
    if (m) {
      const dd = Number(m[1]);
      const mm = Number(m[2]);
      const yyyy = Number(m[3]);
      if (isValidYMD(yyyy, mm, dd)) return `${pad2(dd)}-${pad2(mm)}-${yyyy}`;
      return '';
    }
  }

  // yyyy-mm-dd / yyyy/mm/dd / yyyy.mm.dd (also handles yyyy-mm-ddTHH:mm:ss)
  {
    const m = s.match(/^(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})(?:[ T].*)?$/);
    if (m) {
      const yyyy = Number(m[1]);
      const mm = Number(m[2]);
      const dd = Number(m[3]);
      if (isValidYMD(yyyy, mm, dd)) return `${pad2(dd)}-${pad2(mm)}-${yyyy}`;
      return '';
    }
  }

  // 8 digits, assume ddmmyyyy
  // (If you want to also support yyyymmdd, you can add another branch here.)
  {
    const m = s.match(/^(\d{2})(\d{2})(\d{4})$/);
    if (m) {
      const dd = Number(m[1]);
      const mm = Number(m[2]);
      const yyyy = Number(m[3]);
      if (isValidYMD(yyyy, mm, dd)) return `${pad2(dd)}-${pad2(mm)}-${yyyy}`;
      return '';
    }
  }

  // Formats with month names: "Jan 5 2025", "5 Jan 2025", "January 05, 2025", etc.
  {
    const m1 = s.match(/^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?[,]?\s+(\d{4})$/i);
    if (m1) {
      const mm = monthFromName(m1[1]);
      const dd = Number(m1[2]);
      const yyyy = Number(m1[3]);
      if (mm && isValidYMD(yyyy, mm, dd)) return `${pad2(dd)}-${pad2(mm)}-${yyyy}`;
      return '';
    }

    const m2 = s.match(/^(\d{1,2})\s+([A-Za-z]+)[,]?\s+(\d{4})$/i);
    if (m2) {
      const dd = Number(m2[1]);
      const mm = monthFromName(m2[2]);
      const yyyy = Number(m2[3]);
      if (mm && isValidYMD(yyyy, mm, dd)) return `${pad2(dd)}-${pad2(mm)}-${yyyy}`;
      return '';
    }
  }

  // Fallback: try JS Date parsing for things like:
  // "2025-01-14T10:30:00Z", "01/14/2025" (ambiguous), etc.
  // NOTE: JS Date parsing can be locale/engine dependent for non-ISO strings.
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    const dd = d.getDate();
    const mm = d.getMonth() + 1;
    const yyyy = d.getFullYear();
    if (isValidYMD(yyyy, mm, dd)) return `${pad2(dd)}-${pad2(mm)}-${yyyy}`;
  }

  return '';
}

export function normalizeDateOrPresent(input: unknown): string {
  if (input === null || input === undefined) return '';
  const s = String(input).trim();
  if (!s) return '';

  if (/^present$/i.test(s)) return 'Present';

  return normalizeDateToDDMMYYYY(s);
}

/**
 * Normalize only Work Experience objects (safe to call on server & client).
 * Keeps unknown fields intact.
 */
export function normalizeWorkExperienceDates<T extends Record<string, any>>(work: T[]): T[] {
  if (!Array.isArray(work)) return [];

  return work.map((w) => {
    const from = normalizeDateToDDMMYYYY(w?.periodOfService?.from);
    const toRaw = w?.periodOfService?.to;

    const to =
      /^present$/i.test(String(toRaw ?? '').trim())
        ? 'Present'
        : normalizeDateToDDMMYYYY(toRaw);

    return {
      ...w,
      periodOfService: {
        ...(w.periodOfService || {}),
        from: from || (w?.periodOfService?.from ?? ''),
        to: (to || (w?.periodOfService?.to ?? '')) as any,
      },
    };
  });
}

function monthFromName(name: string): number | null {
  const key = String(name || '').trim().toLowerCase();
  return monthMap[key] ?? null;
}

function isValidYMD(y: number, m: number, d: number): boolean {
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false;
  if (y < 1000 || y > 9999) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;

  // strict check (catches 31-Feb, etc.)
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === (m - 1) &&
    dt.getUTCDate() === d
  );
}
