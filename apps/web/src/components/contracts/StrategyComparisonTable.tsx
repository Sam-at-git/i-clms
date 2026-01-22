import React from 'react';

/**
 * Vote result from a single field
 */
interface VoteResult {
  fieldName: string;
  agreedValue: any;
  confidence: number;
  votes: Array<{
    strategy: string;
    value: any;
    weight: number;
  }>;
  needsResolution: boolean;
  resolutionMethod?: 'vote' | 'llm' | 'user';
}

/**
 * Strategy result
 */
interface StrategyResult {
  strategy: string;
  success: boolean;
  fields: Record<string, any>;
  confidence?: number;
  processingTimeMs?: number;
  error?: string;
}

/**
 * Multi-strategy parse result
 */
export interface MultiStrategyParseResult {
  results: StrategyResult[];
  finalFields: Record<string, any>;
  voteResults: VoteResult[];
  overallConfidence: number;
  conflicts: string[];
  warnings: string[];
  duration: number;
  timestamp?: string;
}

/**
 * Props for StrategyComparisonTable component
 */
export interface StrategyComparisonTableProps {
  result: MultiStrategyParseResult;
  onResolveConflicts?: (conflicts: string[]) => void;
  className?: string;
}

/**
 * Format a value for display
 */
function formatValue(value: any): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Get strategy display name
 */
function getStrategyDisplayName(strategy: string): string {
  const names: Record<string, string> = {
    RULE: 'Rule-based',
    LLM: 'LLM Parser',
    DOCLING: 'Docling',
    RAG: 'RAG Enhanced',
  };
  return names[strategy] || strategy;
}

/**
 * Get strategy color class
 */
function getStrategyColorClass(strategy: string): string {
  const colors: Record<string, string> = {
    RULE: 'text-blue-600',
    LLM: 'text-purple-600',
    DOCLING: 'text-green-600',
    RAG: 'text-orange-600',
  };
  return colors[strategy] || 'text-gray-600';
}

/**
 * Get confidence color
 */
function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'bg-green-500';
  if (confidence >= 0.6) return 'bg-yellow-500';
  return 'bg-red-500';
}

/**
 * Icons
 */
const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const XIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const AlertIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const TrendingIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

/**
 * Component: Strategy Comparison Table
 *
 * Displays results from multiple parsing strategies side by side
 * with voting results and conflict highlighting.
 */
export const StrategyComparisonTable: React.FC<StrategyComparisonTableProps> = ({
  result,
  onResolveConflicts,
  className = '',
}) => {
  const { results, voteResults, overallConfidence, conflicts, warnings, duration } =
    result;

  // Get all unique field names from vote results
  const fieldNames = voteResults.map((v) => v.fieldName);

  // Calculate statistics
  const successfulStrategies = results.filter((r) => r.success).length;
  const totalStrategies = results.length;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Multi-Strategy Comparison
          </h3>
          <div className="flex items-center gap-2">
            <ClockIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">{duration}ms</span>
          </div>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 uppercase">Strategies</p>
            <p className="text-xl font-semibold text-gray-900">
              {successfulStrategies}/{totalStrategies}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 uppercase">Confidence</p>
            <div className="flex items-center gap-2">
              <p className="text-xl font-semibold text-gray-900">
                {(overallConfidence * 100).toFixed(1)}%
              </p>
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getConfidenceColor(overallConfidence)}`}
                  style={{ width: `${overallConfidence * 100}%` }}
                />
              </div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 uppercase">Conflicts</p>
            <p className="text-xl font-semibold text-gray-900">
              {conflicts.length}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 uppercase">Fields</p>
            <p className="text-xl font-semibold text-gray-900">
              {voteResults.length}
            </p>
          </div>
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertIcon className="w-4 h-4 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800">Warnings</p>
                <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside">
                  {warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Strategy Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Strategy Status</h4>
        <div className="flex flex-wrap gap-3">
          {results.map((result) => (
            <div
              key={result.strategy}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                result.success
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              {result.success ? (
                <CheckIcon className="w-4 h-4 text-green-600" />
              ) : (
                <XIcon className="w-4 h-4 text-red-600" />
              )}
              <span className={`text-sm font-medium ${getStrategyColorClass(result.strategy)}`}>
                {getStrategyDisplayName(result.strategy)}
              </span>
              {result.processingTimeMs && (
                <span className="text-xs text-gray-500">
                  {result.processingTimeMs}ms
                </span>
              )}
              {result.confidence && (
                <span className="text-xs text-gray-500">
                  {(result.confidence * 100).toFixed(0)}%
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-700">Field Comparison</h4>
          {conflicts.length > 0 && onResolveConflicts && (
            <button
              onClick={() => onResolveConflicts(conflicts)}
              className="px-3 py-1.5 text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors flex items-center gap-1"
            >
              <AlertIcon className="w-4 h-4" />
              Resolve {conflicts.length} Conflict{conflicts.length > 1 ? 's' : ''}
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Field
                </th>
                {results.map(
                  (result) =>
                    result.success && (
                      <th
                        key={result.strategy}
                        className={`px-4 py-3 text-left text-xs font-medium ${getStrategyColorClass(
                          result.strategy
                        )} uppercase`}
                      >
                        {getStrategyDisplayName(result.strategy)}
                      </th>
                    )
                )}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Agreed Value
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Confidence
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {voteResults.map((voteResult) => {
                const isConflict = voteResult.needsResolution;
                return (
                  <tr
                    key={voteResult.fieldName}
                    className={isConflict ? 'bg-orange-50' : ''}
                  >
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {voteResult.fieldName}
                        </span>
                        {isConflict && (
                          <AlertIcon className="w-4 h-4 text-orange-500" />
                        )}
                      </div>
                    </td>
                    {results.map(
                      (result) =>
                        result.success && (
                          <td
                            key={result.strategy}
                            className="px-4 py-3 text-sm text-gray-600"
                          >
                            {formatValue(result.fields[voteResult.fieldName])}
                          </td>
                        )
                    )}
                    <td className="px-4 py-3 text-sm">
                      <span className="font-medium text-gray-900">
                        {formatValue(voteResult.agreedValue)}
                      </span>
                      {voteResult.resolutionMethod && (
                        <span className="ml-2 text-xs text-gray-500">
                          ({voteResult.resolutionMethod})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getConfidenceColor(
                              voteResult.confidence
                            )}`}
                            style={{ width: `${voteResult.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600">
                          {(voteResult.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vote Details */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <TrendingIcon className="w-4 h-4" />
          Vote Details
        </h4>
        <div className="space-y-3">
          {voteResults.slice(0, 5).map((voteResult) => (
            <div key={voteResult.fieldName} className="border-b border-gray-100 pb-3 last:border-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-900">
                  {voteResult.fieldName}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    voteResult.needsResolution
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  {voteResult.needsResolution ? 'Conflict' : 'Agreed'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {voteResult.votes.map((vote, i) => (
                  <div
                    key={`${voteResult.fieldName}-${i}`}
                    className="text-xs px-2 py-1 bg-gray-100 rounded"
                  >
                    <span className={getStrategyColorClass(vote.strategy)}>
                      {getStrategyDisplayName(vote.strategy)}
                    </span>
                    <span className="text-gray-500 ml-1">(w: {vote.weight})</span>: {formatValue(vote.value)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StrategyComparisonTable;
