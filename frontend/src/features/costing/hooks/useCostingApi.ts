import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { request } from '@/shared/lib/http/client';
import type { CostCalculation, CostingFormValues } from '../types/costing';

interface PagedResponse<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function useCostingsList(page = 1, pageSize = 20, search = '', recipeId?: string) {
  return useQuery({
    queryKey: ['costings', { page, pageSize, search, recipeId }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search) params.set('q', search);
      if (recipeId) params.set('recipeId', recipeId);

      return request<PagedResponse<CostCalculation>>(`/costings?${params.toString()}`);
    },
  });
}

export function useCosting(id?: string) {
  return useQuery({
    queryKey: ['costing', id],
    queryFn: async () => {
      if (!id) throw new Error('Costing ID is required');
      return request<CostCalculation>(`/costings/${id}`);
    },
    enabled: Boolean(id),
  });
}

export function useCreateCosting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CostingFormValues) => {
      return request<CostCalculation>('/costings', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costings'] });
    },
  });
}

export function useUpdateCosting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: CostingFormValues }) => {
      return request<CostCalculation>(`/costings/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['costings'] });
      queryClient.invalidateQueries({ queryKey: ['costing', variables.id] });
    },
  });
}

export function useDeleteCosting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await request<void>(`/costings/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costings'] });
    },
  });
}

export function useRecipeCostingTemplate() {
  return useMutation({
    mutationFn: async (recipeId: string) => {
      return request<CostCalculation>(
        `/costings/recipe-template/${recipeId}`,
      );
    },
  });
}

export function useRecipesSelection() {
  return useQuery({
    queryKey: ['recipes', 'selection'],
    queryFn: async () => {
      const res = await request<PagedResponse<{ id: string; code: string; name: string }>>(
        '/recipes?pageSize=100',
      );
      return res.data;
    },
  });
}

export interface MasterDataUnit {
  id: string;
  code: string;
  symbol: string;
  nameTh: string;
  nameEn: string;
  physicalDimension?: string;
  conversionFactorToBase?: number;
}

export function useUnits() {
  return useQuery({
    queryKey: ['units', 'active'],
    queryFn: async () => {
      return request<MasterDataUnit[]>('/units');
    },
    staleTime: 5 * 60 * 1000,
  });
}
