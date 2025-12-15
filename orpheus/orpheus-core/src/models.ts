/**
 * Orpheus Model Registry
 * Centralized frontier model configuration
 *
 * UPDATE THIS FILE when new models release.
 * Last verified: 2024-12-15
 */

export const FRONTIER_MODELS = {
  openai: {
    flagship: 'gpt-4o',
    reasoning: 'o1',
    updated: '2024-12-15',
  },
  anthropic: {
    flagship: 'claude-opus-4-5-20251101',
    execution: 'claude-sonnet-4-5-20250929',
    updated: '2024-12-15',
  },
  google: {
    flagship: 'gemini-2.5-pro-preview-06-05',
    fast: 'gemini-2.0-flash-exp',
    updated: '2024-12-15',
  },
} as const;

export type OpenAIModel = typeof FRONTIER_MODELS.openai[keyof typeof FRONTIER_MODELS.openai];
export type AnthropicModel = typeof FRONTIER_MODELS.anthropic[keyof typeof FRONTIER_MODELS.anthropic];
export type GoogleModel = typeof FRONTIER_MODELS.google[keyof typeof FRONTIER_MODELS.google];

/**
 * Get the recommended model for a given provider and use case
 */
export function getModel(provider: 'openai' | 'anthropic' | 'google', useCase: 'flagship' | 'fast' | 'reasoning' | 'execution' = 'flagship'): string {
  const models = FRONTIER_MODELS[provider];

  if (useCase in models) {
    return models[useCase as keyof typeof models];
  }

  // Fallback to flagship
  return models.flagship;
}
