'use client';

import { useState, useMemo, useOptimistic, startTransition, useEffect } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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

// A small curated set of popular models that renders instantly while the full
// OpenRouter list is still loading. Keeping this list in-memory means the
// selector feels snappy even on first visit or cold edge cache.
const DEFAULT_IDS = [
  'meta-llama/llama-4-maverick:free',
  'anthropic/claude-sonnet-4',
  'google/gemini-2.0-flash-001',
  'openai/gpt-5',
  'openai/gpt-4.1-mini',
  'openai/gpt-4.1',
  'openai/o4-mini',
  'openai/o4-mini-high',
  'x-ai/grok-3-mini',
  'google/gemini-2.5-flash',
  'google/gemini-2.5-pro',
  'deepseek/deepseek-chat-v3-0324:free',
  'deepseek/deepseek-r1-0528:free',
];

const PROVIDER_ORDER = ['google', 'anthropic', 'openai', 'x-ai', 'meta', 'mistral', 'deepseek'];

const ICON_CONTAINER_CLASSES = "w-6 h-6 rounded-lg flex items-center justify-center";

const EXPENSIVE_MODEL_IDS = new Set<string>([
  'openai/o1-pro',
  'openai/gpt-4.5-preview',
  'openai/gpt-4o-search-preview',
  'openai/gpt-4',
  'openai/gpt-4-0314',
  'openai/o3-pro',
  'openai/gpt-4o-mini-search-preview',
  'anthropic/claude-opus-4',
  'anthropic/claude-3-opus:beta',
  'anthropic/claude-3-opus',
  'openai/o1',
  'openai/o1-preview',
  'openai/gpt-4-turbo',
  'openai/gpt-4-turbo-preview',
  'openai/gpt-4-1106-preview',
  'anthropic/claude-2.1:beta',
  'anthropic/claude-2.1',
  'anthropic/claude-2:beta',
  'anthropic/claude-2',
  'anthropic/claude-2.0:beta',
  'anthropic/claude-2.0',
  'alpindale/goliath-120b',
  'openai/gpt-4o:extended',
  'perplexity/sonar-reasoning',
  'x-ai/grok-vision-beta',
  'x-ai/grok-beta',
  'openai/chatgpt-4o-latest',
  'openai/gpt-4o-2024-05-13',
  'perplexity/sonar',
  'perplexity/llama-3.1-sonar-large-128k-online',
  'raifle/sorcererlm-8x22b',
  'x-ai/grok-3',
  'x-ai/grok-3-beta',
  'perplexity/sonar-pro',
]);

