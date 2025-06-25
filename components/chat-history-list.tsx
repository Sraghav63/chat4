"use client";

import useSWRInfinite from 'swr/infinite';
import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { LoaderIcon, PlusIcon } from '@/components/icons';
import { fetcher } from '@/lib/utils';
import type { Chat } from '@/lib/db/schema';
import { getChatHistoryPaginationKey, type ChatHistory } from '@/components/sidebar-history';
import { useSidebar } from '@/components/ui/sidebar';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
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
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Search, MessageCircle, Trash2, Clock } from 'lucide-react';
import useSWR from 'swr';

export function ChatHistoryList() {
  const { setOpenMobile } = useSidebar();
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const router = useRouter();

  const {
    data: paginatedChatHistories,
    setSize,
    isValidating,
    mutate,
  } = useSWRInfinite<ChatHistory>(getChatHistoryPaginationKey, fetcher, {
    fallbackData: [],
  });

  const { data: searchData, isLoading: isSearchLoading } = useSWR(
    searchTerm.trim().length > 0 ? `/api/search?q=${encodeURIComponent(searchTerm.trim())}` : null,
    fetcher,
  );

  const searchResults: Array<{ chatId: string; title: string; snippet: string }> =
    searchData?.results ?? [];

  const isSearching = searchTerm.trim().length > 0;

  // Flatten chats
  const chats = useMemo(() => {
    if (!paginatedChatHistories) return [] as Chat[];
    return paginatedChatHistories.flatMap((page) => page.chats);
  }, [paginatedChatHistories]);

  const filteredChats = useMemo(() => {
    if (!searchTerm) return chats;
    return chats.filter((c) =>
      c.title.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [chats, searchTerm]);

  const hasReachedEnd = paginatedChatHistories
    ? paginatedChatHistories.some((page) => page.hasMore === false)
    : false;

  const handleDelete = async () => {
    const deletePromise = fetch(`/api/chat?id=${deleteId}`, {
      method: 'DELETE',
    });

    toast.promise(deletePromise, {
      loading: 'Deleting chat...',
      success: () => {
        mutate((histories) => {
          if (histories) {
            return histories.map((chatHistory) => ({
              ...chatHistory,
              chats: chatHistory.chats.filter((chat) => chat.id !== deleteId),
            }));
          }
        });
        return 'Chat deleted successfully';
      },
      error: 'Failed to delete chat',
    });

    setShowDeleteDialog(false);
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Your chats</h1>
            <p className="text-lg text-muted-foreground">
              Browse and search through your conversations
            </p>
          </div>
          <Button
            onClick={() => {
              setOpenMobile(false);
              router.push('/');
              router.refresh();
            }}
            size="lg"
            className="gap-2 w-full sm:w-auto"
          >
            <PlusIcon size={16} />
            New chat
          </Button>
        </div>

        {/* Search and Stats */}
        <div className="grid gap-6 md:grid-cols-[1fr,auto] items-start mb-8">
          <div className="space-y-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search your chats..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                <span>{chats.length} chats</span>
              </div>
              {searchTerm && (
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  <span>{filteredChats.length} results</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chat list */}
        {isSearching ? (
          // SEARCH MODE
          <div className="space-y-4">
            {isSearchLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin text-muted-foreground">
                  <LoaderIcon size={24} />
                </div>
              </div>
            ) : searchResults.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-6 mx-auto">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-3">No chats found</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  We couldn't find any conversations containing "{searchTerm}". Try a different search term.
                </p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {searchResults.map((res) => {
                  const htmlSnippet = res.snippet
                    ? res.snippet.replace(new RegExp(`(${searchTerm})`, 'ig'), '<mark>$1</mark>')
                    : '';
                  return (
                    <Card key={res.chatId} className="group hover:shadow-md transition-all duration-200">
                      <Link
                        href={`/chat/${res.chatId}`}
                        onClick={() => setOpenMobile(false)}
                        className="block p-6"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold truncate mb-2 flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-primary" />
                              {res.title}
                            </h3>
                            {htmlSnippet && (
                              <p
                                className="text-sm text-muted-foreground line-clamp-2"
                                dangerouslySetInnerHTML={{ __html: htmlSnippet }}
                              />
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDeleteId(res.chatId);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Link>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          // NORMAL MODE
          <div className="grid gap-4">
            {chats.map((chat) => (
              <Card key={chat.id} className="group hover:shadow-md transition-all duration-200">
                <Link
                  href={`/chat/${chat.id}`}
                  onClick={() => setOpenMobile(false)}
                  className="block p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold truncate mb-2 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        {chat.title}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{formatDistanceToNow(new Date(chat.createdAt))} ago</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeleteId(chat.id);
                        setShowDeleteDialog(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Link>
              </Card>
            ))}

            {!hasReachedEnd && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setSize((size) => size + 1)}
                disabled={isValidating}
              >
                {isValidating ? (
                  <div className="animate-spin mr-2">
                    <LoaderIcon size={16} />
                  </div>
                ) : null}
                Load more
              </Button>
            )}

            {chats.length === 0 && (
              <Card className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-6 mx-auto">
                  <MessageCircle className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-3">No chats yet</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  Start a new conversation to see your chat history here.
                </p>
                <Button
                  onClick={() => {
                    setOpenMobile(false);
                    router.push('/');
                    router.refresh();
                  }}
                  className="gap-2"
                >
                  <PlusIcon size={16} />
                  New chat
                </Button>
              </Card>
            )}
          </div>
        )}

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete chat</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this chat? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
} 