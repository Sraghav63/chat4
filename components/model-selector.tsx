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
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
          <div className="w-2 h-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full"></div>
        </div>
      </div>
    );
  }
  
  // OpenAI models
  if (provider === 'openai' || name.includes('gpt')) {
    return (
      <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/>
        </svg>
      </div>
    );
  }
  
  // Anthropic models
  if (provider === 'anthropic' || name.includes('claude')) {
    return (
      <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white font-bold text-sm">
        AI
      </div>
    );
  }
  
  // Meta/Llama models
  if (provider === 'meta' || name.includes('llama')) {
    return (
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      </div>
    );
  }
  
  // DeepSeek models
  if (provider === 'deepseek' || name.includes('deepseek')) {
    return (
      <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      </div>
    );
  }
  
  // XAI/Grok models
  if (provider === 'xai' || provider === 'x-ai' || name.includes('grok')) {
    return (
      <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white font-bold text-xs">
        𝕏
      </div>
    );
  }
  
  // Default fallback
  return (
    <div className="w-8 h-8 rounded-lg bg-gray-600 flex items-center justify-center text-white text-xs font-medium">
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