const getModelIcon = (modelId: string, modelName: string) => {
  const provider = modelId.split('/')[0].toLowerCase();
  const name = modelName.toLowerCase();

  const commonImgProps = {
    width: 24,
    height: 24,
    className: "text-foreground dark:invert",
    style: { filter: 'brightness(0)' } as React.CSSProperties,
  } as const;

  // Google models
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

  // OpenAI models
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

  // Anthropic models - "A" logo
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

  // XAI/Grok models - "x1" logo
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

  // DeepSeek models - whale logo
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

  // Meta/Llama models - infinity symbol
  if (provider === 'meta' || provider.startsWith('meta') || provider.includes('llama') || name.includes('llama')) {
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

  // Perplexity models - infinity circle logo
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

  // Mistral models - castle/tower logo
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

  // Groq models
  if (provider === 'groq' || name.includes('groq')) {
    return (
      <div className={ICON_CONTAINER_CLASSES}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-foreground">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.5 6L12 10.5 8.5 8 12 5.5 15.5 8zM8.5 16L12 13.5 15.5 16 12 18.5 8.5 16z" />
        </svg>
      </div>
    );
  }

  // Default fallback
  return (
    <div className={`${ICON_CONTAINER_CLASSES} bg-muted text-muted-foreground text-xs font-medium`}>
      {provider.charAt(0).toUpperCase()}
    </div>
  );
};

// Get pricing tier based on model pricing
const getPricingTier = (model: OpenRouterModel) => {
  if (!model.pricing) return 'unknown';
  
  const promptPrice = parseFloat(model.pricing.prompt) || 0;
  const completionPrice = parseFloat(model.pricing.completion) || 0;
  const avgPrice = (promptPrice + completionPrice) / 2;
  
  // Price thresholds (per 1M tokens)
  if (avgPrice <= 0.5) return 'cheap';      // Green - very cheap/free
  if (avgPrice <= 2) return 'moderate';     // Yellow - moderate
  return 'expensive';                       // Red - expensive
};

// Format pricing for display
const formatPricing = (model: OpenRouterModel) => {
  if (!model.pricing) return 'Pricing unavailable';
  
  const prompt = model.pricing.prompt;
  const completion = model.pricing.completion;
  
  if (prompt === '0' && completion === '0') return 'Free';
  
  return `$${prompt}/$${completion} per 1M tokens`;
};

// Pricing dot component
const PricingDot = ({ model }: { model: OpenRouterModel }) => {
  const tier = getPricingTier(model);
  const colors = {
    cheap: 'bg-green-500',
    moderate: 'bg-yellow-500', 
    expensive: 'bg-red-500',
    unknown: 'bg-gray-400'
  };
  
  return (
    <div 
      className={`w-2 h-2 rounded-full ${colors[tier]}`}
      title={formatPricing(model)}
    />
  );
};

// Re-export helpers so other components can consume the same visual logic
export { getModelIcon, prettyName, type OpenRouterModel };

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
  const format = (str: string) =>
    str
      .replace(/[-_]/g, ' ')
      // Ensure GPT is always fully capitalised
      .replace(/gpt/gi, 'GPT')
      // Capitalise known keywords (except gpt which we handled above)
      .replace(/\b(llama|sonnet|flash|mini|max|nano|opus|maverick|gemini|claude)\b/gi, (m) =>
        m.charAt(0).toUpperCase() + m.slice(1).toLowerCase(),
      )
      // Title-case remaining words starting with a-z
      .replace(/\b([a-z])/g, (m) => m.toUpperCase());

  if (name) return format(name);

  const withoutProvider = id.includes('/') ? id.split('/')[1] : id;
  return format(withoutProvider);
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
  const [showExpensiveDialog, setShowExpensiveDialog] = useState(false);
  const [pendingModelId, setPendingModelId] = useState<string | null>(null);

  const { data } = useSWR<{ data: OpenRouterModel[] }>('/api/openrouter/models', fetcher);
  // Use models returned from API if available, otherwise fall back to a minimal
  // list built from DEFAULT_IDS so users always see something to pick.
  const models: OpenRouterModel[] = useMemo(() => {
    if (Array.isArray(data?.data) && data.data.length > 0) {
      return data.data as OpenRouterModel[];
    }

    // Build a minimal stand-in list from DEFAULT_IDS so UI never appears empty.
    return DEFAULT_IDS.map((id) => ({ id, name: id.split('/')[1] ?? id })) as OpenRouterModel[];
  }, [data]);

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
  const allFavIds = new Set(favs);

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

  const handleConfirmExpensive = () => {
    if (!pendingModelId) return;
    startTransition(() => {
      setOptimisticModelId(pendingModelId);
      saveChatModelAsCookie(pendingModelId);
      onSelect?.(pendingModelId);
    });
  };

  const toggleFav = async (id: string) => {
    // Optimistic update using SWR mutate
    mutateFav(
      async (current) => {
        const currentList = current?.favorites ?? [];
        const isFav = currentList.includes(id);

        // Send request in background
        fetch('/api/model-favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modelId: id }),
          credentials: 'include',
        }).catch((err) => {
          console.error('Failed to toggle favourite', err);
        });

        // Return updated list optimistically
        return {
          favorites: isFav
            ? currentList.filter((x) => x !== id)
            : [...currentList, id],
        } as { favorites: string[] };
      },
      { optimisticData: undefined, populateCache: true, rollbackOnError: false, revalidate: false },
    );
  };

  const renderCard = (model: OpenRouterModel) => {
    const { id, name } = model;
    const isSelected = id === optimisticModelId;
    const isFavorite = allFavIds.has(id);
    const capabilities = getCapabilityBadges(model);
    const subtitle = getModelSubtitle(model);

    const handleModelSelect = () => {
      if (EXPENSIVE_MODEL_IDS.has(id)) {
        setPendingModelId(id);
        setShowExpensiveDialog(true);
        setOpen(false);
      } else {
        setOpen(false);
        startTransition(() => {
          setOptimisticModelId(id);
          saveChatModelAsCookie(id);
          onSelect?.(id);
        });
      }
    };

    return (
      <TooltipProvider key={id}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'relative group rounded-xl border transition-all duration-200 cursor-pointer',
                'bg-card hover:bg-accent/50 p-4 min-h-[140px] flex flex-col',
                isSelected 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              )}
              onClick={handleModelSelect}
              onContextMenu={(e) => {
                e.preventDefault();
                toggleFav(id);
              }}
            >
        {/* Header with icon and favorite */}
        <div className="flex items-start justify-between mb-3">
          {getModelIcon(id, name)}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFav(id);
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
          <div className="flex gap-1 items-center">
            <PricingDot model={model} />
            {capabilities}
          </div>
          {isSelected && (
            <CheckCircleFillIcon size={16} />
          )}
        </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-2">
              <div className="font-medium">{prettyName(id, name)}</div>
              <div className="text-sm text-muted-foreground">
                {formatPricing(model)}
              </div>
              {model.description && (
                <div className="text-xs text-muted-foreground">
                  {model.description}
                </div>
              )}
              {model.context_length && (
                <div className="text-xs text-muted-foreground">
                  Context: {model.context_length.toLocaleString()} tokens
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <>
      <AlertDialog
        open={showExpensiveDialog}
        onOpenChange={(isOpen) => {
          setShowExpensiveDialog(isOpen);
          if (!isOpen) {
            setPendingModelId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Expensive Model Selected</AlertDialogTitle>
            <AlertDialogDescription>
              This model is considered expensive and may incur higher costs. Would you like to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmExpensive}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className={cn('md:px-2 md:h-[34px] gap-2 flex items-center max-w-[180px]',
              className,
            )}
          >
            {getModelIcon(optimisticModelId, '')}
            <span className="truncate text-sm font-medium">
              {prettyName(optimisticModelId)}
            </span>
            <ChevronDownIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-[95vw] md:w-[800px] max-h-[600px] overflow-y-auto p-0 bg-popover"
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
    </>
  );
}