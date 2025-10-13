# Eliza System Prompt Architecture

## Single Source of Truth

**Location:** `supabase/functions/_shared/elizaSystemPrompt.ts`

This file contains the master system prompt that defines Eliza's personality, capabilities, and operational guidelines. All AI edge functions MUST import and use this shared prompt.

## Shared Utilities

### 1. **System Prompt** (`_shared/elizaSystemPrompt.ts`)
- Exports: `generateElizaSystemPrompt()` - Returns the base system prompt
- Contains: Eliza's identity, philosophy, operational guidelines, and tool usage instructions
- Usage: Import and call this function to get the base prompt

### 2. **Tool Definitions** (`_shared/elizaTools.ts`)
- Exports: `ELIZA_TOOLS` - Array of all available tools/functions
- Contains: All agent management, task orchestration, Python execution, and GitHub integration tools
- Usage: Import and pass to AI model's `tools` parameter

### 3. **Context Builder** (`_shared/contextBuilder.ts`)
- Exports: `buildContextualPrompt()` - Enhances base prompt with dynamic context
- Contains: Logic for injecting conversation history, memory, user context, mining stats, system version
- Usage: Pass base prompt and context options to get enhanced prompt

## Architecture Flow

```
User Input
    ↓
UnifiedChat Component (Frontend)
    ↓
unifiedElizaService (calls edge function)
    ↓
Edge Function (lovable-chat, gemini-chat, etc.)
    ↓
1. Import generateElizaSystemPrompt() from _shared/elizaSystemPrompt.ts
2. Import ELIZA_TOOLS from _shared/elizaTools.ts
3. Import buildContextualPrompt() from _shared/contextBuilder.ts
4. Build enhanced prompt: buildContextualPrompt(generateElizaSystemPrompt(), {...context})
5. Call AI model with enhanced prompt + tools
    ↓
AI Response → User
```

## DO NOT

❌ **Create additional copies of the system prompt**
- There is ONE source: `_shared/elizaSystemPrompt.ts`
- Do not duplicate prompt content in individual edge functions

❌ **Build custom prompts in individual edge functions**
- Use `generateElizaSystemPrompt()` for the base
- Use `buildContextualPrompt()` to add context

❌ **Hardcode tool definitions in edge functions**
- Import `ELIZA_TOOLS` from `_shared/elizaTools.ts`
- Do not duplicate tool definitions

❌ **Modify prompts differently across endpoints**
- All changes to Eliza's personality/instructions must be made in the shared prompt
- This ensures consistency across all AI endpoints

## DO

✅ **Import shared utilities**
```typescript
import { generateElizaSystemPrompt } from '../_shared/elizaSystemPrompt.ts';
import { ELIZA_TOOLS } from '../_shared/elizaTools.ts';
import { buildContextualPrompt } from '../_shared/contextBuilder.ts';
```

✅ **Build enhanced prompts consistently**
```typescript
const basePrompt = generateElizaSystemPrompt();
const enhancedPrompt = buildContextualPrompt(basePrompt, {
  conversationHistory,
  userContext,
  miningStats,
  systemVersion
});
```

✅ **Use shared tools**
```typescript
body: JSON.stringify({
  model: 'google/gemini-2.5-flash',
  messages: [
    { role: 'system', content: enhancedPrompt },
    ...userMessages
  ],
  tools: ELIZA_TOOLS,
  tool_choice: 'auto'
})
```

✅ **Update the single source when adding capabilities**
- Add new tool definitions to `_shared/elizaTools.ts`
- Add new personality traits to `_shared/elizaSystemPrompt.ts`
- Changes automatically propagate to all endpoints

## Files Using Shared Prompt

| Edge Function | Purpose | Uses Shared Prompt | Uses Shared Tools | Uses Context Builder |
|--------------|---------|-------------------|-------------------|---------------------|
| `lovable-chat` | Primary chat endpoint | ✅ | ✅ | ✅ |
| `gemini-chat` | Legacy Gemini endpoint | ✅ | ✅ | ✅ |
| `deepseek-chat` | DeepSeek fallback | ✅ | ✅ | ✅ |
| `openai-chat` | OpenAI fallback | ✅ | ✅ | ✅ |

## Updating Eliza's Capabilities

### Adding a New Tool

1. Edit `supabase/functions/_shared/elizaTools.ts`
2. Add the new tool definition to `ELIZA_TOOLS` array
3. Changes automatically apply to all edge functions

Example:
```typescript
export const ELIZA_TOOLS = [
  // ... existing tools
  {
    type: 'function',
    function: {
      name: 'new_capability',
      description: 'What this new capability does',
      parameters: {
        type: 'object',
        properties: {
          param1: { type: 'string', description: 'Parameter description' }
        },
        required: ['param1']
      }
    }
  }
];
```

### Updating Eliza's Personality

1. Edit `supabase/functions/_shared/elizaSystemPrompt.ts`
2. Modify the `generateElizaSystemPrompt()` function
3. Changes automatically apply to all edge functions

### Adding Context Types

1. Edit `supabase/functions/_shared/contextBuilder.ts`
2. Update the `ContextOptions` interface
3. Update the `buildContextualPrompt()` function logic

## Testing Consistency

After making changes, verify:

1. **Personality is consistent:** Send the same question to different endpoints and verify similar responses
2. **Tools are available:** Test tool calling across different endpoints
3. **Context is injected:** Verify memory, conversation history, and user context appear in responses
4. **No regressions:** Check edge function logs for errors

## Benefits of This Architecture

✅ **Single Source of Truth** - Update once, applies everywhere
✅ **Consistent Personality** - Same Eliza across all endpoints
✅ **Reduced Code Duplication** - ~600 lines eliminated
✅ **Easier Maintenance** - No need to sync multiple prompts
✅ **Better Organization** - Clear separation of concerns
✅ **Prevents Drift** - No more siloed prompt variations
✅ **Easier Testing** - One prompt to test instead of many

## Troubleshooting

### Different responses from different endpoints?
→ Check if all endpoints are using `generateElizaSystemPrompt()` and `buildContextualPrompt()`

### Tool not working in specific endpoint?
→ Verify the endpoint is importing `ELIZA_TOOLS` from `_shared/elizaTools.ts`

### Context not appearing in responses?
→ Check if `buildContextualPrompt()` is being called with the correct options

### Prompt changes not reflected?
→ Restart the edge function or trigger a new deployment

## Deployment Notes

- Edge functions automatically redeploy when code changes
- No manual deployment needed for prompt/tool updates
- Changes are live immediately after code push
