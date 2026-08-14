export const STORE_TIMEZONE = 'America/Recife';

export type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type DaySchedule = { enabled: boolean; open: string; close: string };
export type OpeningHours = Record<Weekday, DaySchedule>;

export type StorefrontSettings = {
  timezone?: string;
  temporarilyClosed?: boolean;
  openingHours?: Partial<OpeningHours>;
  deliveryTime?: string;
  [key: string]: unknown;
};

export type StoreStatus = {
  isOpen: boolean;
  label: string;
  nextOpeningLabel: string | null;
  temporarilyClosed: boolean;
  timezone: string;
};

export const DEFAULT_OPENING_HOURS: OpeningHours = {
  monday: { enabled: false, open: '11:00', close: '15:00' },
  tuesday: { enabled: false, open: '11:00', close: '15:00' },
  wednesday: { enabled: false, open: '11:00', close: '15:00' },
  thursday: { enabled: false, open: '11:00', close: '15:00' },
  friday: { enabled: true, open: '11:00', close: '15:00' },
  saturday: { enabled: true, open: '11:00', close: '15:00' },
  sunday: { enabled: true, open: '11:00', close: '15:00' },
};

const WEEKDAYS: Weekday[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_LABELS: Record<Weekday, string> = {
  sunday: 'domingo', monday: 'segunda', tuesday: 'terça', wednesday: 'quarta',
  thursday: 'quinta', friday: 'sexta', saturday: 'sábado',
};

function minutes(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const result = Number(match[1]) * 60 + Number(match[2]);
  return result >= 0 && result < 1440 ? result : null;
}

function hourLabel(value: string) {
  const [hour, minute] = value.split(':');
  return minute === '00' ? `${Number(hour)}h` : `${Number(hour)}h${minute}`;
}

export function normalizeOpeningHours(value?: Partial<OpeningHours>): OpeningHours {
  return Object.fromEntries(Object.entries(DEFAULT_OPENING_HOURS).map(([day, fallback]) => {
    const candidate = value?.[day as Weekday];
    const open = candidate?.open && minutes(candidate.open) !== null ? candidate.open : fallback.open;
    const close = candidate?.close && minutes(candidate.close) !== null ? candidate.close : fallback.close;
    return [day, { enabled: candidate?.enabled ?? fallback.enabled, open, close }];
  })) as OpeningHours;
}

function localParts(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || '';
  const weekdayMap: Record<string, Weekday> = { Sun: 'sunday', Mon: 'monday', Tue: 'tuesday', Wed: 'wednesday', Thu: 'thursday', Fri: 'friday', Sat: 'saturday' };
  return { day: weekdayMap[get('weekday')], minute: Number(get('hour')) * 60 + Number(get('minute')) };
}

export function calculateStoreStatus(settings: StorefrontSettings = {}, now = new Date()): StoreStatus {
  const timezone = settings.timezone || STORE_TIMEZONE;
  const schedule = normalizeOpeningHours(settings.openingHours);
  const local = localParts(now, timezone);
  const today = schedule[local.day];
  const openMinute = minutes(today.open) ?? 0;
  const closeMinute = minutes(today.close) ?? 0;
  const withinSchedule = today.enabled && openMinute < closeMinute && local.minute >= openMinute && local.minute < closeMinute;
  const temporarilyClosed = settings.temporarilyClosed === true;

  if (temporarilyClosed) {
    return { isOpen: false, label: 'Fechado temporariamente', nextOpeningLabel: null, temporarilyClosed, timezone };
  }
  if (withinSchedule && !temporarilyClosed) {
    return { isOpen: true, label: 'Aberto agora', nextOpeningLabel: null, temporarilyClosed, timezone };
  }
  if (today.enabled && local.minute < openMinute && !temporarilyClosed) {
    const label = `Abre hoje às ${hourLabel(today.open)}`;
    return { isOpen: false, label, nextOpeningLabel: label, temporarilyClosed, timezone };
  }

  const todayIndex = WEEKDAYS.indexOf(local.day);
  for (let offset = withinSchedule || local.minute < openMinute ? 0 : 1; offset <= 7; offset += 1) {
    const day = WEEKDAYS[(todayIndex + offset) % 7];
    const candidate = schedule[day];
    if (!candidate.enabled || (offset === 0 && local.minute >= (minutes(candidate.open) ?? 0))) continue;
    const next = offset === 0 ? `hoje às ${hourLabel(candidate.open)}` : `${DAY_LABELS[day]} às ${hourLabel(candidate.open)}`;
    const label = `Fechado • Abrimos ${next}`;
    return { isOpen: false, label, nextOpeningLabel: label, temporarilyClosed, timezone };
  }

  return { isOpen: false, label: 'Fechado', nextOpeningLabel: null, temporarilyClosed, timezone };
}

export const CLOSED_ORDER_MESSAGE = 'Estamos fechados no momento. Funcionamos sexta, sábado e domingo, das 11h às 15h.';

