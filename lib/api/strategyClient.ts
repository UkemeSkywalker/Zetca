/**
 * API Client for Strategist Agent Backend
 * Handles communication with the Python FastAPI service
 */

import { StrategyInput, StrategyOutput, StrategyRecord } from '@/types/strategy';

const API_BASE_URL = process.env.NEXT_PUBLIC_PYTHON_SERVICE_URL || 'http://localhost:8000';

/**
 * Custom error class for API errors
 */
export class StrategyAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'StrategyAPIError';
  }
}

/**
 * Get JWT token from localStorage
 * @returns JWT token or null if not found
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('token');
}

/**
 * Create headers with JWT authentication
 * @returns Headers object with Authorization header if token exists
 */
function createAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Handle authentication errors by redirecting to login
 */
function handleAuthError(): void {
  if (typeof window !== 'undefined') {
    // Clear token and redirect to login
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
}

/**
 * Generate a social media strategy using the Strategist Agent
 * 
 * @param input - Strategy input data (brand name, industry, target audience, goals)
 * @returns Promise resolving to the generated strategy output
 * @throws StrategyAPIError if the request fails
 */
export async function generateStrategy(input: StrategyInput): Promise<StrategyOutput> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/strategy/generate`, {
      method: 'POST',
      headers: createAuthHeaders(),
      body: JSON.stringify({
        brand_name: input.brandName,
        industry: input.industry,
        target_audience: input.targetAudience,
        goals: input.goals,
      }),
    });

    // Handle 401 Unauthorized - redirect to login
    if (response.status === 401) {
      handleAuthError();
      throw new StrategyAPIError(
        'Authentication required. Please log in again.',
        401
      );
    }

    // Handle 403 Forbidden - access denied
    if (response.status === 403) {
      throw new StrategyAPIError(
        'Access denied. You do not have permission to perform this action.',
        403
      );
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new StrategyAPIError(
        errorData.detail || `Failed to generate strategy: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    const data = await response.json();
    
    // Convert snake_case from Python to camelCase for TypeScript
    return {
      contentPillars: data.strategy_output?.content_pillars || data.content_pillars || [],
      postingSchedule: data.strategy_output?.posting_schedule || data.posting_schedule || '',
      platformRecommendations: data.strategy_output?.platform_recommendations || data.platform_recommendations || [],
      contentThemes: data.strategy_output?.content_themes || data.content_themes || [],
      engagementTactics: data.strategy_output?.engagement_tactics || data.engagement_tactics || [],
      visualPrompts: data.strategy_output?.visual_prompts || data.visual_prompts || [],
    };
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new StrategyAPIError(
        'Network error: Unable to connect to the strategy service. Please check your connection and try again.',
        undefined,
        error
      );
    }

    // Re-throw StrategyAPIError as-is
    if (error instanceof StrategyAPIError) {
      throw error;
    }

    // Wrap other errors
    throw new StrategyAPIError(
      'An unexpected error occurred while generating the strategy',
      undefined,
      error
    );
  }
}

/**
 * List all strategies for the authenticated user
 * 
 * @returns Promise resolving to an array of strategy records
 * @throws StrategyAPIError if the request fails
 */
export async function listStrategies(): Promise<StrategyRecord[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/strategy/list`, {
      method: 'GET',
      headers: createAuthHeaders(),
    });

    // Handle 401 Unauthorized - redirect to login
    if (response.status === 401) {
      handleAuthError();
      throw new StrategyAPIError(
        'Authentication required. Please log in again.',
        401
      );
    }

    // Handle 403 Forbidden - access denied
    if (response.status === 403) {
      throw new StrategyAPIError(
        'Access denied. You do not have permission to view these strategies.',
        403
      );
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new StrategyAPIError(
        errorData.detail || `Failed to list strategies: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    const data = await response.json();
    
    // Convert snake_case from Python to camelCase for TypeScript
    return data.map((record: any) => ({
      id: record.id,
      userId: record.user_id,
      brandName: record.brand_name,
      industry: record.industry,
      targetAudience: record.target_audience,
      goals: record.goals,
      strategyOutput: {
        contentPillars: record.strategy_output.content_pillars,
        postingSchedule: record.strategy_output.posting_schedule,
        platformRecommendations: record.strategy_output.platform_recommendations,
        contentThemes: record.strategy_output.content_themes,
        engagementTactics: record.strategy_output.engagement_tactics,
        visualPrompts: record.strategy_output.visual_prompts,
      },
      createdAt: record.created_at,
    }));
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new StrategyAPIError(
        'Network error: Unable to connect to the strategy service. Please check your connection and try again.',
        undefined,
        error
      );
    }

    // Re-throw StrategyAPIError as-is
    if (error instanceof StrategyAPIError) {
      throw error;
    }

    // Wrap other errors
    throw new StrategyAPIError(
      'An unexpected error occurred while listing strategies',
      undefined,
      error
    );
  }
}

/**
 * Get a specific strategy by ID
 * 
 * @param id - Strategy ID
 * @returns Promise resolving to the strategy record
 * @throws StrategyAPIError if the request fails
 */
export async function getStrategy(id: string): Promise<StrategyRecord> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/strategy/${id}`, {
      method: 'GET',
      headers: createAuthHeaders(),
    });

    // Handle 401 Unauthorized - redirect to login
    if (response.status === 401) {
      handleAuthError();
      throw new StrategyAPIError(
        'Authentication required. Please log in again.',
        401
      );
    }

    // Handle 403 Forbidden - access denied
    if (response.status === 403) {
      throw new StrategyAPIError(
        'Access denied. You do not have permission to view this strategy.',
        403
      );
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new StrategyAPIError(
        errorData.detail || `Failed to get strategy: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    const record = await response.json();
    
    // Convert snake_case from Python to camelCase for TypeScript
    return {
      id: record.id,
      userId: record.user_id,
      brandName: record.brand_name,
      industry: record.industry,
      targetAudience: record.target_audience,
      goals: record.goals,
      strategyOutput: {
        contentPillars: record.strategy_output.content_pillars,
        postingSchedule: record.strategy_output.posting_schedule,
        platformRecommendations: record.strategy_output.platform_recommendations,
        contentThemes: record.strategy_output.content_themes,
        engagementTactics: record.strategy_output.engagement_tactics,
        visualPrompts: record.strategy_output.visual_prompts,
      },
      createdAt: record.created_at,
    };
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new StrategyAPIError(
        'Network error: Unable to connect to the strategy service. Please check your connection and try again.',
        undefined,
        error
      );
    }

    // Re-throw StrategyAPIError as-is
    if (error instanceof StrategyAPIError) {
      throw error;
    }

    // Wrap other errors
    throw new StrategyAPIError(
      'An unexpected error occurred while getting the strategy',
      undefined,
      error
    );
  }
}
