# 🔧 Production Runbook

**Quick reference guide for troubleshooting and managing the XMRT Ecosystem in production**

---

## 📞 Emergency Contacts

- **Database Issues**: Supabase Support (support@supabase.com)
- **Frontend Issues**: Vercel Support (support@vercel.com)
- **Security Incidents**: [ESCALATE IMMEDIATELY]
- **On-Call Engineer**: [Define rotation]

---

## 🚨 Common Issues & Solutions

### 1. Frontend is Down / 502 Bad Gateway

**Symptoms:**
- Users cannot access the website
- Vercel returns 502 error
- Health check shows "offline"

**Diagnosis:**
```bash
# Check health endpoint
curl https://v0-git-hub-sync-website.vercel.app/api/health

# Check Vercel deployment status
vercel list --prod

# Check database connection
# (via Supabase dashboard - Database > Logs)
```

**Solutions:**
1. **If Vercel deployment failed:**
   - Check build logs in Vercel dashboard
   - Rollback to previous deployment: `vercel rollback`
   - Redeploy: `vercel --prod`

2. **If database connection issue:**
   - Check Supabase project status
   - Verify connection pooling settings
   - Check if RLS policies are blocking queries

3. **If edge function timeout:**
   - Review edge function logs in Supabase
   - Check for long-running queries
   - Increase function timeout if needed

---

### 2. Authentication Errors / 401 Unauthorized

**Symptoms:**
- Users getting "Unauthorized" errors
- Edge functions returning 401
- JWT validation failing

**Diagnosis:**
```bash
# Check edge function logs
# Supabase Dashboard > Edge Functions > [function-name] > Logs

# Verify JWT secret is set
# Supabase Dashboard > Settings > API > JWT Secret
```

**Solutions:**
1. **If JWT expired:**
   - Normal behavior - user needs to re-authenticate
   - Verify `jwt_expiry` in config.toml (currently 3600s = 1 hour)

2. **If JWT secret mismatch:**
   - Verify `SUPABASE_ANON_KEY` matches in frontend and backend
   - Check environment variables in Vercel
   - Redeploy if secrets were rotated

3. **If RLS policy blocking:**
   - Check user has proper role/permissions
   - Review RLS policies for the affected table
   - Test with service_role key to isolate issue

---

### 3. Database Performance Issues / Slow Queries

**Symptoms:**
- Queries taking >1 second
- Edge functions timing out
- High database CPU usage

**Diagnosis:**
```sql
-- Check for slow queries
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check missing indexes
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Solutions:**
1. **Add missing indexes:**
   ```sql
   -- Example: Index on frequently queried columns
   CREATE INDEX idx_table_column ON public.table_name(column_name);
   ```

2. **Optimize queries:**
   - Use `EXPLAIN ANALYZE` to identify bottlenecks
   - Add appropriate WHERE clauses
   - Limit result sets with pagination

3. **Clean up old data:**
   ```sql
   -- Delete old logs (>30 days)
   DELETE FROM webhook_logs 
   WHERE created_at < now() - interval '30 days';
   
   -- Delete inactive sessions (>90 days)
   DELETE FROM conversation_sessions 
   WHERE is_active = false 
     AND updated_at < now() - interval '90 days';
   ```

4. **Upgrade database plan** if consistently hitting limits

---

### 4. Rate Limiting Blocking Legitimate Users

**Symptoms:**
- Users getting "Too Many Requests" (429) errors
- Legitimate traffic being blocked
- Complaints about access denial

**Diagnosis:**
```sql
-- Check rate limit records
SELECT 
  identifier,
  endpoint,
  request_count,
  window_start
FROM rate_limits
WHERE window_start > now() - interval '1 hour'
ORDER BY request_count DESC;

-- Check if specific IP is rate limited
SELECT * FROM rate_limits
WHERE identifier = '123.456.789.0'
ORDER BY window_start DESC;
```

**Solutions:**
1. **Increase rate limit for specific endpoint:**
   ```typescript
   // In edge function
   const maxRequests = endpoint === '/api/mining-proxy' ? 1000 : 100;
   ```

2. **Whitelist specific IP:**
   ```sql
   -- Delete rate limit records for trusted IP
   DELETE FROM rate_limits 
   WHERE identifier = 'trusted-ip-address';
   ```

3. **Adjust rate limit window:**
   - Currently 1 minute window
   - Can increase to 5 or 10 minutes for less aggressive limiting

---

### 5. Memory Context / Conversation Data Not Saving

**Symptoms:**
- User conversations not persisting
- Memory context empty
- RLS policy errors in logs

**Diagnosis:**
```sql
-- Check if data is being inserted
SELECT COUNT(*), MAX(timestamp)
FROM conversation_messages
WHERE timestamp > now() - interval '1 hour';

-- Check RLS policies on memory_contexts
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'memory_contexts';

-- Test with service role to bypass RLS
-- (via Supabase SQL Editor with service_role key)
```

**Solutions:**
1. **If RLS blocking inserts:**
   - Verify user is authenticated
   - Check `user_id` matches JWT claim
   - Temporarily test with service_role to confirm

2. **If validation errors:**
   - Check UUID format is valid
   - Ensure JSON metadata is valid
   - Review edge function logs for error details

3. **If session not found:**
   - Check session creation logic
   - Verify session_key format
   - Ensure session hasn't expired

---

### 6. Edge Function Deployment Failures

**Symptoms:**
- Edge functions not deploying
- Build errors in Supabase dashboard
- Functions not responding

**Diagnosis:**
```bash
# Check edge function logs
# Supabase Dashboard > Edge Functions > Logs

