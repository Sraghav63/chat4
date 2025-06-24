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
import { CheckCircleFillIcon, ChevronDownIcon } from './icons';
import type { Session } from 'next-auth';
import Image from 'next/image';

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
  'google/gemini-pro',
  'anthropic/claude-3-5-sonnet',
  'openai/gpt-4o-image-beta',
];

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
    xai: 'x.ai',
  };
  return map[id] ?? id;
};

const getIconUrl = (provider: string) =>
  `https://cdn.simpleicons.org/${providerSlug(provider)}/ffffff`;

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

  const favoriteModels = filteredModels.filter((m) => FAVORITE_IDS.includes(m.id));
  const otherModels = filteredModels.filter((m) => !FAVORITE_IDS.includes(m.id));

  // Automatically close dropdown on outside navigation
  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  const renderCard = (model: OpenRouterModel) => {
    const { id, name } = model;
    const provider = id.split('/')[0];
    const supportsVision = model.architecture?.input_modalities?.includes('image');
    const badge = supportsVision ? '👁️' : undefined;

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
        className={cn(
          'relative flex flex-col items-start justify-between p-3 rounded-lg border border-muted/20 hover:border-primary focus:border-primary transition data-[active=true]:border-primary',
          {
            'outline outline-1 outline-primary': id === optimisticModelId,
          },
        )}
        data-active={id === optimisticModelId}
      >
        {/* provider icon */}
        <Image
          src={getIconUrl(provider)}
          alt={provider}
          width={14}
          height={14}
          className="absolute top-1 right-1 opacity-70"
        />

        <span className="text-sm font-medium leading-tight mb-2 truncate w-full text-left">
          {name || id.replace(`${provider}/`, '')}
        </span>

        {badge && (
          <span className="text-xs opacity-80">{badge}</span>
        )}

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
        <Button variant="outline" className="md:px-2 md:h-[34px]">
          {optimisticModelId}
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[340px] max-h-[500px] overflow-y-auto p-0">
        <div className="p-2 sticky top-0 bg-popover z-10">
          <Input
            placeholder="Search models..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        {favoriteModels.length > 0 && (
          <div>
            <div className="px-2 py-1 text-xs text-muted-foreground">Favorites</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-2">
              {favoriteModels.map(renderCard)}
            </div>
          </div>
        )}
        {otherModels.length > 0 && (
          <div>
            {favoriteModels.length > 0 && (
              <div className="px-2 pt-2 pb-1 text-xs text-muted-foreground">Others</div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-2">
              {otherModels.map(renderCard)}
            </div>
          </div>
        )}
        {filteredModels.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground">No models found</div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
