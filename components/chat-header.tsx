'use client';
import { useRouter } from 'next/navigation';
import { useWindowSize } from 'usehooks-ts';

import { SidebarToggle } from '@/components/sidebar-toggle';
import { Button } from '@/components/ui/button';
import { PlusIcon } from './icons';
import { useSidebar } from './ui/sidebar';
import { memo, useEffect, useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { type VisibilityType, VisibilitySelector } from './visibility-selector';
import { GitHubCopilotStatus } from './github-copilot-status';
import { ModelSelector } from './model-selector';

function PureChatHeader({
  chatId,
  selectedVisibilityType,
  isReadonly,
}: {
  chatId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  const router = useRouter();
  const { open } = useSidebar();

  const { width: windowWidth } = useWindowSize();
  const [selectedModelId, setSelectedModelId] = useState('gpt-4o');

  useEffect(() => {
    const match = document.cookie.match(/(?:^|; )chat-model=([^;]+)/);
    if (match?.[1]) {
      let modelId = decodeURIComponent(match[1]);
      // Migration: remove openai/ prefix if present from old cookies
      if (modelId.startsWith('openai/')) {
        modelId = modelId.replace('openai/', '');
      }
      setSelectedModelId(modelId);
    }
  }, []);

  return (
    <header className="flex sticky top-0 bg-background py-1.5 items-center px-2 md:px-2 gap-2">
      <SidebarToggle />

      {(!open || windowWidth < 768) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              className="order-2 md:order-1 md:px-2 px-2 md:h-fit ml-auto md:ml-0"
              onClick={() => {
                router.push('/');
                router.refresh();
              }}
            >
              <PlusIcon />
              <span className="md:sr-only">New Chat</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>New Chat</TooltipContent>
        </Tooltip>
      )}

      {!isReadonly && (
        <VisibilitySelector
          chatId={chatId}
          selectedVisibilityType={selectedVisibilityType}
          className="order-1 md:order-3"
        />
      )}

      {!isReadonly && (
        <ModelSelector
          selectedModelId={selectedModelId}
          onModelSelect={setSelectedModelId}
          className="order-3 md:order-4"
        />
      )}

      {!isReadonly && (
        <GitHubCopilotStatus />
      )}
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader);
