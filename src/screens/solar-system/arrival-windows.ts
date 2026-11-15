export type ArrivalWindow = { id: string; arrivalAt: string };

// Demo options only; replace with the selected site's API response later.
export const mockArrivalWindows: ArrivalWindow[] = [
  { id: 'arrival-1', arrivalAt: '2026-11-20T06:00:00Z' },
  { id: 'arrival-2', arrivalAt: '2026-11-21T12:30:00Z' },
  { id: 'arrival-3', arrivalAt: '2026-11-23T09:00:00Z' },
  { id: 'arrival-4', arrivalAt: '2026-11-25T18:00:00Z' },
  { id: 'arrival-5', arrivalAt: '2026-11-28T03:30:00Z' },
  { id: 'arrival-6', arrivalAt: '2026-12-01T15:00:00Z' },
  { id: 'arrival-7', arrivalAt: '2026-12-04T08:00:00Z' },
  { id: 'arrival-8', arrivalAt: '2026-12-07T21:30:00Z' },
];
