'use client';

import type { Attachment, UIMessage } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useEffect, useState, useRef } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { ChatHeader } from '@/components/chat-header';
import type { Vote } from '@/lib/db/schema';
import { fetcher, fetchWithErrorHandlers, generateUUID } from '@/lib/utils';
import { Artifact } from './artifact';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import type { VisibilityType } from './visibility-selector';
import { useArtifactSelector } from '@/hooks/use-artifact';
import { unstable_serialize } from 'swr/infinite';
import { getChatHistoryPaginationKey } from './sidebar-history';
import { toast } from './toast';
import type { Session } from 'next-auth';
import { useSearchParams } from 'next/navigation';
import { useChatVisibility } from '@/hooks/use-chat-visibility';
import { useAutoResume } from '@/hooks/use-auto-resume';
import { ChatSDKError } from '@/lib/errors';
import { saveChatModelAsCookie } from '@/app/(chat)/actions';

export function Chat({
  id,
  initialMessages,
  initialChatModel,
  initialVisibilityType,
  isReadonly,
  session,
  autoResume,
}: {
  id: string;
  initialMessages: Array<UIMessage>;
  initialChatModel: string;
  initialVisibilityType: VisibilityType;
  isReadonly: boolean;
  session: Session;
  autoResume: boolean;
}) {
  const { mutate } = useSWRConfig();

  const { visibilityType } = useChatVisibility({
    chatId: id,
    initialVisibilityType,
  });

  const [selectedModel, setSelectedModel] = useState(initialChatModel);
  const requestModelRef = useRef<string>(initialChatModel);

  useEffect(() => {
    const handler = (e: CustomEvent<string>) => {
      requestModelRef.current = e.detail;
      setSelectedModel(e.detail);
    };
    // @ts-ignore
    window.addEventListener('chat-model-changed', handler as any);
    return () => {
      // @ts-ignore
      window.removeEventListener('chat-model-changed', handler as any);
    };
  }, []);

  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    status,
    stop,
    reload,
    experimental_resume,
    data,
  } = useChat({
    id,
    initialMessages,
    experimental_throttle: 100,
    sendExtraMessageFields: true,
    generateId: generateUUID,
    fetch: fetchWithErrorHandlers,
    experimental_prepareRequestBody: (body) => {
      const modelId = requestModelRef.current;

      const uiMsg = body.messages.at(-1);

      if (!uiMsg) return {} as any;

      const textParts = (uiMsg.parts ?? []).filter((p) => p.type === 'text');
      const contentText = textParts.map((p: any) => p.text).join('\n');

      return {
        id,
        message: {
          id: uiMsg.id,
          createdAt: uiMsg.createdAt ?? new Date(),
          role: 'user',
          content: contentText,
          parts: textParts,
          experimental_attachments: uiMsg.experimental_attachments ?? [],
        },
        selectedChatModel: modelId,
        selectedVisibilityType: visibilityType,
      } as any;
    },
    onFinish: () => {
      mutate(unstable_serialize(getChatHistoryPaginationKey));

      // attach model id to last assistant message
      setMessages((prev) => {
        const updated = [...prev];
        const lastAssistantIndex = updated
          .map((m) => m.role)
          .lastIndexOf('assistant');
        if (lastAssistantIndex !== -1) {
          updated[lastAssistantIndex] = {
            ...(updated[lastAssistantIndex] as any),
            modelId: requestModelRef.current,
          } as any;
        }
        return updated;
      });
    },
    onError: (error) => {
      // Always stop the streaming state to prevent UI from stalling
      stop();

      let messageText = 'Something went wrong. Please try again.';
      if (error instanceof ChatSDKError) {
        messageText = String(error.cause ?? error.message);
      } else if (error instanceof Error && error.message) {
        messageText = error.message;
      }

      toast({
        type: 'error',
        description: messageText,
      });

      // Append an assistant message with the error so users can see it in-line
      setMessages((prev) => [
        ...prev,
        {
          id: generateUUID(),
          role: 'assistant',
          parts: [{ type: 'text', text: `❗ ${messageText}` }],
        } as any,
      ]);
    },
  });

  const searchParams = useSearchParams();
  const query = searchParams.get('query');

  const [hasAppendedQuery, setHasAppendedQuery] = useState(false);

  useEffect(() => {
    if (query && !hasAppendedQuery) {
      append({
        role: 'user',
        content: query,
      });

      setHasAppendedQuery(true);
      window.history.replaceState({}, '', `/chat/${id}`);
    }
  }, [query, append, hasAppendedQuery, id]);

  const { data: votes } = useSWR<Array<Vote>>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher,
  );

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  useAutoResume({
    autoResume,
    initialMessages,
    experimental_resume,
    data,
    setMessages,
  });

  return (
    <>
      <div className="flex flex-col min-w-0 h-dvh bg-background">
        <ChatHeader
          chatId={id}
          selectedModelId={selectedModel}
          selectedVisibilityType={initialVisibilityType}
          isReadonly={isReadonly}
          session={session}
        />

        <Messages
          chatId={id}
          status={status}
          votes={votes}
          messages={messages}
          setMessages={setMessages}
          reload={reload}
          isReadonly={isReadonly}
          isArtifactVisible={isArtifactVisible}
        />

        <form className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
          {!isReadonly && (
            <MultimodalInput
              chatId={id}
              input={input}
              setInput={setInput}
              handleSubmit={handleSubmit}
              status={status}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={messages}
              setMessages={setMessages}
              append={append}
              selectedVisibilityType={visibilityType}
              session={session}
            />
          )}
        </form>
      </div>

      <Artifact
        chatId={id}
        input={input}
        setInput={setInput}
        handleSubmit={handleSubmit}
        status={status}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        append={append}
        messages={messages}
        setMessages={setMessages}
        reload={reload}
        votes={votes}
        isReadonly={isReadonly}
        selectedVisibilityType={visibilityType}
        session={session}
      />
    </>
  );
}
