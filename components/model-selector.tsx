'use client';

import {
  useState,
  useMemo,
  useOptimistic,
  startTransition,
  useEffect,
} from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import { Github, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type CopilotModel = {
  id: string;
  name: string;
  version?: string;
  capabilities?: {
    type?: string;
    family?: string;
  };
  vendor?: string;
  family?: string;
  isDefault?: boolean;
  policy?: {
    state?: string;
  };
};

// Legacy type alias for compatibility
type OpenRouterModel = CopilotModel;

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const PROVIDER_ORDER = ['openai', 'anthropic', 'google', 'azure', 'o1'];

const ICON_CONTAINER_CLASSES =
  'w-6 h-6 rounded-lg flex items-center justify-center';

const getModelIcon = (modelId: string, modelName: string) => {
  const provider = modelId.split('/')[0].toLowerCase();
  const name = modelName.toLowerCase();

  const commonImgProps = {
    width: 24,
    height: 24,
    className: 'brightness-0 dark:invert',
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
  if (
    provider === 'meta' ||
    provider.startsWith('meta') ||
    provider.includes('llama') ||
    name.includes('llama')
  ) {
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
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-black dark:text-white"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.5 6L12 10.5 8.5 8 12 5.5 15.5 8zM8.5 16L12 13.5 15.5 16 12 18.5 8.5 16z" />
        </svg>
      </div>
    );
  }

  // Default fallback
  return (
    <div
      className={`${ICON_CONTAINER_CLASSES} bg-muted text-muted-foreground text-xs font-medium`}
    >
      {provider.charAt(0).toUpperCase()}
    </div>
  );
};

// Re-export helpers so other components can consume the same visual logic
export { getModelIcon, prettyName, type OpenRouterModel };

// Get capability badges for a model based on Copilot model capabilities
const getCapabilityBadges = (model: CopilotModel) => {
  const badges = [];
  const name = model.name.toLowerCase();
  const id = model.id.toLowerCase();
  const capabilities = model.capabilities;

  // Vision capability - check capabilities.type or name hints
  if (
    capabilities?.type === 'chat' ||
    name.includes('vision') ||
    name.includes('4o') ||
    name.includes('flash')
  ) {
    badges.push(
      <div
        key="vision"
        className="w-4 h-4 rounded bg-green-500/20 flex items-center justify-center"
        title="Supports vision"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-green-400"
        >
          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
        </svg>
      </div>,
    );
  }

  // Reasoning capability - o1, o3 models
  if (
    name.includes('o1') ||
    name.includes('o3') ||
    id.includes('o1') ||
    id.includes('o3')
  ) {
    badges.push(
      <div
        key="reasoning"
        className="w-4 h-4 rounded bg-purple-500/20 flex items-center justify-center"
        title="Reasoning model"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-purple-400"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
      </div>,
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
      .replace(
        /\b(llama|sonnet|flash|mini|max|nano|opus|maverick|gemini|claude)\b/gi,
        (m) => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase(),
      )
      // Title-case remaining words starting with a-z
      .replace(/\b([a-z])/g, (m) => m.toUpperCase());

  if (name) return format(name);

  const withoutProvider = id.includes('/') ? id.split('/')[1] : id;
  return format(withoutProvider);
};

// Get model subtitle/description
const getModelSubtitle = (model: CopilotModel) => {
  const name = model.name.toLowerCase();
  const id = model.id.toLowerCase();

  if (name.includes('thinking') || name.includes('reasoning'))
    return '(Thinking)';
  if (name.includes('preview') || name.includes('beta')) return '(Preview)';
  if (name.includes('experimental')) return '(Experimental)';
  if (name.includes('distilled')) return '(Distilled)';
  if (name.includes('fireworks')) return '(Fireworks)';

  return '';
};

export function ModelSelector({
  selectedModelId,
  onModelSelect,
  className,
}: {
  selectedModelId: string;
  onModelSelect?: (id: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [optimisticModelId, setOptimisticModelId] =
    useOptimistic(selectedModelId);
  const [search, setSearch] = useState('');
  const [copilotConnection, setCopilotConnection] = useState<{
    deviceCode: string;
    userCode: string;
    verificationUri: string;
    expiresIn: number;
    interval: number;
  } | null>(null);
  const [isCopilotConnecting, setIsCopilotConnecting] = useState(false);
  const [copilotError, setCopilotError] = useState<string | null>(null);

  const {
    data: copilotStatus,
    error: copilotStatusError,
    mutate: mutateCopilotStatus,
  } = useSWR<{ connected: boolean }>('/api/github-copilot/status', fetcher);
  const isCopilotLoading = !copilotStatus && !copilotStatusError;
  const isCopilotConnected = copilotStatus?.connected ?? false;

  const {
    data: copilotModelsData,
    isLoading: isModelsLoading,
    error: modelsError,
    mutate: mutateModels,
  } = useSWR<{
    models: CopilotModel[];
    error?: string;
  }>(isCopilotConnected ? '/api/github-copilot/models' : null, fetcher);

  // Use Copilot models, show empty state when not connected
  const models: CopilotModel[] = useMemo(() => {
    if (copilotModelsData?.error) {
      console.error('Models API error:', copilotModelsData.error);
      return [];
    }
    if (copilotModelsData?.models && copilotModelsData.models.length > 0) {
      console.log('Loaded models:', copilotModelsData.models.length);
      return copilotModelsData.models;
    }
    if (copilotModelsData && copilotModelsData.models?.length === 0) {
      console.warn('Models array is empty');
    }
    return [];
  }, [copilotModelsData]);

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

  // group remaining by provider/vendor
  const groupedByProvider: Record<string, CopilotModel[]> = {};
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

  useEffect(() => {
    setOptimisticModelId(selectedModelId);
  }, [selectedModelId, setOptimisticModelId]);

  // Refetch models when connection status changes to connected
  useEffect(() => {
    if (isCopilotConnected && mutateModels) {
      // Small delay to ensure token is saved
      const timer = setTimeout(() => {
        mutateModels();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isCopilotConnected, mutateModels]);

  const pollForCopilotToken = async (
    deviceCode: string,
    intervalSeconds: number,
  ) => {
    const maxAttempts = 60;
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch('/api/github-copilot/poll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceCode }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.accessToken) {
            setIsCopilotConnecting(false);
            setCopilotConnection(null);
            setCopilotError(null);
            // Update status optimistically
            mutateCopilotStatus({ connected: true }, false);
            // Wait a bit for the token to be saved to the database, then refetch
            setTimeout(async () => {
              // Force refetch status and models
              await mutateCopilotStatus();
              if (mutateModels) {
                await mutateModels();
              }
            }, 1000);
            toast.success('GitHub Copilot connected successfully!');
            return;
          }
          if (data.error) {
            setIsCopilotConnecting(false);
            setCopilotError(data.error);
            return;
          }
        }

        attempts += 1;
        if (attempts < maxAttempts) {
          setTimeout(poll, intervalSeconds * 1000);
        } else {
          setIsCopilotConnecting(false);
          setCopilotError('Connection timed out. Please try again.');
        }
      } catch (error) {
        attempts += 1;
        if (attempts < maxAttempts) {
          setTimeout(poll, intervalSeconds * 1000);
        } else {
          setIsCopilotConnecting(false);
          setCopilotError('Connection failed. Please try again.');
        }
      }
    };

    poll();
  };

  const handleCopilotConnect = async () => {
    setIsCopilotConnecting(true);
    setCopilotError(null);

    try {
      const response = await fetch('/api/github-copilot/connect', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to initiate connection');
      }

      const data = await response.json();

      if (data.deviceCode && data.verificationUri) {
        setCopilotConnection({
          deviceCode: data.deviceCode,
          userCode: data.userCode,
          verificationUri: data.verificationUri,
          expiresIn: data.expiresIn,
          interval: data.interval ?? 5,
        });

        window.open(data.verificationUri, '_blank');
        pollForCopilotToken(data.deviceCode, data.interval ?? 5);
      } else {
        throw new Error('Invalid device response');
      }
    } catch (error) {
      setIsCopilotConnecting(false);
      setCopilotError('Failed to connect GitHub Copilot.');
    }
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
      {
        optimisticData: undefined,
        populateCache: true,
        rollbackOnError: false,
        revalidate: false,
      },
    );
  };

  const renderCard = (model: CopilotModel) => {
    const { id, name } = model;
    const isSelected = id === optimisticModelId;
    const isFavorite = allFavIds.has(id);
    const capabilities = getCapabilityBadges(model);
    const subtitle = getModelSubtitle(model);

    const handleModelSelect = () => {
      setOpen(false);
      startTransition(() => {
        setOptimisticModelId(id);
        saveChatModelAsCookie(id);
        onModelSelect?.(id);
      });
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
                  : 'border-border hover:border-primary/50',
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
                  <div
                    className={
                      isFavorite ? 'text-yellow-500' : 'text-muted-foreground'
                    }
                  >
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
                  <p className="text-xs text-muted-foreground mb-2">
                    {subtitle}
                  </p>
                )}
              </div>

              {/* Capabilities and selection indicator */}
              <div className="flex items-center justify-between mt-auto">
                <div className="flex gap-1 items-center">{capabilities}</div>
                {isSelected && <CheckCircleFillIcon size={16} />}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-2">
              <div className="font-medium">{prettyName(id, name)}</div>
              <div className="text-sm text-muted-foreground">
                Included with GitHub Copilot
              </div>
              {model.vendor && (
                <div className="text-xs text-muted-foreground">
                  Provider: {model.vendor}
                </div>
              )}
              {model.family && (
                <div className="text-xs text-muted-foreground">
                  Family: {model.family}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'md:px-2 md:h-[34px] gap-2 flex items-center max-w-[180px] relative z-10',
              'bg-background border-border hover:bg-accent',
              className,
            )}
            type="button"
            style={{ pointerEvents: 'auto', opacity: 1 }}
          >
            {isCopilotLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : !isCopilotConnected ? (
              <Github className="h-4 w-4" />
            ) : (
              getModelIcon(optimisticModelId, '')
            )}
            <span className="truncate text-sm font-medium">
              {isCopilotLoading
                ? 'Loading...'
                : !isCopilotConnected
                  ? 'Connect GitHub'
                  : prettyName(optimisticModelId)}
            </span>
            <ChevronDownIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-[95vw] md:w-[800px] max-h-[600px] overflow-y-auto p-0 border-border shadow-xl ring-1 ring-border/10 !bg-neutral-950 opacity-100 z-[100]"
          style={{ backgroundColor: '#0b0b0f', opacity: 1, zIndex: 100 }}
        >
          {isCopilotLoading ? (
            <div className="p-6 flex items-center gap-3 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Checking GitHub Copilot status...</span>
            </div>
          ) : !isCopilotConnected ? (
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                  <Github className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-medium">
                    Connect GitHub Copilot
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Connect your GitHub Copilot subscription to access AI
                    models.
                  </p>
                </div>
              </div>

              {copilotConnection ? (
                <div className="rounded-lg border bg-card p-4 space-y-3">
                  <div className="text-xs text-muted-foreground">
                    Enter this code at GitHub device login:
                  </div>
                  <div className="font-mono text-lg tracking-[0.2em] text-center">
                    {copilotConnection.userCode}
                  </div>
                  <Button variant="outline" className="w-full" asChild>
                    <a
                      href={copilotConnection.verificationUri}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open GitHub device login
                    </a>
                  </Button>
                  <div className="text-xs text-muted-foreground">
                    Waiting for authorization…
                  </div>
                </div>
              ) : (
                <Button
                  onClick={handleCopilotConnect}
                  disabled={isCopilotConnecting}
                  className="w-full"
                >
                  {isCopilotConnecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Github className="mr-2 h-4 w-4" />
                      Connect GitHub Copilot
                    </>
                  )}
                </Button>
              )}

              {copilotError && (
                <div className="text-xs text-destructive">{copilotError}</div>
              )}
            </div>
          ) : (
            <>
              {/* Search and Help header */}
              <div
                className="sticky top-0 border-b p-4 z-10 space-y-3 !bg-neutral-950 opacity-100"
                style={{ backgroundColor: '#0b0b0f' }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    GitHub Copilot Models
                  </h3>
                  <a
                    href="https://github.com/settings/copilot"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-primary hover:underline flex items-center gap-1"
                  >
                    <span>Enable more models in GitHub Settings</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                </div>
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

              <div
                className="p-4 min-h-[300px] !bg-neutral-950 opacity-100"
                style={{ backgroundColor: '#0b0b0f' }}
              >
                {/* Error state */}
                {modelsError && (
                  <div className="text-center py-12 space-y-2">
                    <p className="text-destructive font-medium">
                      Failed to load models
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {modelsError instanceof Error
                        ? modelsError.message
                        : 'Please try refreshing the page or check your connection.'}
                    </p>
                  </div>
                )}

                {/* Loading state for models */}
                {!modelsError && isModelsLoading && models.length === 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[...Array(8)].map((_, i) => (
                      <div
                        key={i}
                        className="h-[140px] rounded-xl border border-border animate-pulse bg-muted/20"
                      />
                    ))}
                  </div>
                )}

                {/* Favourites section */}
                {!modelsError &&
                  !isModelsLoading &&
                  favouriteModels.length > 0 && (
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
                {!modelsError &&
                  !isModelsLoading &&
                  providerGroups.map(([provider, models]) => (
                    <div key={provider} className="mb-6">
                      <h2 className="text-sm font-medium mb-3 capitalize text-muted-foreground">
                        {provider}
                      </h2>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {models.map(renderCard)}
                      </div>
                    </div>
                  ))}

                {!modelsError &&
                  !isModelsLoading &&
                  filteredModels.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground space-y-2">
                      <p className="font-medium">No models found</p>
                      {copilotModelsData?.error ? (
                        <>
                          <p className="text-xs text-destructive">
                            Error: {copilotModelsData.error}
                          </p>
                          {copilotModelsData.error === 'token_expired' && (
                            <div className="space-y-2 mt-4">
                              <p className="text-xs">
                                Your GitHub Copilot token may have expired. Try
                                disconnecting and reconnecting.
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  await mutateModels();
                                }}
                                className="mt-2"
                              >
                                Retry
                              </Button>
                            </div>
                          )}
                          {(copilotModelsData.error?.includes('token_error_404') || 
                            copilotModelsData.error?.includes('token_error_403')) && (
                            <div className="space-y-2 mt-4">
                              <p className="text-xs">
                                Permissions updated. Please disconnect and reconnect your GitHub account to access models.
                              </p>
                            </div>
                          )}
                          {copilotModelsData.error === 'not_connected' && (
                            <p className="text-xs text-primary mt-2">
                              Make sure you're connected to GitHub Copilot.
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-xs">
                          Try searching for something else or enable models in
                          your GitHub Copilot settings.
                        </p>
                      )}
                    </div>
                  )}
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
  );
}
