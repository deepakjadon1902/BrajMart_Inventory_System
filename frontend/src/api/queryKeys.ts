export const queryKeys = {
  dashboard: {
    summary: () => ['dashboard', 'summary'] as const,
    recent: (limit?: number) => ['dashboard', 'recent', limit] as const,
    categories: () => ['dashboard', 'categories'] as const,
  },
  products: {
    all: () => ['products'] as const,
    list: (filters: Record<string, unknown>) => ['products', filters] as const,
    detail: (id: string) => ['product', id] as const,
    history: (id: string, pagination?: Record<string, unknown>) =>
      ['product', id, 'history', pagination] as const,
  },
  categories: {
    all: () => ['categories'] as const,
    detail: (id: string) => ['category', id] as const,
  },
  transactions: {
    list: (filters: Record<string, unknown>) => ['transactions', filters] as const,
  },
  reports: {
    valuation: () => ['reports', 'valuation'] as const,
    lowStock: () => ['reports', 'lowStock'] as const,
    outOfStock: () => ['reports', 'outOfStock'] as const,
    movements: (filters: Record<string, unknown>) => ['reports', 'movements', filters] as const,
    smart: () => ['reports', 'smart'] as const,
  },
};
