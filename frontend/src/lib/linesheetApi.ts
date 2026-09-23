const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export type SavedLinesheet = {
  id: string; title: string; ctx: 'customer' | 'list' | 'generic'; customerId: string; priceListId: string; notes: string; showMsrp: boolean; showMoq: boolean;
  itemIds: string[]; season: string; shareToken: string; createdBy: string; createdAt: string; updatedAt: string; views: number;
};
export type LinesheetInput = Omit<SavedLinesheet, 'id' | 'shareToken' | 'createdBy' | 'createdAt' | 'updatedAt' | 'views'>;

const j = async <T,>(r: Response): Promise<T> => { if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail ?? r.statusText); return r.status === 204 ? (undefined as T) : r.json(); };
const json = { 'Content-Type': 'application/json' };

export const linesheetApi = {
  list: () => fetch(`${API}/linesheets`).then((r) => j<SavedLinesheet[]>(r)),
  create: (b: LinesheetInput) => fetch(`${API}/linesheets`, { method: 'POST', headers: json, body: JSON.stringify(b) }).then((r) => j<SavedLinesheet>(r)),
  update: (id: string, b: LinesheetInput) => fetch(`${API}/linesheets/${id}`, { method: 'PUT', headers: json, body: JSON.stringify(b) }).then((r) => j<SavedLinesheet>(r)),
  duplicate: (id: string) => fetch(`${API}/linesheets/${id}/duplicate`, { method: 'POST' }).then((r) => j<SavedLinesheet>(r)),
  remove: (id: string) => fetch(`${API}/linesheets/${id}`, { method: 'DELETE' }).then((r) => j<void>(r)),
  shared: (token: string) => fetch(`${API}/share/linesheets/${token}`).then((r) => j<SavedLinesheet>(r)),
};

export const shareUrl = (token: string) => `${window.location.origin}/share/${token}`;
