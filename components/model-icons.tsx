'use client';

import React from 'react';
import { useTheme } from 'next-themes';

/**
 * Shared utility to render a provider/model icon with proper dark/light mode support.
 * Light mode: black icons, Dark mode: white icons
 */

const ICON_CONTAINER_CLASSES = 'w-6 h-6 rounded-lg flex items-center justify-center';

export const getModelIcon = (modelId: string, modelName: string) => {
  const { resolvedTheme } = useTheme();
  const provider = modelId.split('/')[0].toLowerCase();
  const name = modelName.toLowerCase();
  const isLight = resolvedTheme === 'light';

  // For PNG/JPG images: Light mode = black, Dark mode = white  
  const commonImgProps = {
    width: 24,
    height: 24,
    style: {
      filter: isLight ? 'brightness(0)' : 'brightness(0) invert(1)'
    } as React.CSSProperties,
  } as const;

  // Google / Gemini
  if (provider === 'google' || name.includes('gemini')) {
    return (
      <div className={ICON_CONTAINER_CLASSES}>
        <img
          src="https://0pvg75gf2p.ufs.sh/f/uIkPOAEEjnXHgQQZCOIu0dqnMr6CPXQmtESiZog37OkpDyA2"
          alt="Google Gemini"
          {...commonImgProps}
        />
      </div>
    );
  }

  // OpenAI / GPT
  if (provider === 'openai' || name.includes('gpt')) {
    return (
      <div className={ICON_CONTAINER_CLASSES}>
        <img
          src="https://0pvg75gf2p.ufs.sh/f/uIkPOAEEjnXH9zKa0B3skoMtQ5E1lyJgGPSwKB32iIb4FAuC"
          alt="OpenAI"
          {...commonImgProps}
        />
      </div>
    );
  }

  // Anthropic / Claude
  if (provider === 'anthropic' || name.includes('claude')) {
    return (
      <div className={ICON_CONTAINER_CLASSES}>
        <img
          src="https://cdn.brandfetch.io/idmJWF3N06/theme/light/symbol.svg?c=1dxbfHSJFAPEGdCLU4o5B"
          alt="Anthropic"
          {...commonImgProps}
        />
      </div>
    );
  }

  // X-AI / Grok
  if (provider === 'xai' || provider === 'x-ai' || name.includes('grok')) {
    return (
      <div className={ICON_CONTAINER_CLASSES}>
        <img
          src="https://0pvg75gf2p.ufs.sh/f/uIkPOAEEjnXHbKBI8kTfp2I3rPXDuQczAnH1mdFTVyla6WRb"
          alt="XAI / Grok"
          {...commonImgProps}
        />
      </div>
    );
  }

  // DeepSeek
  if (provider === 'deepseek' || name.includes('deepseek')) {
    return (
      <div className={ICON_CONTAINER_CLASSES}>
        <img
          src="https://0pvg75gf2p.ufs.sh/f/uIkPOAEEjnXH9jkW4t3skoMtQ5E1lyJgGPSwKB32iIb4FAuC"
          alt="DeepSeek"
          {...commonImgProps}
        />
      </div>
    );
  }

  // Meta / Llama
  if (provider === 'meta' || name.includes('llama')) {
    return (
      <div className={ICON_CONTAINER_CLASSES}>
        <img
          src="https://0pvg75gf2p.ufs.sh/f/uIkPOAEEjnXH4bqFwG80t1vqfwoBCU7LFKzhaMdiYlxI2cgE"
          alt="Meta / Llama"
          {...commonImgProps}
        />
      </div>
    );
  }

  // Perplexity
  if (provider === 'perplexity' || name.includes('perplexity')) {
    return (
      <div className={ICON_CONTAINER_CLASSES}>
        <img
          src="https://cdn.brandfetch.io/idNdawywEZ/w/800/h/800/theme/light/idpU_bxbjJ.png?c=1dxbfHSJFAPEGdCLU4o5B"
          alt="Perplexity"
          {...commonImgProps}
        />
      </div>
    );
  }

  // Mistral
  if (provider === 'mistral' || name.includes('mistral')) {
    return (
      <div className={ICON_CONTAINER_CLASSES}>
        <img
          src="https://0pvg75gf2p.ufs.sh/f/uIkPOAEEjnXH2iPLfNmqLthPf8gCkvnVibODKuxWQ4SewZYF"
          alt="Mistral"
          {...commonImgProps}
        />
      </div>
    );
  }

  // Groq
  if (provider === 'groq' || name.includes('groq')) {
    return (
      <div className={ICON_CONTAINER_CLASSES}>
        <svg 
          width={24} 
          height={24} 
          viewBox="0 0 24 24" 
          fill="currentColor" 
          className={isLight ? "text-black" : "text-white"}
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.5 6L12 10.5 8.5 8 12 5.5 15.5 8zM8.5 16L12 13.5 15.5 16 12 18.5 8.5 16z" />
        </svg>
      </div>
    );
  }

  // Default fallback – first letter of provider
  return (
    <div className={`${ICON_CONTAINER_CLASSES} bg-muted text-muted-foreground text-xs font-medium`}>
      {provider.charAt(0).toUpperCase()}
    </div>
  );
}; 