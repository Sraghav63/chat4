import 'server-only';

import { client } from './convex-client';
import type { Id } from '../../convex/_generated/dataModel';
import { api } from '../../convex/_generated/api';
import type { User, Chat, DBMessage, Document, Suggestion } from './schema';
import type { ArtifactKind } from '@/components/artifact';
import { generateUUID } from '../utils';
import type { VisibilityType } from '@/components/visibility-selector';
import { ChatSDKError } from '../errors';

// Helper to convert Convex result to Drizzle-compatible format
function convertUser(convexUser: any): User {
  return {
    id: convexUser._id,
    clerkId: convexUser.clerkId,
    email: convexUser.email,
    password: convexUser.password || null,
    temperatureUnit: convexUser.temperatureUnit || 'C',
    githubCopilotToken: convexUser.githubCopilotToken || null,
  };
}

function convertChat(convexChat: any): Chat {
  return {
    id: convexChat.originalId || convexChat._id, // Use originalId if available, else Convex ID
    createdAt: new Date(convexChat.createdAt),
    title: convexChat.title,
    userId: convexChat.userId, // This is a Convex ID, but we'll convert it when needed
    visibility: convexChat.visibility,
  };
}

function convertMessage(convexMessage: any): DBMessage {
  return {
    id: convexMessage._id,
    chatId: convexMessage.chatId,
    role: convexMessage.role,
    parts: convexMessage.parts,
    attachments: convexMessage.attachments,
    createdAt: new Date(convexMessage.createdAt),
    modelId: convexMessage.modelId || null,
  };
}

export async function getUser(email: string): Promise<Array<User>> {
  try {
    const result = await client.query(api.queries.getUser, { email });
    return result.map(convertUser);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get user by email',
    );
  }
}

export async function syncClerkUser(clerkId: string, email: string): Promise<User> {
  try {
    const result = await client.mutation(api.mutations.syncClerkUser, {
      clerkId,
      email,
    });
    if (!result) {
      throw new Error('syncClerkUser returned null');
    }
    return convertUser(result);
  } catch (error: any) {
    console.error('syncClerkUser error:', error);
    throw new ChatSDKError(
      'bad_request:database',
      `Failed to sync Clerk user: ${error?.message || 'Unknown error'}`,
    );
  }
}

export async function getUserByClerkId(clerkId: string): Promise<User | null> {
  try {
    const result = await client.query(api.queries.getUserByClerkId, { clerkId });
    return result ? convertUser(result) : null;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get user by Clerk ID',
    );
  }
}

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    await client.mutation(api.mutations.saveChat, {
      id: id as Id<'chats'>,
      userId: userId as Id<'users'>,
      title,
      visibility: visibility as 'public' | 'private',
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save chat');
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await client.mutation(api.mutations.deleteChatById, {
      id: id as Id<'chats'>,
    });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete chat by id',
    );
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const result = await client.query(api.queries.getChatsByUserId, {
      id: id as Id<'users'>,
      limit,
      startingAfter: startingAfter ? (startingAfter as Id<'chats'>) : undefined,
      endingBefore: endingBefore ? (endingBefore as Id<'chats'>) : undefined,
    });
    return {
      chats: result.chats.map(convertChat),
      hasMore: result.hasMore,
    };
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get chats by user id',
    );
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const result = await client.query(api.queries.getChatById, {
      id: id as Id<'chats'>,
    });
    return result ? convertChat(result) : undefined;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get chat by id');
  }
}

