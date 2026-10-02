export class ApiError extends Error {
  public code: string;
  public details?: unknown;
  public status: number;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const userRole = localStorage.getItem('brajmart_role') || 'ADMIN';
  const userName = localStorage.getItem('brajmart_user_name') || 'Admin';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-User-Role': userRole,
    'X-User-Name': userName,
    ...(options.headers as Record<string, string>),
  };

  // Add automatic idempotency key for mutations if not provided
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(options.method?.toUpperCase() || '')) {
    if (!headers['Idempotency-Key']) {
      headers['Idempotency-Key'] = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/csv')) {
    return (await response.text()) as unknown as T;
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new ApiError('NETWORK_ERROR', 'Failed to parse server response.', response.status);
  }

  if (!response.ok || !data.success) {
    const error = data?.error;
    throw new ApiError(
      error?.code || 'SERVER_ERROR',
      error?.message || 'A server error occurred. Please try again.',
      response.status,
      error?.details
    );
  }

  return data;
}
