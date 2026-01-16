import { query } from './_generated/server';
import { v } from 'convex/values';

export const getUser = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .collect();
  },
});

export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const users = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
      .collect();
    return users[0] || null;
  },
});

export const getChatById = query({
  args: { id: v.string() }, // Accept UUID string
  handler: async (ctx, args) => {
    // Try to find by originalId first (for UUID compatibility)
    const byOriginalId = await ctx.db
      .query('chats')
      .withIndex('by_original_id', (q) => q.eq('originalId', args.id))
      .first();
    if (byOriginalId) return byOriginalId;
    
    // Fallback to Convex ID if it's a Convex ID format
    try {
      return await ctx.db.get(args.id as any);
    } catch {
      return null;
    }
  },
});

export const getChatsByUserId = query({
  args: {
    id: v.string(), // Accept UUID string (user ID from database)
    limit: v.number(),
    startingAfter: v.optional(v.string()),
    endingBefore: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find user by their database ID (which is stored as _id in Convex)
    // The id passed here is the UUID from the old database
    // We need to find the user by their Convex _id (which should match the UUID)
    let userId: any = args.id;
    
    // Try to find user by Convex ID first (if it's already a Convex ID)
    try {
      const userById = await ctx.db.get(args.id as any);
      if (userById) {
        userId = userById._id;
      }
    } catch {
      // Not a Convex ID, try to find by originalId or clerkId
      const userByClerk = await ctx.db
        .query('users')
        .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.id))
        .first();
      if (userByClerk) {
        userId = userByClerk._id;
      }
    }
    
    if (!userId) return { chats: [], hasMore: false };
    
    const extendedLimit = args.limit + 1;
    let chats = await ctx.db
      .query('chats')
      .withIndex('by_user_id_created_at', (q) => q.eq('userId', userId))
      .order('desc')
      .take(extendedLimit);

    if (args.startingAfter) {
      // Find chat by originalId or Convex ID
      let selectedChat = await ctx.db
        .query('chats')
        .withIndex('by_original_id', (q) => q.eq('originalId', args.startingAfter!))
        .first();
      
      if (!selectedChat && args.startingAfter.length > 20) {
        try {
          const potentialChat = await ctx.db.get(args.startingAfter as any);
          if (potentialChat && 'title' in potentialChat && 'userId' in potentialChat) {
            selectedChat = potentialChat as any;
          }
        } catch {
          // Not a valid Convex ID
        }
      }
      
      if (!selectedChat) {
        throw new Error(`Chat with id ${args.startingAfter} not found`);
      }
      chats = await ctx.db
        .query('chats')
        .withIndex('by_user_id_created_at', (q) => q.eq('userId', userId))
        .filter((q) => q.gt(q.field('createdAt'), selectedChat!.createdAt))
        .order('desc')
        .take(extendedLimit);
    } else if (args.endingBefore) {
      // Find chat by originalId or Convex ID
      let selectedChat = await ctx.db
        .query('chats')
        .withIndex('by_original_id', (q) => q.eq('originalId', args.endingBefore!))
        .first();
      
      if (!selectedChat && args.endingBefore.length > 20) {
        try {
          const potentialChat = await ctx.db.get(args.endingBefore as any);
          if (potentialChat && 'title' in potentialChat && 'userId' in potentialChat) {
            selectedChat = potentialChat as any;
          }
        } catch {
          // Not a valid Convex ID
        }
      }
      
      if (!selectedChat) {
        throw new Error(`Chat with id ${args.endingBefore} not found`);
      }
      chats = await ctx.db
        .query('chats')
        .withIndex('by_user_id_created_at', (q) => q.eq('userId', userId))
        .filter((q) => q.lt(q.field('createdAt'), selectedChat!.createdAt))
        .order('desc')
        .take(extendedLimit);
    }

    const hasMore = chats.length > args.limit;
    return {
      chats: hasMore ? chats.slice(0, args.limit) : chats,
      hasMore,
    };
  },
});

