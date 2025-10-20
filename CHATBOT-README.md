# RAG Chatbot Setup Guide

Your knowledge base now includes an AI-powered chatbot that can answer questions about your policies using Retrieval Augmented Generation (RAG).

## 🎯 Architecture Overview

```
User Question
    ↓
1. Convert to embedding (OpenAI)
    ↓
2. Vector search in Supabase (pgvector)
    ↓
3. Retrieve relevant policy chunks
    ↓
4. Generate answer with context (OpenAI GPT-4)
    ↓
5. Return answer + source citations
```

## 📋 Setup Steps

### 1. Run SQL Setup in Supabase

1. Go to your Supabase dashboard
2. Open the SQL Editor
3. Copy the contents of `CHATBOT-SETUP.sql`
4. Run the SQL script

This will:
- Enable the pgvector extension
- Create the `policy_embeddings` table
- Set up vector similarity search
- Create the `match_policy_embeddings()` function

### 2. Get OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Add it to your `.env.local`:

```bash
OPENAI_API_KEY=sk-...
```

### 3. Update Environment Variables

Add these to your `.env.local`:

```bash
# OpenAI API Key for RAG Chatbot
OPENAI_API_KEY=your-openai-api-key-here

# Site URL (for generating embeddings)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

For production, set `NEXT_PUBLIC_SITE_URL` to your actual domain.

### 4. Generate Embeddings for Existing Policies

The system will automatically generate embeddings when you:
- ✅ Create a new policy in the admin
- ✅ Update an existing policy in the admin

**For existing policies**, run this simple script to generate all embeddings at once:

```bash
# Make sure your dev server is running first!
npm run dev

# In a new terminal, run:
npx tsx scripts/generate-all-embeddings.ts
```

The script will:
- Fetch all approved policies from Supabase
- Generate embeddings for each one
- Show progress with a nice summary

**Example output:**
```
🚀 Starting embedding generation for all policies...

📚 Found 3 policies to process

[1/3] Processing: New Employee Onboarding (onboarding)
  ✅ Created 5 embedding chunks

[2/3] Processing: Test (test)
  ✅ Created 2 embedding chunks

[3/3] Processing: Remote Work Policy (remote-work)
  ✅ Created 8 embedding chunks

📊 Summary:
  ✅ Successful: 3
  ❌ Failed: 0
  📝 Total: 3

🎉 All embeddings generated successfully!
```

**That's it!** Your policies are now searchable by the chatbot.

## 🎨 Features

### Floating Chat Widget

- ✅ **Appears on all pages** (homepage, policy pages, admin)
- ✅ **Blue chat button** in bottom-right corner
- ✅ **Expandable chat window** with 600px height
- ✅ **Source citations** - Links back to relevant policies
- ✅ **Conversation history** - Maintains context during session
- ✅ **Loading states** - Shows typing indicator
- ✅ **Responsive design** - Works on mobile & desktop

### Smart Search

- 🔍 **Vector similarity search** - Finds relevant content even with different wording
- 📊 **Top 5 matches** - Returns most relevant policy chunks
- 🎯 **0.7 similarity threshold** - Filters out irrelevant results
- 📚 **Multi-policy support** - Can cite multiple sources

### Answer Generation

- 🤖 **GPT-4o-mini** - Fast and cost-effective
- 📝 **Context-aware** - Uses retrieved policy content
- 🔗 **Source citations** - Always links to source policies
- ⚡ **Streaming support ready** - Can be upgraded to streaming responses

## 💰 Cost Estimation

Based on OpenAI pricing (as of 2024):

### Embeddings (text-embedding-ada-002)
- **$0.0001 per 1K tokens**
- Average policy (1000 words) ≈ 1,500 tokens ≈ **$0.00015**
- 100 policies ≈ **$0.015 total**

### Chat Responses (gpt-4o-mini)
- **Input**: $0.150 per 1M tokens
- **Output**: $0.600 per 1M tokens
- Average question + context ≈ 2,000 tokens input ≈ **$0.0003**
- Average answer ≈ 300 tokens output ≈ **$0.00018**
- **Per conversation**: ~$0.0005 (half a cent)

**Total for 1000 conversations/month**: ~$0.50

Very affordable! 🎉

## 🔧 API Endpoints

### POST /api/chat
Ask a question and get an AI-generated answer.

**Request:**
```json
{
  "message": "What is our remote work policy?"
}
```

**Response:**
```json
{
  "answer": "According to our remote work policy...",
  "sources": [
    {
      "slug": "remote-work",
      "title": "Remote Work Policy",
      "url": "/p/remote-work"
    }
  ]
}
```

### POST /api/embeddings/generate
Generate embeddings for a specific policy (requires EDIT_TOKEN).

**Request:**
```json
{
  "slug": "remote-work"
}
```

**Response:**
```json
{
  "success": true,
  "chunksCreated": 5
}
```

## 📊 Database Schema

### policy_embeddings Table

```sql
CREATE TABLE policy_embeddings (
  id BIGSERIAL PRIMARY KEY,
  policy_id BIGINT REFERENCES policies(id),
  policy_slug TEXT NOT NULL,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),  -- OpenAI embedding dimension
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## � How It Works

