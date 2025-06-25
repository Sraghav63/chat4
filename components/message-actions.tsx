import type { Message } from 'ai';
import { useCopyToClipboard } from 'usehooks-ts';

import type { Vote } from '@/lib/db/schema';

import { CopyIcon, RedoIcon, BranchIcon } from './icons';
import { Button } from './ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from './ui/dropdown-menu';
import { memo, useState, startTransition, useMemo } from 'react';
import { toast } from 'sonner';
import { getModelIcon, prettyName } from './model-selector';
import { saveChatModelAsCookie } from '@/app/(chat)/actions';
import type { UseChatHelpers } from '@ai-sdk/react';
import useSWR from 'swr';
import { fetcher } from '@/lib/utils';

const ALLOWED_PROVIDERS = ['google', 'anthropic', 'openai', 'xai', 'x-ai', 'meta'];

export function PureMessageActions({
  chatId,
  message,
  vote,
  isLoading,
  reload,
  setMessages,
  onBranch,
}: {
  chatId: string;
  message: Message;
  vote: Vote | undefined;
  isLoading: boolean;
  reload: UseChatHelpers['reload'];
  setMessages: UseChatHelpers['setMessages'];
  onBranch: (messageId: string) => void;
}) {
  const [_, copyToClipboard] = useCopyToClipboard();

  const [menuOpen, setMenuOpen] = useState(false);

  // Fetch full model list from server
  const { data: allModels } = useSWR<any>(
    menuOpen ? '/api/openrouter/models' : null,
    fetcher,
  );

  // Group models by provider when data is available
  const modelsByProvider = useMemo(() => {
    const groups: Record<string, Array<{ id: string; name: string }>> = {};
    const rawData: any = allModels as any;
    const arr: Array<{ id: string; name: string }> = Array.isArray(rawData)
      ? rawData
      : (rawData?.data ?? []);

    if (arr.length === 0) return groups;

    arr.forEach((model: any) => {
      if (!model || !model.id) return;
      const provider = model.id.split('/')[0];
      if (!ALLOWED_PROVIDERS.includes(provider)) return;
      if (!groups[provider]) groups[provider] = [];
      groups[provider].push(model);
    });
    // Sort each group's models alphabetically by name for consistency
    Object.values(groups).forEach((arr) => arr.sort((a, b) => (a.name ?? a.id).localeCompare(b.name ?? b.id)));
    return groups;
  }, [allModels]);

  const providerOrder = ['google', 'openai', 'anthropic', 'xai', 'meta', 'deepseek', 'mistral', 'perplexity', 'groq'];
  const sortedProviders = Object.keys(modelsByProvider)
    .filter((p) => ALLOWED_PROVIDERS.includes(p))
    .sort((a, b) => {
      const ia = providerOrder.indexOf(a);
      const ib = providerOrder.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });

  if (isLoading) return null;
  if (message.role === 'user') return null;

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-row gap-2 items-center">
        {'modelId' in message && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="px-1.5 py-0.5 rounded-md text-xs bg-muted text-muted-foreground flex items-center gap-1">
                <span className="scale-75 origin-center">{getModelIcon((message as any).modelId, '')}</span>
                {prettyName((message as any).modelId)}
              </span>
            </TooltipTrigger>
            <TooltipContent>Model: {(message as any).modelId}</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="py-1 px-2 h-fit text-muted-foreground"
              variant="outline"
              onClick={async () => {
                const textFromParts = message.parts
                  ?.filter((part) => part.type === 'text')
                  .map((part) => part.text)
                  .join('\n')
                  .trim();

                if (!textFromParts) {
                  toast.error("There's no text to copy!");
                  return;
                }

                await copyToClipboard(textFromParts);
                toast.success('Copied to clipboard!');
              }}
            >
              <CopyIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy</TooltipContent>
        </Tooltip>

        {/* Branch Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="py-1 px-2 h-fit text-muted-foreground"
              variant="outline"
              onClick={() => onBranch(message.id)}
            >
              <BranchIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Branch</TooltipContent>
        </Tooltip>

        {/* Retry Button with dropdown */}
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              className="py-1 px-2 h-fit text-muted-foreground"
              variant="outline"
              onClick={(e) => {
                if (e.detail === 2) {
                  // double click -> quick retry same model
                  (async () => {
                    setMessages((msgs) => msgs.filter((m) => m.id !== message.id));
                    reload();
                  })();
                } else {
                  // single click toggle menu
                  setMenuOpen(!menuOpen);
                }
              }}
            >
              <RedoIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="p-1 min-w-[220px]">
            <DropdownMenuItem
              onClick={() => {
                setMenuOpen(false);
                (async () => {
                  setMessages((msgs) => msgs.filter((m) => m.id !== message.id));
                  reload();
                })();
              }}
              className="flex items-center gap-2"
            >
              <RedoIcon /> Retry same
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {sortedProviders.map((provider) => (
              <DropdownMenuSub key={provider}>
                <DropdownMenuSubTrigger className="flex items-center gap-2 capitalize">
                  {getModelIcon(modelsByProvider[provider][0].id, '')}
                  {provider}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="p-1 min-w-[260px]">
                  {modelsByProvider[provider].map((model) => (
                    <DropdownMenuItem
                      key={model.id}
                      onClick={async () => {
                        setMenuOpen(false);
                        await saveChatModelAsCookie(model.id);
                        window.dispatchEvent(
                          new CustomEvent('chat-model-changed', { detail: model.id }),
                        );
                        setMessages((msgs) => msgs.filter((m) => m.id !== message.id));
                        reload();
                      }}
                      className="flex items-center gap-2"
                    >
                      {prettyName(model.id, model.name)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
}

export const MessageActions = memo(
  PureMessageActions,
  (prevProps, nextProps) => {
    if (prevProps.isLoading !== nextProps.isLoading) return false;

    return true;
  },
);
