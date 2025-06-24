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
import { CheckCircleFillIcon, ChevronDownIcon, MetaLogo, XaiLogo } from './icons';
import type { Session } from 'next-auth';

type OpenRouterModel = {
  id: string;
  name: string;
  description?: string;
  architecture?: {
    input_modalities?: string[];
    output_modalities?: string[];
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

const PROVIDER_ORDER = ['google', 'anthropic', 'openai', 'x-ai', 'meta', 'mistral'];

// Map provider id to simple-icons slug when names differ
const providerSlug = (id: string) => {
  const map: Record<string, string> = {
    openai: 'openai',
    anthropic: 'anthropic',
    google: 'google',
    meta: 'meta',
    deepseek: 'deepseek',
    groq: 'groq',
    perplexity: 'perplexity',
    xai: 'x',
    'x-ai': 'x',
  };
  return map[id] ?? id;
};

const getProviderIcon = (provider: string) => {
  provider = provider.toLowerCase();
  if (provider === 'meta') return <MetaLogo size={14} />;
  if (provider === 'xai' || provider === 'x-ai') return <XaiLogo size={14} />;
  if (provider === 'deepseek')
    return (
      <img
        src="https://cdn.jsdelivr.net/gh/lobehub/assets/icons/deepseek-min.svg"
        alt={provider}
        width={14}
        height={14}
        className="rounded opacity-80"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  return (
    <img
      src={`https://cdn.simpleicons.org/${providerSlug(provider)}/ffffff`}
      alt={provider}
      width={14}
      height={14}
      className="rounded opacity-80"
      onError={(e) => {
        e.currentTarget.style.display = 'none';
      }}
    />
  );
};

// Prettify model name for display
const prettyName = (id: string) => {
  const withoutProvider = id.includes('/') ? id.split('/')[1] : id;
  return withoutProvider
    .replace(/[-_]/g, ' ')
    .replace(/\b(gpt|llama|sonnet|flash|mini|max|nano|opus|maverick)\b/gi, (m) => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase())
    .replace(/\b([a-z])/g, (m) => m.toUpperCase());
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
  const [optimisticModelId, setOptimisticModelId] =
    useOptimistic(selectedModelId);
  const [search, setSearch] = useState('');

  const { data } = useSWR<{ data: OpenRouterModel[] }>(
    '/api/openrouter/models',
    fetcher,
  );

  const models: OpenRouterModel[] = data?.data ?? [];

  const filteredModels = useMemo(() => {
    if (!search.trim()) return models;
    return models.filter((m) =>
      `${m.name} ${m.id}`.toLowerCase().includes(search.toLowerCase()),
    );
  }, [models, search]);

  // --- FAVOURITES ---
  const {
    data: favData,
    mutate: mutateFav,
  } = useSWR<{ favorites: string[] }>('/api/model-favorites', fetcher);

  const favs: string[] = favData?.favorites ?? [];

  // local cache to keep UI responsive while network round-trip completes
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

  // Automatically close dropdown on outside navigation
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
    const provider = id.split('/')[0];

    return (
      <button
        key={id}
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
        }}
        className={cn(
          'relative flex flex-col items-start justify-between p-3 rounded-lg border border-muted/20 hover:border-primary focus:border-primary transition data-[active=true]:border-primary',
          {
            'outline outline-1 outline-primary': id === optimisticModelId,
          },
        )}
        data-active={id === optimisticModelId}
      >
        {/* provider icon */}
        <span className="absolute top-1 right-1">{getProviderIcon(provider)}</span>

        <span className="text-xs font-medium leading-tight mb-2 break-words text-left">
          {name || prettyName(id)}
        </span>

        {id === optimisticModelId && (
          <div className="absolute bottom-1 right-1">
            <CheckCircleFillIcon size={14} />
          </div>
        )}
      </button>
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
          {getProviderIcon(optimisticModelId.split('/')[0])}
          <span className="truncate text-sm font-medium">{prettyName(optimisticModelId)}</span>
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[480px] max-h-[500px] overflow-y-auto p-0"
      >
        <div className="p-2 sticky top-0 bg-popover z-10">
          <Input
            placeholder="Search models..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        {favouriteModels.length > 0 && (
          <div>
            <div className="px-2 py-1 text-xs text-muted-foreground">Favourites</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2">
              {favouriteModels.map(renderCard)}
            </div>
          </div>
        )}
        {providerGroups.map(([provider, models]) => (
          <div key={provider}>
            <div className="px-2 py-1 text-xs text-muted-foreground capitalize">{provider}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2">
              {models.map(renderCard)}
            </div>
          </div>
        ))}
        {filteredModels.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground">No models found</div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
