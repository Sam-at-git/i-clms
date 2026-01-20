import { useCallback } from 'react';
import { useMutation as useApolloMutation, MutationHookOptions } from '@apollo/client/react';
import { DocumentNode, OperationVariables } from '@apollo/client/core';

interface OptimisticMutationOptions<TData, TVariables extends OperationVariables, TCache>
  extends Omit<MutationHookOptions<TData, TVariables>, 'update'> {
  updateCache?: (cache: TCache, variables: TVariables) => TCache;
  rollbackCache?: (cache: TCache) => TCache;
}

export function useOptimisticMutation<TData, TVariables extends OperationVariables, TCache = unknown>(
  mutation: DocumentNode,
  options: OptimisticMutationOptions<TData, TVariables, TCache>
) {
  const [mutate, { loading, error, data }] = useApolloMutation<TData, TVariables>(mutation, {
    ...options,
    optimisticResponse: options.optimisticResponse,
    update: options.updateCache
      ? (cache, result) => {
          options.updateCache!(cache as unknown as TCache, result.data as unknown as TVariables);
        }
      : undefined,
  });

  const executeMutation = useCallback(
    async (variables: TVariables) => {
      return await mutate({ variables });
    },
    [mutate]
  );

  return [executeMutation, { loading, error, data }] as const;
}