# Common errors:
# - TypeScript compilation errors
# - Import path issues
# - Missing dependencies
```

**Solutions:**
1. **TypeScript errors:**
   - Check types are correct
   - Verify imports exist
   - Run `deno check` locally if available

2. **Import errors:**
   - Use full URLs for Deno imports
   - Verify versions are compatible
   - Check network access to imported modules

3. **Missing environment variables:**
   - Check secrets are set in Supabase
   - Verify secret names match in code
   - Redeploy after adding secrets

---

## 🔍 Monitoring & Observability

### Health Dashboard

**System Health Summary:**
```sql
-- Run this query to get current system health
SELECT * FROM system_health_summary;
```

**Expected Values:**
- `frontend_uptime_checks` > 0 (checks in last hour)
- `recent_function_errors` < 10 (errors in last hour)
- `messages_last_hour` varies by traffic
- `active_sessions` varies by traffic

### Key Metrics to Monitor

1. **Frontend Uptime**
   - Target: >99.9%
   - Alert if: 3 consecutive failures
   - Check: Every 5 minutes

2. **Database Performance**
   - Target: <100ms average query time
   - Alert if: >500ms for 5 minutes
   - Check: Real-time via Supabase metrics

3. **Edge Function Errors**
   - Target: <1% error rate
   - Alert if: >5% for 10 minutes
   - Check: Via edge function logs

4. **API Response Times**
   - Target: <200ms p95
   - Alert if: >1s p95 for 5 minutes
   - Check: Via Vercel analytics

### Log Locations

- **Frontend Logs**: Vercel Dashboard > Deployment > Functions
- **Edge Function Logs**: Supabase Dashboard > Edge Functions > [function]
- **Database Logs**: Supabase Dashboard > Database > Logs
- **Error Tracking**: [Configure Sentry or similar]

---

## 🛠️ Maintenance Tasks

### Daily
- [ ] Check error count < threshold
- [ ] Verify health checks passing
- [ ] Review critical alerts

### Weekly
- [ ] Review slow query log
- [ ] Check database size growth
- [ ] Update dependencies if needed
- [ ] Review and clear rate limit blocks

### Monthly
- [ ] Clean up old logs (>30 days)
- [ ] Clean up inactive sessions (>90 days)
- [ ] Review and rotate API keys
- [ ] Update production documentation
- [ ] Run full backup
- [ ] Security audit

### Quarterly
- [ ] Load testing
- [ ] Disaster recovery drill
- [ ] Review and update runbook
- [ ] Review monitoring/alerting rules
- [ ] Performance optimization review

---

## 🔐 Security Incident Response

### If Security Breach Suspected

1. **IMMEDIATE ACTIONS** (within 5 minutes)
   - [ ] Enable read-only mode on database
   - [ ] Disable affected user accounts
   - [ ] Capture logs and evidence
   - [ ] Notify security team

2. **INVESTIGATION** (within 30 minutes)
   - [ ] Identify scope of breach
   - [ ] Review access logs
   - [ ] Check for data exfiltration
   - [ ] Determine attack vector

3. **REMEDIATION** (within 2 hours)
   - [ ] Patch vulnerability
   - [ ] Rotate all API keys
   - [ ] Force password resets if needed
   - [ ] Deploy security fixes

4. **COMMUNICATION** (within 4 hours)
   - [ ] Notify affected users
   - [ ] Update status page
   - [ ] Prepare incident report
   - [ ] Coordinate with legal/compliance

5. **POST-MORTEM** (within 1 week)
   - [ ] Document timeline
   - [ ] Identify root cause
   - [ ] Implement preventive measures
   - [ ] Update security policies

---

## 📊 Useful SQL Queries

### System Health
```sql
-- Overall system stats
SELECT 
  (SELECT COUNT(*) FROM conversation_sessions WHERE is_active = true) as active_sessions,
  (SELECT COUNT(*) FROM conversation_messages WHERE timestamp > now() - interval '1 hour') as messages_last_hour,
  (SELECT COUNT(*) FROM eliza_activity_log WHERE created_at > now() - interval '1 hour') as activities_last_hour,
  (SELECT pg_size_pretty(pg_database_size(current_database()))) as database_size;
```

### Top Errors
```sql
-- Most common errors in last 24 hours
SELECT 
  function_name,
  COUNT(*) as error_count,
  error_message
FROM api_call_logs
WHERE status = 'error'
  AND created_at > now() - interval '24 hours'
GROUP BY function_name, error_message
ORDER BY error_count DESC
LIMIT 10;
```

### Active Users
```sql
-- Active sessions by hour
SELECT 
  date_trunc('hour', updated_at) as hour,
  COUNT(*) as active_sessions
FROM conversation_sessions
WHERE is_active = true
  AND updated_at > now() - interval '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

### Database Performance
```sql
-- Table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 🔄 Rollback Procedures

### Database Rollback
```bash
# View migration history
supabase migration list

# Rollback last migration
supabase db reset

# Or rollback to specific migration
supabase db reset --version <migration_timestamp>
```

### Frontend Rollback
```bash
# Via Vercel CLI
vercel rollback

# Or via Vercel Dashboard:
# Deployments > [previous deployment] > Promote to Production
```

### Edge Function Rollback
```bash
# Redeploy previous version from git
git checkout <previous_commit>
supabase functions deploy <function_name>
git checkout main
```

---

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Production Deployment Checklist](./PRODUCTION_CHECKLIST.md)
- [Architecture Diagram](./docs/architecture.md)
- [API Documentation](./docs/api.md)

---

**Last Updated:** 2025-10-12  
**Maintained By:** DevOps Team  
**Review Frequency:** Monthly
