'use client';

import { useState, useMemo, useOptimistic, startTransition, useEffect } from 'react';
import useSWR from 'swr';
import { saveChatModelAsCookie } from '@/app/(chat)/actions';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  CheckCircleFillIcon,
  ChevronDownIcon,
  StarIcon,
  StarFillIcon,
} from './icons';
import type { Session } from 'next-auth';

type OpenRouterModel = {
  id: string;
  name: string;
  description?: string;
  architecture?: {
    input_modalities?: string[];
    output_modalities?: string[];
  };
  context_length?: number;
  pricing?: {
    prompt: string;
    completion: string;
  };
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const FAVORITE_IDS = [
  'openai/gpt-4o',
  'openai/gpt-4o-mini',
];

const DEFAULT_IDS = [
  'openai/gpt-4o',
  'google/gemini-2.5-flash-lite-preview-06-17',
  'xai/grok-3-mini',
  'meta/llama-4-maverick',
  'openrouter/o4-mini',
  'google/gemini-2.5-pro',
  'anthropic/claude-4-sonnet',
  'anthropic/claude-4-opus',
];

const PROVIDER_ORDER = ['google', 'anthropic', 'openai', 'x-ai', 'meta', 'mistral', 'deepseek'];

// Get model icon based on provider and model name
const getModelIcon = (modelId: string, modelName: string) => {
  const provider = modelId.split('/')[0].toLowerCase();
  const name = modelName.toLowerCase();
  
  // Google models
  if (provider === 'google' || name.includes('gemini')) {
    return (
      <div className="w-8 h-8 rounded-lg flex items-center justify-center">
      <img
        src="https://0pvg75gf2p.ufs.sh/f/uIkPOAEEjnXHgQQZCOIu0dqnMr6CPXQmtESiZog37OkpDyA2"
        alt="Anthropic"
        width={24}
        height={24}
        className="text-foreground"
        style={{ filter: 'brightness(0) invert(1)' }} // This makes it white in dark mode, black in light mode
      />
    </div>
    );
  }
  
  // OpenAI models
  if (provider === 'openai' || name.includes('gpt')) {
    return (
      <div className="w-8 h-8 rounded-lg flex items-center justify-center">
      <img
        src="https://cdn.brandfetch.io/idR3duQxYl/theme/light/symbol.svg?c=1dxbfHSJFAPEGdCLU4o5B"
        alt="Anthropic"
        width={26}
        height={26}
        className="text-foreground"
        style={{ filter: 'brightness(0) invert(1)' }} // This makes it white in dark mode, black in light mode
      />
    </div>
    );
  }
  
  // Anthropic models - "A" logo
  if (provider === 'anthropic' || name.includes('claude')) {
    return (
      <div className="w-8 h-8 rounded-lg flex items-center justify-center">
      <img
        src="https://cdn.brandfetch.io/idmJWF3N06/theme/light/symbol.svg?c=1dxbfHSJFAPEGdCLU4o5B"
        alt="Anthropic"
        width={24}
        height={24}
        className="text-foreground"
        style={{ filter: 'brightness(0) invert(1)' }} // This makes it white in dark mode, black in light mode
      />
    </div>
    );
  }
  
  // XAI/Grok models - "x1" logo
  if (provider === 'xai' || provider === 'x-ai' || name.includes('grok')) {
    return (
      <div className="w-8 h-8 rounded-lg flex items-center justify-center">
      <img
        src="https://cdn.brandfetch.io/iddjpnb3_W/theme/light/logo.svg?c=1dxbfHSJFAPEGdCLU4o5B"
        alt="Anthropic"
        width={22}
        height={22}
        className="text-foreground"
        style={{ filter: 'brightness(0) invert(1)' }} // This makes it white in dark mode, black in light mode
      />
    </div>
    );
  }
  
  // DeepSeek models - whale logo
  if (provider === 'deepseek' || name.includes('deepseek')) {
    return (
      <div className="w-8 h-8 rounded-lg flex items-center justify-center">
      <img
        src="https://0pvg75gf2p.ufs.sh/f/uIkPOAEEjnXH9jkW4t3skoMtQ5E1lyJgGPSwKB32iIb4FAuC"
        alt="Anthropic"
        width={24}
        height={24}
        className="text-foreground"
        style={{ filter: 'brightness(0) invert(1)' }} // This makes it white in dark mode, black in light mode
      />
    </div>
    );
  }
  
  // Meta/Llama models - infinity symbol
  if (provider === 'meta' || name.includes('llama')) {
    return (
      <div className="w-8 h-8 rounded-lg flex items-center justify-center">
      <img
        src="https://0pvg75gf2p.ufs.sh/f/uIkPOAEEjnXH4bqFwG80t1vqfwoBCU7LFKzhaMdiYlxI2cgE"
        alt="Anthropic"
        width={24}
        height={24}
        className="text-foreground"
        style={{ filter: 'brightness(0) invert(1)' }} // This makes it white in dark mode, black in light mode
      />
    </div>
    );
  }
  
  // Perplexity models - infinity circle logo
  if (provider === 'perplexity' || name.includes('perplexity')) {
    return (
      <div className="w-8 h-8 rounded-lg flex items-center justify-center">
      <img
        src="https://cdn.brandfetch.io/idNdawywEZ/w/800/h/800/theme/light/idpU_bxbjJ.png?c=1dxbfHSJFAPEGdCLU4o5B"
        alt="Anthropic"
        width={24}
        height={24}
        className="text-foreground"
        style={{ filter: 'brightness(0) invert(1)' }} // This makes it white in dark mode, black in light mode
      />
    </div>
    );
  }
  
  // Mistral models - castle/tower logo
  if (provider === 'mistral' || name.includes('mistral')) {
    return (
      <div className="w-8 h-8 rounded-lg flex items-center justify-center">
      <img
        src="https://0pvg75gf2p.ufs.sh/f/uIkPOAEEjnXH2iPLfNmqLthPf8gCkvnVibODKuxWQ4SewZYF"
        alt="Anthropic"
        width={24}
        height={24}
        className="text-foreground"
        style={{ filter: 'brightness(0) invert(1)' }} // This makes it white in dark mode, black in light mode
      />
    </div>
    );
  }
  
  // Groq models
  if (provider === 'groq' || name.includes('groq')) {
    return (
      <div className="w-8 h-8 rounded-lg flex items-center justify-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-foreground">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.5 6L12 10.5 8.5 8 12 5.5 15.5 8zM8.5 16L12 13.5 15.5 16 12 18.5 8.5 16z"/>
        </svg>
      </div>
    );
  }
  
  // Default fallback
  return (
    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-xs font-medium">
      {provider.charAt(0).toUpperCase()}
    </div>
  );
};
// Get capability badges for a model
const getCapabilityBadges = (model: OpenRouterModel) => {
  const badges = [];
  const name = model.name.toLowerCase();
  const id = model.id.toLowerCase();
  
  // Vision capability
  if (model.architecture?.input_modalities?.includes('image') || 
      name.includes('vision') || name.includes('4o') || name.includes('flash')) {
    badges.push(
      <div key="vision" className="w-4 h-4 rounded bg-green-500/20 flex items-center justify-center">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-green-400">
          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
        </svg>
      </div>
    );
  }
  
  // Code capability
  if (name.includes('code') || name.includes('coder') || id.includes('deepseek')) {
    badges.push(
      <div key="code" className="w-4 h-4 rounded bg-blue-500/20 flex items-center justify-center">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-blue-400">
          <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0L19.2 12l-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>
        </svg>
      </div>
    );
  }
  
  // Reasoning capability
  if (name.includes('reasoning') || name.includes('o1') || name.includes('o3')) {
    badges.push(
      <div key="reasoning" className="w-4 h-4 rounded bg-purple-500/20 flex items-center justify-center">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-purple-400">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      </div>
    );
  }
  
  // Experimental/Beta
  if (name.includes('preview') || name.includes('beta') || name.includes('experimental')) {
    badges.push(
      <div key="experimental" className="w-4 h-4 rounded bg-orange-500/20 flex items-center justify-center">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-orange-400">
          <path d="M9 11H7v6h2v-6zm4 0h-2v6h2v-6zm4 0h-2v6h2v-6zM4 19h16v2H4z"/>
        </svg>
      </div>
    );
  }
  
  return badges;
};

// Prettify model name for display
const prettyName = (id: string, name?: string) => {
  if (name) return name;
  
  const withoutProvider = id.includes('/') ? id.split('/')[1] : id;
  return withoutProvider
    .replace(/[-_]/g, ' ')
    .replace(/\b(gpt|llama|sonnet|flash|mini|max|nano|opus|maverick|gemini|claude)\b/gi, 
      (m) => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase())
    .replace(/\b([a-z])/g, (m) => m.toUpperCase());
};

// Get model subtitle/description
const getModelSubtitle = (model: OpenRouterModel) => {
  const name = model.name.toLowerCase();
  const id = model.id.toLowerCase();
  
  if (name.includes('thinking') || name.includes('reasoning')) return '(Thinking)';
  if (name.includes('preview') || name.includes('beta')) return '(Preview)';
  if (name.includes('experimental')) return '(Experimental)';
  if (id.includes('openrouter')) return '(OpenRouter)';
  if (name.includes('distilled')) return '(Distilled)';
  if (name.includes('fireworks')) return '(Fireworks)';
  
  return '';
};

export function ModelSelector({
  session,
  selectedModelId,
  onSelect,
  className,
}: {
  session: Session;
  selectedModelId: string;
  onSelect?: (id: string) => void;
} & React.ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false);
  const [optimisticModelId, setOptimisticModelId] = useOptimistic(selectedModelId);
  const [search, setSearch] = useState('');

  const { data } = useSWR<{ data: OpenRouterModel[] }>('/api/openrouter/models', fetcher);
  const models: OpenRouterModel[] = data?.data ?? [];

  const filteredModels = useMemo(() => {
    if (!search.trim()) return models;
    return models.filter((m) =>
      `${m.name} ${m.id}`.toLowerCase().includes(search.toLowerCase()),
    );
  }, [models, search]);

  // --- FAVOURITES ---
  const { data: favData, mutate: mutateFav } = useSWR<{ favorites: string[] }>(
    '/api/model-favorites',
    fetcher,
  );

  const favs: string[] = favData?.favorites ?? [];
  const [localFav, setLocalFav] = useState<string[]>([]);
  const allFavIds = new Set([...favs, ...localFav]);

  const favouriteModels = filteredModels.filter((m) => allFavIds.has(m.id));
  const remainingAfterFavs = filteredModels.filter((m) => !allFavIds.has(m.id));

  // group remaining by provider order
  const groupedByProvider: Record<string, OpenRouterModel[]> = {};
  remainingAfterFavs.forEach((model) => {
    const provider = model.id.split('/')[0];
    if (!groupedByProvider[provider]) groupedByProvider[provider] = [];
    groupedByProvider[provider].push(model);
  });

  const providerGroups = Object.entries(groupedByProvider).sort((a, b) => {
    const ia = PROVIDER_ORDER.indexOf(a[0]);
    const ib = PROVIDER_ORDER.indexOf(b[0]);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  const toggleFav = async (id: string) => {
    try {
      await fetch('/api/model-favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId: id }),
        credentials: 'include',
      });
      mutateFav();
    } catch (error) {
      console.error('Failed to toggle favourite', error);
    }
  };

  const renderCard = (model: OpenRouterModel) => {
    const { id, name } = model;
    const isSelected = id === optimisticModelId;
    const isFavorite = allFavIds.has(id);
    const capabilities = getCapabilityBadges(model);
    const subtitle = getModelSubtitle(model);

    return (
      <div
        key={id}
        className={cn(
          'relative group rounded-xl border transition-all duration-200 cursor-pointer',
          'bg-card hover:bg-accent/50 p-4 min-h-[140px] flex flex-col',
          isSelected 
            ? 'border-primary bg-primary/5' 
            : 'border-border hover:border-primary/50'
        )}
        onClick={() => {
          setOpen(false);
          startTransition(() => {
            setOptimisticModelId(id);
            saveChatModelAsCookie(id);
            onSelect?.(id);
          });
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          toggleFav(id);
          setLocalFav((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
          );
        }}
      >
        {/* Header with icon and favorite */}
        <div className="flex items-start justify-between mb-3">
          {getModelIcon(id, name)}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFav(id);
              setLocalFav((prev) =>
                prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
              );
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent rounded"
          >
            <div className={isFavorite ? "text-yellow-500" : "text-muted-foreground"}>
              {isFavorite ? (
                <StarFillIcon size={14} />
              ) : (
                <StarIcon size={14} />
              )}
            </div>
          </button>
        </div>

        {/* Model name */}
        <div className="flex-1">
          <h3 className="font-medium text-sm leading-tight mb-1">
            {prettyName(id, name)}
          </h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground mb-2">{subtitle}</p>
          )}
        </div>

        {/* Capabilities and selection indicator */}
        <div className="flex items-center justify-between mt-auto">
          <div className="flex gap-1">
            {capabilities}
          </div>
          {isSelected && (
            <CheckCircleFillIcon size={16} />
          )}
        </div>
      </div>
    );
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        asChild
        className={cn(
          'w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
          className,
        )}
      >
        <Button variant="outline" className="md:px-2 md:h-[34px] gap-2 flex items-center max-w-[180px]">
          {getModelIcon(optimisticModelId, '')}
          <span className="truncate text-sm font-medium">
            {prettyName(optimisticModelId)}
          </span>
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[800px] max-h-[600px] overflow-y-auto p-0 bg-popover"
      >
        {/* Search header */}
        <div className="sticky top-0 bg-popover border-b p-4 z-10">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <Input
              placeholder="Search models..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
        </div>

        <div className="p-4">
          {/* Favourites section */}
          {favouriteModels.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="text-yellow-500">
                  <StarFillIcon size={16} />
                </div>
                <h2 className="text-sm font-medium">Favorites</h2>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {favouriteModels.map(renderCard)}
              </div>
            </div>
          )}

          {/* Provider sections */}
          {providerGroups.map(([provider, models]) => (
            <div key={provider} className="mb-6">
              <h2 className="text-sm font-medium mb-3 capitalize text-muted-foreground">
                {provider}
              </h2>
              <div className="grid grid-cols-4 gap-3">
                {models.map(renderCard)}
              </div>
            </div>
          ))}

          {filteredModels.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No models found
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}