export const getMessagesByChatId = query({
  args: { id: v.string() }, // Accept UUID string
  handler: async (ctx, args) => {
    // Find chat by originalId or Convex ID
    let chat = await ctx.db
      .query('chats')
      .withIndex('by_original_id', (q) => q.eq('originalId', args.id))
      .first();
    
    if (!chat && args.id.length > 20) {
      try {
        const potentialChat = await ctx.db.get(args.id as any);
        if (potentialChat && 'title' in potentialChat && 'userId' in potentialChat) {
          chat = potentialChat as any;
        }
      } catch {
        // Not a valid Convex ID
      }
    }
    
    if (!chat) return [];
    
    return await ctx.db
      .query('messages')
      .withIndex('by_chat_id_created_at', (q) => q.eq('chatId', chat!._id))
      .order('asc')
      .collect();
  },
});

export const getVotesByChatId = query({
  args: { id: v.string() }, // Accept UUID string
  handler: async (ctx, args) => {
    // Find chat by originalId or Convex ID
    let chat = await ctx.db
      .query('chats')
      .withIndex('by_original_id', (q) => q.eq('originalId', args.id))
      .first();
    
    if (!chat && args.id.length > 20) {
      try {
        const potentialChat = await ctx.db.get(args.id as any);
        if (potentialChat && 'title' in potentialChat && 'userId' in potentialChat) {
          chat = potentialChat as any;
        }
      } catch {
        // Not a valid Convex ID
      }
    }
    
    if (!chat) return [];
    
    return await ctx.db
      .query('votes')
      .withIndex('by_chat_id', (q) => q.eq('chatId', chat!._id))
      .collect();
  },
});

export const getDocumentsById = query({
  args: { id: v.string() }, // Accept UUID string
  handler: async (ctx, args) => {
    // Find by originalId first
    const byOriginalId = await ctx.db
      .query('documents')
      .withIndex('by_original_id', (q) => q.eq('originalId', args.id))
      .collect();
    
    if (byOriginalId.length > 0) {
      return byOriginalId.sort((a, b) => a.createdAt - b.createdAt);
    }
    
    // Fallback to Convex ID if it looks like one
    if (args.id.length > 20) {
      try {
        const doc = await ctx.db.get(args.id as any);
        if (doc && 'title' in doc && 'kind' in doc) {
          return [doc];
        }
      } catch {
        // Not a valid Convex ID
      }
    }
    
    return [];
  },
});

export const getDocumentById = query({
  args: { id: v.string() }, // Accept UUID string
  handler: async (ctx, args) => {
    // Find by originalId first
    const byOriginalId = await ctx.db
      .query('documents')
      .withIndex('by_original_id', (q) => q.eq('originalId', args.id))
      .collect();
    
    if (byOriginalId.length > 0) {
      // Return the most recent one
      return byOriginalId.sort((a, b) => b.createdAt - a.createdAt)[0] || null;
    }
    
    // Fallback to Convex ID if it looks like one
    if (args.id.length > 20) {
      try {
        const doc = await ctx.db.get(args.id as any);
        if (doc && 'title' in doc && 'kind' in doc) {
          return doc;
        }
      } catch {
        // Not a valid Convex ID
      }
    }
    
    return null;
  },
});

export const getSuggestionsByDocumentId = query({
  args: { documentId: v.string() }, // Accept UUID string
  handler: async (ctx, args) => {
    // Find document by originalId or Convex ID
    let document = await ctx.db
      .query('documents')
      .withIndex('by_original_id', (q) => q.eq('originalId', args.documentId))
      .first();
    
    if (!document && args.documentId.length > 20) {
      try {
        const potentialDoc = await ctx.db.get(args.documentId as any);
        if (potentialDoc && 'title' in potentialDoc && 'kind' in potentialDoc) {
          document = potentialDoc as any;
        }
      } catch {
        // Not a valid Convex ID
      }
    }
    
    if (!document) return [];
    
    return await ctx.db
      .query('suggestions')
      .withIndex('by_document_id', (q) => q.eq('documentId', document!._id))
      .collect();
  },
});

