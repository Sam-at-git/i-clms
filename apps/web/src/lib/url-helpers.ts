// URL parameter utilities for filter persistence

export interface UrlFilters {
  [key: string]: string | number | boolean | string[] | undefined;
}

/**
 * Convert URL filters to URLSearchParams
 */
export function filtersToSearchParams(filters: UrlFilters): URLSearchParams {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    if (Array.isArray(value)) {
      if (value.length > 0) {
        params.set(key, value.join(','));
      }
    } else {
      params.set(key, String(value));
    }
  });

  return params;
}

/**
 * Parse URLSearchParams to filters object
 */
export function searchParamsToFilters(searchParams: URLSearchParams): Record<string, string | string[]> {
  const filters: Record<string, string | string[]> = {};

  searchParams.forEach((value, key) => {
    // Check if the value contains commas (indicating an array)
    if (value.includes(',')) {
      filters[key] = value.split(',');
    } else {
      filters[key] = value;
    }
  });

  return filters;
}

/**
 * Build query string from filters
 */
export function buildQueryString(filters: UrlFilters): string {
  const params = filtersToSearchParams(filters);
  return params.toString();
}

/**
 * Parse query string to filters
 */
export function parseQueryString(queryString: string): Record<string, string | string[]> {
  const params = new URLSearchParams(queryString);
  return searchParamsToFilters(params);
}

/**
 * Debounce function for search input
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Format date for URL parameter
 */
export function formatDateForUrl(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parse date from URL parameter
 */
export function parseDateFromUrl(dateStr: string): Date {
  return new Date(dateStr);
}