### When a Policy is Saved:

1. Policy is saved to `policies` table
2. Background job triggers `/api/embeddings/generate`
3. Policy content is split into ~1000 character chunks
4. Each chunk is embedded using OpenAI
5. Embeddings stored in `policy_embeddings` table

### When User Asks a Question:

1. User's question is embedded using OpenAI
2. Vector similarity search finds top 5 relevant chunks
3. Chunks are retrieved with policy metadata
4. Context is built from relevant chunks
5. GPT-4 generates answer using context
6. Answer returned with source citations

## 🎛️ Configuration

### Adjust Search Parameters

Edit `/api/chat/route.ts`:

```typescript
const { data: matches } = await supaAdmin.rpc('match_policy_embeddings', {
  query_embedding: questionEmbedding,
  match_threshold: 0.7,    // Lower = more results (less relevant)
  match_count: 5,          // How many chunks to retrieve
});
```

### Adjust Chunk Size

Edit `/api/embeddings/generate/route.ts`:

```typescript
const chunks = chunkText(fullText, 1000);  // Characters per chunk
```

### Change AI Model

Edit `/api/chat/route.ts`:

```typescript
const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini',  // Or 'gpt-4', 'gpt-3.5-turbo', etc.
  // ...
});
```

## 🐛 Troubleshooting

### "No relevant information found"
- Check if embeddings exist: `SELECT * FROM policy_embeddings;`
- Generate embeddings for your policies
- Lower the `match_threshold` to 0.5 or 0.6

### "Search failed" error
- Verify pgvector extension is enabled
- Check if `match_policy_embeddings` function exists
- Review Supabase logs for errors

### Embeddings not generating
- Verify `OPENAI_API_KEY` is set
- Check `NEXT_PUBLIC_SITE_URL` is correct
- Review API route logs for errors

### Chat widget not appearing
- Clear browser cache (Ctrl+Shift+R / Cmd+Shift+R)
- Check browser console for errors
- Verify `ChatWidget` is imported in `layout.tsx`

## 🔐 Security

- ✅ Embeddings API requires `EDIT_TOKEN`
- ✅ Chat API is public (read-only)
- ✅ RLS policies on `policy_embeddings` table
- ✅ Service role key used server-side only
- ✅ No user data stored in conversations

## 📈 Scaling

This architecture scales well:

- ✅ **Vector search is O(log n)** - Fast even with thousands of policies
- ✅ **Supabase pgvector** - Production-ready
- ✅ **Serverless API routes** - Auto-scales with traffic
- ✅ **Background embedding generation** - Doesn't block policy saves

## 🎯 Future Enhancements

Possible improvements:

1. **Streaming responses** - Real-time answer generation
2. **Conversation memory** - Multi-turn conversations
3. **Analytics** - Track most asked questions
4. **Feedback system** - Rate answers (👍/👎)
5. **Follow-up questions** - Suggest related questions
6. **Admin dashboard** - Monitor chatbot usage
7. **Custom prompts** - Tailor personality/tone
8. **Multi-language** - Support other languages

## ✅ Testing the Chatbot

1. Start your dev server: `npm run dev`
2. Go to http://localhost:3000
3. Click the blue chat button in bottom-right
4. Ask a question about your policies
5. Verify you get an answer with source links

**Example questions to try:**
- "What is the onboarding process?"
- "How do I request time off?"
- "What are the remote work guidelines?"
- "Tell me about the company dress code"

---

🎉 **Congratulations!** Your knowledge base now has an intelligent AI assistant that can answer questions about your policies with source citations!
