import { mutation } from './_generated/server';
import { v } from 'convex/values';

export const syncClerkUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user exists by clerkId
    const existingByClerk = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
      .first();

    if (existingByClerk) {
      return existingByClerk;
    }

    // Check if user exists by email (for migration)
    const existingByEmail = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .first();

    if (existingByEmail) {
      // Update existing user with Clerk ID
      await ctx.db.patch(existingByEmail._id, {
        clerkId: args.clerkId,
      });
      // Return the updated user
      return await ctx.db.get(existingByEmail._id);
    }

    // Create new user
    return await ctx.db.insert('users', {
      clerkId: args.clerkId,
      email: args.email,
      temperatureUnit: 'C',
    });
  },
});

export const saveChat = mutation({
  args: {
    id: v.string(), // Store original UUID as string
    userId: v.id('users'),
    title: v.string(),
    visibility: v.union(v.literal('public'), v.literal('private')),
  },
  handler: async (ctx, args) => {
    // First check if chat with this UUID already exists
    const existing = await ctx.db
      .query('chats')
      .withIndex('by_original_id', (q) => q.eq('originalId', args.id))
      .first();
    
    if (existing) {
      return existing;
    }

    return await ctx.db.insert('chats', {
      originalId: args.id, // Store original UUID
      createdAt: Date.now(),
      userId: args.userId,
      title: args.title,
      visibility: args.visibility,
    });
  },
});

export const deleteChatById = mutation({
  args: { id: v.string() }, // Accept UUID string
  handler: async (ctx, args) => {
    // Find chat by originalId or Convex ID
    let chat = await ctx.db
      .query('chats')
      .withIndex('by_original_id', (q) => q.eq('originalId', args.id))
      .first();
    
    if (!chat) {
      // Try as Convex ID - but only if it looks like a Convex ID
      // Convex IDs are base64url encoded, typically 32+ chars
      if (args.id.length > 20) {
        try {
          const potentialChat = await ctx.db.get(args.id as any);
          // Verify it's actually a chat by checking if it has chat-specific fields
          if (potentialChat && 'title' in potentialChat && 'userId' in potentialChat) {
            chat = potentialChat as any;
          }
        } catch {
          // Not a valid Convex ID
        }
      }
    }
    
    if (!chat) return;
    
    const chatId = chat._id;
    // Delete votes
    const votes = await ctx.db
      .query('votes')
      .withIndex('by_chat_id', (q) => q.eq('chatId', chatId))
      .collect();
    for (const vote of votes) {
      await ctx.db.delete(vote._id);
    }

    // Delete messages
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_chat_id', (q) => q.eq('chatId', chatId))
      .collect();
    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // Delete streams
    const streams = await ctx.db
      .query('streams')
      .withIndex('by_chat_id', (q) => q.eq('chatId', chatId))
      .collect();
    for (const stream of streams) {
      await ctx.db.delete(stream._id);
    }

    // Delete chat
    await ctx.db.delete(chatId);
  },
});

