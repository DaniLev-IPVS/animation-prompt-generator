'use client';

import { useCallback } from 'react';
import type { AnthropicMessage } from '@/types';

interface CallAnthropicOptions {
  model?: string;
  max_tokens?: number;
  system?: string;
  messages: AnthropicMessage[];
  projectId?: string;
  stage?: string;
}

export function useAnthropicAPI() {
  const callAnthropic = useCallback(
    async ({
      model = 'claude-sonnet-4-20250514',
      max_tokens = 4000,
      system,
      messages,
      projectId,
      stage,
    }: CallAnthropicOptions) => {
      const response = await fetch('/api/anthropic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          max_tokens,
          system,
          messages,
          projectId,
          stage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'API call failed');
      }

      return response.json();
    },
    []
  );

  return { callAnthropic };
}