export const getMessageById = query({
  args: { id: v.string() }, // Accept UUID string
  handler: async (ctx, args) => {
    // Find by originalId first
    const byOriginalId = await ctx.db
      .query('messages')
      .withIndex('by_original_id', (q) => q.eq('originalId', args.id))
      .first();
    
    if (byOriginalId) {
      return byOriginalId;
    }
    
    // Fallback to Convex ID if it looks like one
    if (args.id.length > 20) {
      try {
        const msg = await ctx.db.get(args.id as any);
        if (msg && 'role' in msg && 'parts' in msg) {
          return msg;
        }
      } catch {
        // Not a valid Convex ID
      }
    }
    
    return null;
  },
});

export const getStreamIdsByChatId = query({
  args: { chatId: v.string() }, // Accept UUID string
  handler: async (ctx, args) => {
    // Find chat by originalId or Convex ID
    let chat = await ctx.db
      .query('chats')
      .withIndex('by_original_id', (q) => q.eq('originalId', args.chatId))
      .first();
    
    if (!chat && args.chatId.length > 20) {
      try {
        const potentialChat = await ctx.db.get(args.chatId as any);
        if (potentialChat && 'title' in potentialChat && 'userId' in potentialChat) {
          chat = potentialChat as any;
        }
      } catch {
        // Not a valid Convex ID
      }
    }
    
    if (!chat) return [];
    
    const streams = await ctx.db
      .query('streams')
      .withIndex('by_chat_id', (q) => q.eq('chatId', chat!._id))
      .order('asc')
      .collect();
    return streams.map((s) => s._id);
  },
});

export const getFavouriteModelIdsByUserId = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query('favouriteModels')
      .withIndex('by_user_id', (q) => q.eq('userId', args.userId))
      .collect();
    return rows.map((r) => r.modelId);
  },
});

export const getUserTemperatureUnit = query({
  args: { id: v.id('users') },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.id);
    return user?.temperatureUnit || 'C';
  },
});

export const getUserGitHubCopilotToken = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return user?.githubCopilotToken || null;
  },
});

export const searchChatsByQuery = query({
  args: {
    userId: v.id('users'),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    const q = args.query.toLowerCase();
    const allChats = await ctx.db
      .query('chats')
      .withIndex('by_user_id', (q) => q.eq('userId', args.userId))
      .collect();

    const results: Array<{
      chatId: string;
      title: string;
      snippet: string;
    }> = [];

    for (const chat of allChats) {
      if (chat.title.toLowerCase().includes(q)) {
        results.push({
          chatId: chat._id,
          title: chat.title,
          snippet: '',
        });
        if (results.length >= limit) break;
      } else {
        const messages = await ctx.db
          .query('messages')
          .withIndex('by_chat_id', (q) => q.eq('chatId', chat._id))
          .collect();

        for (const message of messages) {
          const parts = Array.isArray(message.parts) ? message.parts : [];
          const textContent = parts
            .map((p: any) => p.text || '')
            .join(' ')
            .toLowerCase();
          if (textContent.includes(q)) {
            const snippet = parts
              .map((p: any) => p.text || '')
              .join(' ')
              .substring(0, 100);
            results.push({
              chatId: chat._id,
              title: chat.title,
              snippet,
            });
            break;
          }
        }
        if (results.length >= limit) break;
      }
    }

    return results.slice(0, limit);
  },
});

export const getUserMessageStats = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const chats = await ctx.db
      .query('chats')
      .withIndex('by_user_id', (q) => q.eq('userId', args.userId))
      .collect();

    const modelCounts: Record<string, number> = {};
    let total = 0;

    for (const chat of chats) {
      const messages = await ctx.db
        .query('messages')
        .withIndex('by_chat_id', (q) => q.eq('chatId', chat._id))
        .collect();

      for (const message of messages) {
        if (message.modelId) {
          modelCounts[message.modelId] = (modelCounts[message.modelId] || 0) + 1;
          total++;
        }
      }
    }

    return {
      total,
      perModel: Object.entries(modelCounts).map(([modelId, count]) => ({
        modelId,
        count,
      })),
    };
  },
});
