import React, { useState } from 'react';

/**
 * Vote result for a field
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
 * Props for ConflictResolutionModal component
 */
export interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: VoteResult[];
  documentText: string;
  sessionId: string;
  onResolve: (
    sessionId: string,
    fields: string[],
    method: 'llm' | 'user',
    userChoices?: Record<string, any>
  ) => Promise<void>;
  isResolving?: boolean;
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
 * Resolution method type
 */
type ResolutionMethod = 'llm' | 'user' | null;

/**
 * Icons
 */
const XIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const BrainIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
  </svg>
);

const UserIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

/**
 * Component: Conflict Resolution Modal
 *
 * Allows users to resolve conflicts in multi-strategy parsing results
 * by choosing between LLM evaluation or manual selection.
 */
export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  isOpen,
  onClose,
  conflicts,
  documentText,
  sessionId,
  onResolve,
  isResolving = false,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<ResolutionMethod>(null);
  const [userChoices, setUserChoices] = useState<Record<string, any>>({});
  const [currentStep, setCurrentStep] = useState<0 | 1 | 2>(0); // 0: select method, 1: make choices, 2: resolving

  if (!isOpen) return null;

  const handleMethodSelect = (method: 'llm' | 'user') => {
    setSelectedMethod(method);
    setCurrentStep(1);
  };

  const handleUserChoice = (fieldName: string, value: any) => {
    setUserChoices((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleResolve = async () => {
    setCurrentStep(2);
    const fieldsToResolve = conflicts.map((c) => c.fieldName);

    if (selectedMethod === 'user') {
      await onResolve(sessionId, fieldsToResolve, 'user', userChoices);
    } else {
      await onResolve(sessionId, fieldsToResolve, 'llm');
    }

    // Reset after resolution
    setCurrentStep(0);
    setSelectedMethod(null);
    setUserChoices({});
    onClose();
  };

  const isReadyToResolve =
    selectedMethod === 'llm' ||
    (selectedMethod === 'user' &&
      conflicts.every((c) => userChoices[c.fieldName] !== undefined));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Resolve Conflicts
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {conflicts.length} field{conflicts.length > 1 ? 's' : ''} need resolution
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isResolving}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <XIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentStep === 0 && (
            <div className="space-y-4">
              <p className="text-gray-700">
                Choose a resolution method for the conflicted fields:
              </p>

              {/* Document preview */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Document Context
                </h3>
                <p className="text-sm text-gray-600 line-clamp-4">
                  {documentText.slice(0, 500)}
                  {documentText.length > 500 && '...'}
                </p>
              </div>

              {/* Method selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* LLM Resolution */}
                <button
                  onClick={() => handleMethodSelect('llm')}
                  disabled={isResolving}
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all text-left group"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                      <BrainIcon className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">LLM Evaluation</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Let the AI analyze the document context and select the best value for each field.
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        Recommended for complex conflicts requiring document understanding.
                      </p>
                    </div>
                  </div>
                </button>

                {/* User Selection */}
                <button
                  onClick={() => handleMethodSelect('user')}
                  disabled={isResolving}
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                      <UserIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Manual Selection</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Review each conflict and manually select the correct value.
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        Best when you have domain knowledge about the contract.
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              {/* Conflicts preview */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-orange-900 mb-2">
                  Conflicted Fields
                </h3>
                <div className="flex flex-wrap gap-2">
                  {conflicts.map((conflict) => (
                    <span
                      key={conflict.fieldName}
                      className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-sm"
                    >
                      {conflict.fieldName}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === 1 && selectedMethod === 'user' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <UserIcon className="w-4 h-4" />
                <span>Review each conflict and select the correct value:</span>
              </div>

              {conflicts.map((conflict) => (
                <div
                  key={conflict.fieldName}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <h3 className="font-medium text-gray-900 mb-3">
                    {conflict.fieldName}
                  </h3>

                  <div className="space-y-2">
                    {conflict.votes.map((vote, index) => (
                      <label
                        key={`${conflict.fieldName}-${index}`}
                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          userChoices[conflict.fieldName] === vote.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name={conflict.fieldName}
                          value={vote.value}
                          checked={userChoices[conflict.fieldName] === vote.value}
                          onChange={() => handleUserChoice(conflict.fieldName, vote.value)}
                          className="text-blue-600"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">
                              {getStrategyDisplayName(vote.strategy)}
                            </span>
                            <span className="text-xs text-gray-500">
                              (weight: {vote.weight})
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 mt-1">
                            {formatValue(vote.value)}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              {/* Custom value option */}
              {conflicts.map((conflict) => (
                <div key={`custom-${conflict.fieldName}`} className="border border-dashed border-gray-300 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Or enter a custom value for {conflict.fieldName}:
                  </label>
                  <input
                    type="text"
                    value={userChoices[conflict.fieldName] || ''}
                    onChange={(e) =>
                      handleUserChoice(conflict.fieldName, e.target.value)
                    }
                    placeholder="Enter custom value..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              ))}
            </div>
          )}

          {currentStep === 1 && selectedMethod === 'llm' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <BrainIcon className="w-4 h-4" />
                <span>LLM will analyze the document and resolve the following conflicts:</span>
              </div>

              <div className="space-y-3">
                {conflicts.map((conflict) => (
                  <div
                    key={conflict.fieldName}
                    className="border border-purple-200 bg-purple-50 rounded-lg p-4"
                  >
                    <h3 className="font-medium text-gray-900 mb-2">
                      {conflict.fieldName}
                    </h3>
                    <div className="space-y-1 text-sm">
                      {conflict.votes.map((vote, index) => (
                        <div key={index} className="text-gray-700">
                          <span className="font-medium">
                            {getStrategyDisplayName(vote.strategy)}
                          </span>
                          : {formatValue(vote.value)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> LLM resolution uses the document context to determine
                  the most accurate value. This may take a few moments depending on the
                  number of conflicts.
                </p>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mb-4" />
              <p className="text-lg font-medium text-gray-900">
                {selectedMethod === 'llm' ? 'LLM is analyzing...' : 'Applying your choices...'}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Resolving {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => {
              if (currentStep === 1) {
                setCurrentStep(0);
                setSelectedMethod(null);
              } else {
                onClose();
              }
            }}
            disabled={isResolving || currentStep === 2}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            {currentStep === 1 ? 'Back' : 'Cancel'}
          </button>

          {currentStep === 1 && (
            <button
              onClick={handleResolve}
              disabled={!isReadyToResolve || isResolving}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isResolving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Resolving...
                </>
              ) : (
                <>
                  <CheckIcon className="w-4 h-4" />
                  Resolve {conflicts.length} Conflict{conflicts.length > 1 ? 's' : ''}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConflictResolutionModal;
