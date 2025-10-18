# Background Activity Visibility - Deployment Instructions

## ✅ Changes Deployed

All code changes have been pushed to the repository. The following files have been updated:

1. **supabase/functions/gemini-chat/index.ts**
   - Enhanced with comprehensive activity logging
   - Logs start and end of every tool execution
   - Shows all Eliza activity in real-time

2. **supabase/functions/code-monitor-daemon/index.ts**
   - Enhanced scanning with detailed logging
   - Shows scan progress and results
   - Logs every failed execution found

3. **supabase/functions/autonomous-code-fixer/index.ts**
   - Phase-by-phase logging (analysis, fix generation, execution)
   - Shows learning metadata generation
   - Logs success/failure of each fix attempt

4. **supabase/migrations/20250118_enable_code_monitor_cron.sql**
   - SQL migration to enable 24/7 daemon monitoring
   - Triggers code-monitor-daemon every minute

## 🚀 Required Manual Steps

### Step 1: Deploy Edge Functions

Run these commands in your local repository:

```bash
# Deploy gemini-chat
supabase functions deploy gemini-chat

# Deploy code-monitor-daemon
supabase functions deploy code-monitor-daemon

# Deploy autonomous-code-fixer
supabase functions deploy autonomous-code-fixer
```

### Step 2: Enable 24/7 Daemon Monitoring

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/vawouugtzwmejxqkeqqj
2. Navigate to SQL Editor
3. Run the migration file:
   - Open: `supabase/migrations/20250118_enable_code_monitor_cron.sql`
   - Execute the entire SQL script
4. This will create a cron job that runs code-monitor-daemon every minute

### Step 3: Verify Activity Logging

After deployment, you should see in the Eliza Background Work window:

- 🔧 **Tool Executions** (start + end)
  - `execute_python_code`
  - `get_code_execution_lessons`
  - `invoke_edge_function`
  - `list_available_functions`

- 🔍 **Daemon Scans** (every minute)
  - "🔍 Code monitor daemon scanning..."
  - "🔍 Scan complete: Found X failed executions"

- 🤖 **Auto-Fixer Activity**
  - "🤖 AUTO-FIXER ACTIVATED for execution X"
  - "🔬 Analyzing code failure..."
  - "✅ Generated fixed code"
  - "⚙️ Executing fixed code..."
  - "✅ Fixed code executed successfully"
  - "📚 Learning extracted: [lesson]"
  - "✅ AUTO-FIX SUCCESSFUL"

- 💬 **Chat Activity**
  - "💬 User message received"
  - "🤖 Eliza responded"

- 📡 **MCP Invocations**
  - "📡 MCP called: [function_name]"

## 🔍 Verification Checklist

- [ ] All three edge functions deployed successfully
- [ ] Cron job created and active (check `SELECT * FROM cron.job;`)
- [ ] Background work window shows activity in real-time
- [ ] Code executions appear in background (not in chat)
- [ ] Failed executions trigger auto-fixer automatically
- [ ] Auto-fixer phases are visible in activity log
- [ ] Daemon scans appear every minute

## 📊 What You Should See Now

The background work window on the index page should display ALL of these activity types in real-time:

```
Activity Type         | Description                      | When It Appears
---------------------|----------------------------------|------------------
tool_execution       | 🔧 Tool start/end                | Every tool use
daemon_scan          | 🔍 Monitoring scans              | Every minute
auto_fix_triggered   | 🤖 Fixer activation              | When code fails
auto_fix_analysis    | 🔬 Analyzing failure             | During fix generation
auto_fix_execution   | ⚙️ Running fixed code            | During fix attempt
learning_analysis    | 📚 Learning extraction           | After each fix
chat_message         | 💬 User messages                 | Each user input
chat_response        | 🤖 Eliza responses               | Each Eliza reply
mcp_invocation       | 📡 MCP function calls            | MCP usage
python_execution     | 🐍 Code execution                | Code runs
```

## 🆘 Troubleshooting

If you don't see activity:

1. **Check edge function logs** in Supabase Dashboard
2. **Verify cron job is running**: 
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'code-monitor-daemon-trigger';
   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
   ```
3. **Check activity log directly**:
   ```sql
   SELECT * FROM eliza_activity_log ORDER BY created_at DESC LIMIT 20;
   ```
4. **Verify real-time subscription** is active in PythonShell component

## 📝 Notes

- The code-monitor-daemon now runs every 60 seconds (via cron)
- All activity is logged to `eliza_activity_log` table
- Real-time updates use Supabase Realtime subscriptions
- Code executions appear ONLY in background window (filtered from chat)
- Auto-fixer generates learning metadata for every fix attempt
