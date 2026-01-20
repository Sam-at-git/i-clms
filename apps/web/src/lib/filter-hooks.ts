import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface ContractFilters {
  types?: string[];
  statuses?: string[];
  customerId?: string;
  departmentId?: string;
  signedAfter?: string;
  signedBefore?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}

const DEFAULT_FILTERS: ContractFilters = {};

export function useContractFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<ContractFilters>(() => {
    // Initialize filters from URL parameters
    return {
      types: searchParams.get('types')?.split(',') || undefined,
      statuses: searchParams.get('statuses')?.split(',') || undefined,
      customerId: searchParams.get('customerId') || undefined,
      departmentId: searchParams.get('departmentId') || undefined,
      signedAfter: searchParams.get('signedAfter') || undefined,
      signedBefore: searchParams.get('signedBefore') || undefined,
      minAmount: searchParams.get('minAmount')
        ? parseFloat(searchParams.get('minAmount')!)
        : undefined,
      maxAmount: searchParams.get('maxAmount')
        ? parseFloat(searchParams.get('maxAmount')!)
        : undefined,
      search: searchParams.get('search') || undefined,
    };
  });

  // Update URL when filters change
  useEffect(() => {
    const params: Record<string, string> = {};
    if (filters.types?.length) params.types = filters.types.join(',');
    if (filters.statuses?.length) params.statuses = filters.statuses.join(',');
    if (filters.customerId) params.customerId = filters.customerId;
    if (filters.departmentId) params.departmentId = filters.departmentId;
    if (filters.signedAfter) params.signedAfter = filters.signedAfter;
    if (filters.signedBefore) params.signedBefore = filters.signedBefore;
    if (filters.minAmount !== undefined) params.minAmount = filters.minAmount.toString();
    if (filters.maxAmount !== undefined) params.maxAmount = filters.maxAmount.toString();
    if (filters.search) params.search = filters.search;

    setSearchParams(params);
  }, [filters, setSearchParams]);

  const updateFilter = useCallback(<K extends keyof ContractFilters>(
    key: K,
    value: ContractFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const hasActiveFilters = useCallback(() => {
    return Object.values(filters).some(
      (value) =>
        value !== undefined &&
        value !== null &&
        value !== '' &&
        (Array.isArray(value) ? value.length > 0 : true)
    );
  }, [filters]);

  const getFilterCount = useCallback(() => {
    let count = 0;
    for (const value of Object.values(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          if (value.length > 0) count++;
        } else {
          count++;
        }
      }
    }
    return count;
  }, [filters]);

  return {
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    getFilterCount,
  };
}