export const saveMessages = mutation({
  args: {
    messages: v.array(
      v.object({
        id: v.string(), // UUID string for compatibility
        chatId: v.id('chats'),
        role: v.string(),
        parts: v.any(),
        attachments: v.any(),
        createdAt: v.number(),
        modelId: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    for (const msg of args.messages) {
      // Check if message with this UUID already exists
      const existing = await ctx.db
        .query('messages')
        .withIndex('by_original_id', (q) => q.eq('originalId', msg.id))
        .first();
      
      if (!existing) {
        await ctx.db.insert('messages', {
          originalId: msg.id, // Store UUID for compatibility
          chatId: msg.chatId,
          role: msg.role,
          parts: msg.parts,
          attachments: msg.attachments,
          createdAt: msg.createdAt,
          modelId: msg.modelId,
        });
      }
    }
  },
});

export const voteMessage = mutation({
  args: {
    chatId: v.string(), // UUID string
    messageId: v.string(), // UUID string
    type: v.union(v.literal('up'), v.literal('down')),
  },
  handler: async (ctx, args) => {
    // Find chat and message by originalId or Convex ID
    let chat = await ctx.db
      .query('chats')
      .withIndex('by_original_id', (q) => q.eq('originalId', args.chatId))
      .first();
    
    if (!chat && args.chatId.length > 20) {
      try {
        const potentialChat = await ctx.db.get(args.chatId as any);
        if (potentialChat && 'title' in potentialChat) {
          chat = potentialChat as any;
        }
      } catch {}
    }
    
    let message = await ctx.db
      .query('messages')
      .withIndex('by_original_id', (q) => q.eq('originalId', args.messageId))
      .first();
    
    if (!message && args.messageId.length > 20) {
      try {
        const potentialMsg = await ctx.db.get(args.messageId as any);
        if (potentialMsg && 'role' in potentialMsg) {
          message = potentialMsg as any;
        }
      } catch {}
    }
    
    if (!chat || !message) return;

    const existingVote = await ctx.db
      .query('votes')
      .withIndex('by_message_id', (q) => q.eq('messageId', message!._id))
      .first();

    if (existingVote) {
      await ctx.db.patch(existingVote._id, {
        isUpvoted: args.type === 'up',
      });
      return;
    }

    await ctx.db.insert('votes', {
      chatId: chat._id,
      messageId: message._id,
      isUpvoted: args.type === 'up',
    });
  },
});

export const saveDocument = mutation({
  args: {
    id: v.string(), // UUID string for compatibility
    title: v.string(),
    kind: v.union(
      v.literal('text'),
      v.literal('code'),
      v.literal('image'),
      v.literal('sheet'),
    ),
    content: v.optional(v.string()),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    // Check if document with this UUID already exists
    const existing = await ctx.db
      .query('documents')
      .withIndex('by_original_id', (q) => q.eq('originalId', args.id))
      .first();
    
    if (existing) {
      return existing;
    }

    return await ctx.db.insert('documents', {
      originalId: args.id, // Store UUID for compatibility
      title: args.title,
      kind: args.kind,
      content: args.content,
      userId: args.userId,
      createdAt: Date.now(),
    });
  },
});

export const deleteDocumentsByIdAfterTimestamp = mutation({
  args: {
    id: v.string(), // UUID string
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    // Find document by originalId or Convex ID
    let document = await ctx.db
      .query('documents')
      .withIndex('by_original_id', (q) => q.eq('originalId', args.id))
      .first();
    
    if (!document && args.id.length > 20) {
      try {
        const potentialDoc = await ctx.db.get(args.id as any);
        if (potentialDoc && 'title' in potentialDoc) {
          document = potentialDoc as any;
        }
      } catch {}
    }
    
    if (!document) return;

    // Delete suggestions
    const suggestions = await ctx.db
      .query('suggestions')
      .withIndex('by_document_id', (q) => q.eq('documentId', document!._id))
      .collect();
    for (const suggestion of suggestions) {
      if (suggestion.documentCreatedAt > args.timestamp) {
        await ctx.db.delete(suggestion._id);
      }
    }

    // Delete documents with matching originalId and timestamp
    const documents = await ctx.db
      .query('documents')
      .withIndex('by_original_id', (q) => q.eq('originalId', args.id))
      .collect();
    for (const doc of documents) {
      if (doc.createdAt > args.timestamp) {
        await ctx.db.delete(doc._id);
      }
    }
  },
});

export const saveSuggestions = mutation({
  args: {
    suggestions: v.array(
      v.object({
        id: v.string(), // UUID string for compatibility
        documentId: v.id('documents'),
        documentCreatedAt: v.number(),
        originalText: v.string(),
        suggestedText: v.string(),
        description: v.optional(v.string()),
        isResolved: v.boolean(),
        userId: v.id('users'),
        createdAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    for (const suggestion of args.suggestions) {
      // Convex auto-generates _id, we just insert the data
      await ctx.db.insert('suggestions', {
        documentId: suggestion.documentId,
        documentCreatedAt: suggestion.documentCreatedAt,
        originalText: suggestion.originalText,
        suggestedText: suggestion.suggestedText,
        description: suggestion.description,
        isResolved: suggestion.isResolved,
        userId: suggestion.userId,
        createdAt: suggestion.createdAt,
      });
    }
  },
});

export const deleteMessagesByChatIdAfterTimestamp = mutation({
  args: {
    chatId: v.string(), // UUID string
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    // Find chat by originalId or Convex ID
    let chat = await ctx.db
      .query('chats')
      .withIndex('by_original_id', (q) => q.eq('originalId', args.chatId))
      .first();
    
    if (!chat && args.chatId.length > 20) {
      try {
        const potentialChat = await ctx.db.get(args.chatId as any);
        if (potentialChat && 'title' in potentialChat) {
          chat = potentialChat as any;
        }
      } catch {}
    }
    
    if (!chat) return;

    const messages = await ctx.db
      .query('messages')
      .withIndex('by_chat_id', (q) => q.eq('chatId', chat!._id))
      .collect();

    const messageIds: string[] = [];
    for (const message of messages) {
      if (message.createdAt >= args.timestamp) {
        messageIds.push(message._id);
        await ctx.db.delete(message._id);
      }
    }

    // Delete votes for deleted messages
    for (const messageId of messageIds) {
      const votes = await ctx.db
        .query('votes')
        .withIndex('by_message_id', (q) => q.eq('messageId', messageId as any))
        .collect();
      for (const vote of votes) {
        await ctx.db.delete(vote._id);
      }
    }
  },
});

export const updateChatVisiblityById = mutation({
  args: {
    chatId: v.string(), // UUID string
    visibility: v.union(v.literal('private'), v.literal('public')),
  },
  handler: async (ctx, args) => {
    // Find chat by originalId or Convex ID
    let chat = await ctx.db
      .query('chats')
      .withIndex('by_original_id', (q) => q.eq('originalId', args.chatId))
      .first();
    
    if (!chat && args.chatId.length > 20) {
      try {
        const potentialChat = await ctx.db.get(args.chatId as any);
        if (potentialChat && 'title' in potentialChat) {
          chat = potentialChat as any;
        }
      } catch {}
    }
    
    if (!chat) return;

    await ctx.db.patch(chat._id, {
      visibility: args.visibility,
    });
  },
});

export const createStreamId = mutation({
  args: {
    streamId: v.string(), // UUID string for compatibility
    chatId: v.id('chats'),
  },
  handler: async (ctx, args) => {
    // Convex auto-generates _id, we just insert the data
    await ctx.db.insert('streams', {
      chatId: args.chatId,
      createdAt: Date.now(),
    });
  },
});

export const toggleFavouriteModel = mutation({
  args: {
    userId: v.id('users'),
    modelId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('favouriteModels')
      .withIndex('by_user_id_model_id', (q) =>
        q.eq('userId', args.userId).eq('modelId', args.modelId),
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { removed: true };
    }

    await ctx.db.insert('favouriteModels', {
      userId: args.userId,
      modelId: args.modelId,
      createdAt: Date.now(),
    });
    return { added: true };
  },
});

export const updateUserTemperatureUnit = mutation({
  args: {
    id: v.id('users'),
    temperatureUnit: v.union(v.literal('C'), v.literal('F')),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      temperatureUnit: args.temperatureUnit,
    });
  },
});

export const updateUserGitHubCopilotToken = mutation({
  args: {
    userId: v.id('users'),
    token: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      githubCopilotToken: args.token ?? undefined, // Convert null to undefined
    });
  },
});
