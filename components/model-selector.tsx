'use client';

import { useState, useMemo, useOptimistic, startTransition, useEffect } from 'react';
import useSWR from 'swr';
import { saveChatModelAsCookie } from '@/app/(chat)/actions';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { CheckCircleFillIcon, ChevronDownIcon } from './icons';
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
  'google/gemini-pro',
  'anthropic/claude-3-5-sonnet',
  'openai/gpt-4o-image-beta',
];

export function ModelSelector({
  session,
  selectedModelId,
  className,
}: {
  session: Session;
  selectedModelId: string;
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

  const renderItem = (model: OpenRouterModel) => {
    const { id, name, description } = model;
    return (
      <DropdownMenuItem
        key={id}
        onSelect={() => {
          setOpen(false);
          startTransition(() => {
            setOptimisticModelId(id);
            saveChatModelAsCookie(id);
          });
        }}
        data-active={id === optimisticModelId}
        asChild
      >
        <button
          type="button"
          className="gap-4 group/item flex flex-row justify-between items-center w-full"
        >
          <div className="flex flex-col gap-1 items-start text-left">
            <div>{name || id}</div>
            <div className="text-xs text-muted-foreground max-w-[220px] truncate">
              {description}
            </div>
          </div>

          <div className="text-foreground dark:text-foreground opacity-0 group-data-[active=true]/item:opacity-100">
            <CheckCircleFillIcon />
          </div>
        </button>
      </DropdownMenuItem>
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
      <DropdownMenuContent align="start" className="w-[320px] max-h-[400px] overflow-y-auto p-0">
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
            {favoriteModels.map(renderItem)}
          </div>
        )}
        {otherModels.length > 0 && (
          <div>
            {favoriteModels.length > 0 && (
              <div className="px-2 pt-2 pb-1 text-xs text-muted-foreground">Others</div>
            )}
            {otherModels.map(renderItem)}
          </div>
        )}
        {filteredModels.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground">No models found</div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
