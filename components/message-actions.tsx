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
import { memo, } from 'react';
import { toast } from 'sonner';
import type { UseChatHelpers } from '@ai-sdk/react';
import { getModelIcon, prettyName } from './model-selector';
import { deleteTrailingMessages } from '@/app/(chat)/actions';

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

  if (isLoading) return null;
  if (message.role === 'user') return null;

  const retry = async () => {
    // Optimistically remove the old assistant message from UI
    setMessages((msgs) => msgs.filter((m) => m.id !== message.id));

    // Remove the assistant message (and any subsequent messages) from DB
    try {
      await deleteTrailingMessages({ id: message.id });
    } catch (err) {
      // Non-blocking – we still want to proceed with regenerate
      console.error('Failed to delete trailing messages', err);
    }

    // Give React one tick to flush state before regenerating
    setTimeout(() => reload(), 0);
  };

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

        {/* Simple Retry Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="py-1 px-2 h-fit text-muted-foreground"
              variant="outline"
              onClick={retry}
            >
              <RedoIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Retry</TooltipContent>
        </Tooltip>
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
