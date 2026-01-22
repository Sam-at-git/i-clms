/**
 * Topic Architecture for Contract Information Extraction
 *
 * This file defines the core interfaces for the extensible topic-based
 * extraction architecture. New topics can be added by creating a new
 * topic definition and registering it with TopicRegistryService.
 */

/**
 * Field definition within a topic
 */
export interface FieldDefinition {
  /** Field name (camelCase) */
  name: string;
  /** Field data type */
  type: 'string' | 'number' | 'decimal' | 'date' | 'boolean' | 'array';
  /** Whether this field is required for completeness */
  required: boolean;
  /** Human-readable description */
  description?: string;
  /** Default value if not extracted */
  defaultValue?: any;
}

/**
 * Extract Topic Definition
 *
 * Defines a topic (category of information) that can be extracted
 * from a contract document.
 */
export interface ExtractTopicDefinition {
  /** Unique topic identifier (e.g., 'BASIC_INFO', 'FINANCIAL') */
  name: string;
  /** Human-readable display name */
  displayName: string;
  /** Topic description */
  description: string;
  /** Fields that belong to this topic */
  fields: FieldDefinition[];
  /** LLM prompt template for this topic */
  prompt?: string;
  /** RAG query template for this topic */
  query?: string;
  /** Weight for completeness calculation (higher = more important) */
  weight?: number;
  /** Execution order (lower = executed first) */
  order?: number;
}

/**
 * Result of extracting a single topic
 */
export interface TopicExtractResult {
  /** Name of the topic that was extracted */
  topicName: string;
  /** Whether extraction was successful */
  success: boolean;
  /** Extracted data (key-value pairs) */
  data: Record<string, any>;
  /** Confidence score (0-1) */
  confidence?: number;
  /** Warning messages */
  warnings?: string[];
  /** When this result was extracted */
  extractedAt: Date;
}

/**
 * Completeness score breakdown
 */
export interface CompletenessScoreBreakdown {
  /** Overall score (0-100) */
  score: number;
  /** Total weighted score achieved */
  total: number;
  /** Maximum possible score */
  maxScore: number;
  /** Per-topic breakdown */
  topicScores?: TopicScoreBreakdown[];
}

/**
 * Per-topic score breakdown
 */
export interface TopicScoreBreakdown {
  /** Topic name */
  topicName: string;
  /** Topic display name */
  displayName: string;
  /** Weight used for this topic */
  weight: number;
  /** Number of completed fields */
  completedFields: number;
  /** Total number of fields */
  totalFields: number;
  /** Percentage complete (0-100) */
  percentage: number;
  /** Score achieved (weighted) */
  score: number;
}

/**
 * Topic field with value
 */
export interface TopicFieldValue {
  /** Field name */
  name: string;
  /** Field type */
  type: string;
  /** Field value */
  value: any;
  /** Whether field has a valid value */
  hasValue: boolean;
  /** Field description */
  description?: string;
}
