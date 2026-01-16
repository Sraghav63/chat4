import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    password: v.optional(v.string()),
    temperatureUnit: v.optional(v.string()),
    githubCopilotToken: v.optional(v.string()),
  })
    .index('by_clerk_id', ['clerkId'])
    .index('by_email', ['email']),

  chats: defineTable({
    originalId: v.optional(v.string()), // Store original UUID for compatibility
    createdAt: v.number(),
    title: v.string(),
    userId: v.id('users'),
    visibility: v.union(v.literal('public'), v.literal('private')),
  })
    .index('by_user_id', ['userId'])
    .index('by_user_id_created_at', ['userId', 'createdAt'])
    .index('by_original_id', ['originalId']),

  messages: defineTable({
    originalId: v.optional(v.string()), // Store original UUID
    chatId: v.id('chats'),
    role: v.string(),
    parts: v.any(),
    attachments: v.any(),
    createdAt: v.number(),
    modelId: v.optional(v.string()),
  })
    .index('by_chat_id', ['chatId'])
    .index('by_chat_id_created_at', ['chatId', 'createdAt'])
    .index('by_original_id', ['originalId']),

  votes: defineTable({
    chatId: v.id('chats'),
    messageId: v.id('messages'),
    isUpvoted: v.boolean(),
  })
    .index('by_chat_id', ['chatId'])
    .index('by_message_id', ['messageId']),

  documents: defineTable({
    originalId: v.optional(v.string()), // Store original UUID
    createdAt: v.number(),
    title: v.string(),
    content: v.optional(v.string()),
    kind: v.union(
      v.literal('text'),
      v.literal('code'),
      v.literal('image'),
      v.literal('sheet'),
    ),
    userId: v.id('users'),
  })
    .index('by_user_id', ['userId'])
    .index('by_original_id', ['originalId'])
    .index('by_created_at', ['createdAt']),

  suggestions: defineTable({
    documentId: v.id('documents'),
    documentCreatedAt: v.number(),
    originalText: v.string(),
    suggestedText: v.string(),
    description: v.optional(v.string()),
    isResolved: v.boolean(),
    userId: v.id('users'),
    createdAt: v.number(),
  })
    .index('by_document_id', ['documentId']),

  streams: defineTable({
    chatId: v.id('chats'),
    createdAt: v.number(),
  })
    .index('by_chat_id', ['chatId']),

  favouriteModels: defineTable({
    userId: v.id('users'),
    modelId: v.string(),
    createdAt: v.number(),
  })
    .index('by_user_id', ['userId'])
    .index('by_user_id_model_id', ['userId', 'modelId']),
});