export async function saveMessages({
  messages,
}: {
  messages: Array<DBMessage>;
}) {
  try {
    await client.mutation(api.mutations.saveMessages, {
      messages: messages.map((msg) => ({
        id: msg.id as Id<'messages'>,
        chatId: msg.chatId as Id<'chats'>,
        role: msg.role,
        parts: msg.parts,
        attachments: msg.attachments,
        createdAt: msg.createdAt.getTime(),
        modelId: msg.modelId || undefined,
      })),
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save messages');
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    const result = await client.query(api.queries.getMessagesByChatId, {
      id: id as Id<'chats'>,
    });
    return result.map(convertMessage);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get messages by chat id',
    );
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  try {
    await client.mutation(api.mutations.voteMessage, {
      chatId: chatId as Id<'chats'>,
      messageId: messageId as Id<'messages'>,
      type,
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to vote message');
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    const result = await client.query(api.queries.getVotesByChatId, {
      id: id as Id<'chats'>,
    });
    return result.map((vote: any) => ({
      chatId: vote.chatId,
      messageId: vote.messageId,
      isUpvoted: vote.isUpvoted,
    }));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get votes by chat id',
    );
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    await client.mutation(api.mutations.saveDocument, {
      id: id as Id<'documents'>,
      title,
      kind: kind as 'text' | 'code' | 'image' | 'sheet',
      content,
      userId: userId as Id<'users'>,
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save document');
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const result = await client.query(api.queries.getDocumentsById, {
      id: id as Id<'documents'>,
    });
    return result.map((doc: any) => ({
      id: doc._id,
      createdAt: new Date(doc.createdAt),
      title: doc.title,
      content: doc.content || null,
      kind: doc.kind,
      userId: doc.userId,
    }));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get documents by id',
    );
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const result = await client.query(api.queries.getDocumentById, {
      id: id as Id<'documents'>,
    });
    if (!result) return undefined;
    return {
      id: result._id,
      createdAt: new Date(result.createdAt),
      title: result.title,
      content: result.content || null,
      kind: result.kind,
      userId: result.userId,
    };
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get document by id',
    );
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await client.mutation(api.mutations.deleteDocumentsByIdAfterTimestamp, {
      id: id as Id<'documents'>,
      timestamp: timestamp.getTime(),
    });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete documents by id after timestamp',
    );
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    await client.mutation(api.mutations.saveSuggestions, {
      suggestions: suggestions.map((sug) => ({
        id: sug.id as Id<'suggestions'>,
        documentId: sug.documentId as Id<'documents'>,
        documentCreatedAt: sug.documentCreatedAt.getTime(),
        originalText: sug.originalText,
        suggestedText: sug.suggestedText,
        description: sug.description || undefined,
        isResolved: sug.isResolved,
        userId: sug.userId as Id<'users'>,
        createdAt: sug.createdAt.getTime(),
      })),
    });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to save suggestions',
    );
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    const result = await client.query(api.queries.getSuggestionsByDocumentId, {
      documentId: documentId as Id<'documents'>,
    });
    return result.map((sug: any): Suggestion => ({
      id: sug._id,
      documentId: sug.documentId,
      documentCreatedAt: new Date(sug.documentCreatedAt),
      originalText: sug.originalText,
      suggestedText: sug.suggestedText,
      description: sug.description || null,
      isResolved: sug.isResolved,
      userId: sug.userId,
      createdAt: new Date(sug.createdAt),
    }));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get suggestions by document id',
    );
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    const result = await client.query(api.queries.getMessageById, {
      id: id as Id<'messages'>,
    });
    return result ? [convertMessage(result)] : [];
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get message by id',
    );
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    await client.mutation(api.mutations.deleteMessagesByChatIdAfterTimestamp, {
      chatId: chatId as Id<'chats'>,
      timestamp: timestamp.getTime(),
    });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete messages by chat id after timestamp',
    );
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    await client.mutation(api.mutations.updateChatVisiblityById, {
      chatId: chatId as Id<'chats'>,
      visibility,
    });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update chat visibility by id',
    );
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: {
  id: string;
  differenceInHours: number;
}) {
  try {
    // This needs to be implemented in Convex queries
    // For now, return 0 as placeholder
    return 0;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get message count by user id',
    );
  }
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  try {
    await client.mutation(api.mutations.createStreamId, {
      streamId: streamId as Id<'streams'>,
      chatId: chatId as Id<'chats'>,
    });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create stream id',
    );
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    return await client.query(api.queries.getStreamIdsByChatId, {
      chatId: chatId as Id<'chats'>,
    });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get stream ids by chat id',
    );
  }
}

export async function getFavouriteModelIdsByUserId({
  userId,
}: {
  userId: string;
}) {
  try {
    return await client.query(api.queries.getFavouriteModelIdsByUserId, {
      userId: userId as Id<'users'>,
    });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to fetch favourite models',
    );
  }
}

export async function toggleFavouriteModel({
  userId,
  modelId,
}: {
  userId: string;
  modelId: string;
}) {
  try {
    return await client.mutation(api.mutations.toggleFavouriteModel, {
      userId: userId as Id<'users'>,
      modelId,
    });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to toggle favourite model',
    );
  }
}

export async function getUserTemperatureUnit({ id }: { id: string }) {
  try {
    return await client.query(api.queries.getUserTemperatureUnit, {
      id: id as Id<'users'>,
    });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get user temperature unit',
    );
  }
}

export async function updateUserTemperatureUnit({
  id,
  temperatureUnit,
}: {
  id: string;
  temperatureUnit: 'C' | 'F';
}) {
  try {
    await client.mutation(api.mutations.updateUserTemperatureUnit, {
      id: id as Id<'users'>,
      temperatureUnit,
    });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update user temperature unit',
    );
  }
}

export async function updateUserGitHubCopilotToken({
  userId,
  token,
}: {
  userId: string;
  token: string | null;
}) {
  try {
    await client.mutation(api.mutations.updateUserGitHubCopilotToken, {
      userId: userId as Id<'users'>,
      token: token || null,
    });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update GitHub Copilot token',
    );
  }
}

export async function getUserGitHubCopilotToken({
  userId,
}: {
  userId: string;
}): Promise<string | null> {
  try {
    return await client.query(api.queries.getUserGitHubCopilotToken, {
      userId: userId as Id<'users'>,
    });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get GitHub Copilot token',
    );
  }
}

export async function searchChatsByQuery({
  userId,
  query,
  limit = 20,
}: {
  userId: string;
  query: string;
  limit?: number;
}) {
  try {
    const result = await client.query(api.queries.searchChatsByQuery, {
      userId: userId as Id<'users'>,
      query,
      limit,
    });
    return result;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to search chats');
  }
}

export async function getUserMessageStats({ userId }: { userId: string }) {
  try {
    return await client.query(api.queries.getUserMessageStats, {
      userId: userId as Id<'users'>,
    });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to fetch message stats',
    );
  }
}
