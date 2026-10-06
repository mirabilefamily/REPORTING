// Shared groups store (used by Open Purchase Orders drawer and Settings page).
// Mocked, persisted to localStorage key `opoGroups`.

export type Group = {
  id: string;
  name: string;
  dimension: string;
  color: string;
  values: string[];
};

export const GROUP_PALETTE = [
  '#2563EB', // blue
  '#65A30D', // green
  '#DC2626', // red
  '#D97706', // amber
  '#7C3AED', // purple
  '#0D9488', // teal
  '#4B5563', // gray
] as const;

export const GROUP_DIMENSIONS = [
  'Destination',
  'Supplier',
  'Status',
  'Mode',
  'Customer',
  'PO State',
] as const;

const uid = () => `g_${Math.random().toString(36).slice(2, 10)}`;

export const DEFAULT_GROUPS: Group[] = [
  { id: 'g_us_b2b',   name: 'US B2B',   dimension: 'Destination', color: '#7C3AED', values: ['I3PL - Cross Dock', 'I3PL - Cross Dock Buckle', 'I3PL - Cross Dock Lids Canada', 'I3PL - General B2B'] },
  { id: 'g_intl_b2b', name: 'INTL B2B', dimension: 'Destination', color: '#2563EB', values: ['Port Warehouse'] },
  { id: 'g_dtc',      name: 'DTC',      dimension: 'Destination', color: '#65A30D', values: ['I3PL - DTC', 'BHM - DTC'] },
];

const KEY = 'opoGroups';

export function loadGroups(): Group[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_GROUPS;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.groups)) return parsed.groups as Group[];
    return DEFAULT_GROUPS;
  } catch { return DEFAULT_GROUPS; }
}

export function saveGroups(groups: Group[]) {
  try { localStorage.setItem(KEY, JSON.stringify({ groups })); } catch { /* ignore */ }
}

export function makeNewGroup(existingColors: string[]): Group {
  const firstUnused = GROUP_PALETTE.find((c) => !existingColors.includes(c)) ?? GROUP_PALETTE[0];
  return {
    id: uid(),
    name: 'Untitled group',
    dimension: GROUP_DIMENSIONS[0],
    color: firstUnused,
    values: [],
  };
}
