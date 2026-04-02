export const PLAN_LIMITS: Record<string, { maxUnits: number; maxBuildings: number; onlinePayments: boolean }> = {
  free:      { maxUnits: 2,   maxBuildings: 1,   onlinePayments: false },
  trialing:  { maxUnits: 2,   maxBuildings: 1,   onlinePayments: true  },
  active:    { maxUnits: 999, maxBuildings: 999,  onlinePayments: true  },
  past_due:  { maxUnits: 999, maxBuildings: 999,  onlinePayments: false },
  cancelled: { maxUnits: 2,   maxBuildings: 1,   onlinePayments: false },
};

export function getLimits(status: string | null) {
  return PLAN_LIMITS[status ?? 'free'] ?? PLAN_LIMITS.free;
}
