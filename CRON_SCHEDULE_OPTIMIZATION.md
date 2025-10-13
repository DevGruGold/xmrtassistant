# XMRT Ecosystem Cron Schedule Optimization

## Overview
This document outlines the optimized sequential cron schedule for all monitoring, aggregation, and health check functions in the XMRT ecosystem. The schedule is designed to prevent overlapping execution and resource contention while ensuring comprehensive system monitoring.

## Schedule Design Principles

1. **Sequential Execution**: Functions are staggered to avoid simultaneous database queries
2. **Priority-Based Timing**: Critical functions run at optimal intervals
3. **Resource Efficiency**: Device-heavy operations are spaced to prevent DB locks
4. **Logical Grouping**: Related functions are scheduled near each other for data consistency

## Optimized Schedule

### Every 5 Minutes
- **:00, :05, :10, etc.** - `execute-scheduled-actions`
  - Executes pending scheduled reminders and actions
  - Lightweight, quick execution
  - No conflicts with other functions

### Every 15 Minutes
- **:25, :40, :55** - `monitor-device-connections`
  - Checks active device connections
  - Updates heartbeat statuses
  - Fetches pending engagement commands
  - Runs at :25 to avoid collision with hourly tasks

### Every Hour
- **:05** - `aggregate-device-metrics` (hourly)
  - Aggregates device metrics for the past hour
  - Creates hourly summaries in `device_metrics_summary`
  - Runs early in the hour to capture complete data
  
- **:20** - `system-health`
  - Comprehensive health check of all ecosystem components
  - Now includes XMRTCharger device data
  - Formatted ASCII reports logged to console
  - Runs 15 minutes after metrics aggregation to use fresh data

### Every 2 Hours
- **:30 (odd hours: 1, 3, 5, 7, etc.)** - `code-monitor-daemon`
  - Monitors for failed Python executions
  - Triggers autonomous code fixes
  - Checks GitHub token health
  - Uses service role authentication to call protected functions

### Every 6 Hours
- **:15 (0, 6, 12, 18)** - `api-key-health-monitor`
  - Checks health of all API keys (GitHub, OpenAI, DeepSeek, Lovable, ElevenLabs)
  - Updates `api_key_health` table
  - Tracks token expiry and rate limits

### Daily
- **00:10 UTC** - `aggregate-device-metrics` (daily rollup)
  - Creates daily summary for the previous day
  - Aggregates all hourly metrics
  - Runs at 00:10 to ensure all hourly data is captured

- **11:35 UTC** - `ecosystem-monitor`
  - Evaluates GitHub repository activity
  - Monitors XMRTCharger infrastructure health
  - Calculates ecosystem health scores
  - Posts autonomous engagement to GitHub

## Function Responsibilities

### Device Monitoring
| Function | Purpose | Frequency | Data Sources |
|----------|---------|-----------|--------------|
| `aggregate-device-metrics` | Aggregates device connection, charging, and activity data | Hourly + Daily | `device_connection_sessions`, `charging_sessions`, `device_activity_log`, `pop_events_ledger`, `engagement_commands` |
| `monitor-device-connections` | Tracks active connections, heartbeats, and pending commands | Every 15 min | `device_connection_sessions`, `engagement_commands` |

### System Health
| Function | Purpose | Frequency | Data Sources |
|----------|---------|-----------|--------------|
| `system-health` | Comprehensive health check with XMRTCharger metrics | Hourly | All ecosystem tables including devices, agents, tasks, conversations |
| `api-key-health-monitor` | Validates API keys and tracks expiry | Every 6 hours | External API endpoints |
| `ecosystem-monitor` | GitHub activity monitoring + infrastructure health | Daily | GitHub API, `device_metrics_summary`, `devices` |

### Code Quality
| Function | Purpose | Frequency | Data Sources |
|----------|---------|-----------|--------------|
| `code-monitor-daemon` | Monitors failed executions and triggers fixes | Every 2 hours | `eliza_python_executions`, `api_key_health` |

### Automation
| Function | Purpose | Frequency | Data Sources |
|----------|---------|-----------|--------------|
| `execute-scheduled-actions` | Executes scheduled reminders and callbacks | Every 5 min | `scheduled_actions` |

## Key Improvements

### 1. Eliminated Overlaps
- **Before**: `api-key-health-monitor` ran every 10 minutes AND every 2 hours (massive overlap)
- **After**: Runs every 6 hours at :15 (4x per day, sufficient for API key monitoring)

### 2. Fixed Authentication Issues
- **Issue**: `code-monitor-daemon` was getting 401 errors calling `autonomous-code-fixer`
- **Fix**: Added service role authentication header to internal function calls

### 3. Optimized Device Metrics
- **Before**: `aggregate-device-metrics` ran every 5 minutes (excessive DB queries)
- **After**: Hourly at :05 + daily rollup at 00:10

### 4. Reduced Resource Contention
- **Before**: Multiple functions could run simultaneously causing DB locks
- **After**: All functions staggered with 5+ minute gaps

### 5. Enhanced Monitoring
- Added XMRTCharger device data to all health reports
- Implemented ASCII-formatted reports for better readability
- Unified health scoring across all ecosystem components

## Monitoring Dashboard

### Grafana Metrics
All functions expose Prometheus metrics via `prometheus-metrics` function:
- `xmrt_devices_total` - Total registered devices
- `xmrt_devices_active` - Currently active devices
- `xmrt_charging_sessions_total` - Charging sessions (last hour)
- `xmrt_charging_efficiency_avg` - Average charging efficiency
- `xmrt_pop_events_total` - PoP events (last hour)
- `xmrt_pop_events_validated` - Validated PoP events
- `xmrt_pop_points_total` - Total PoP points awarded
- `xmrt_commands_total` - Engagement commands issued
- `xmrt_commands_by_status` - Commands by status (pending/executed/failed)

### Alerts
See `grafana/alerts.yml` for:
- `XMRTNoActiveDevices` - Alert when no devices are active
- `XMRTChargingEfficiencyLow` - Alert when efficiency drops below 70%
- `XMRTPoPValidationLow` - Alert when validation rate drops below 80%
- `XMRTCommandFailureHigh` - Alert when command failure rate exceeds 20%

## Maintenance

### Weekly Tasks
- Review `eliza_activity_log` for any failed cron executions
- Check Grafana alerts for infrastructure issues
- Verify API key health status

### Monthly Tasks
- Analyze `device_metrics_summary` trends
- Optimize cron timings based on usage patterns
- Review and clean up old logs (automated via `auto_system_maintenance` trigger)

## Troubleshooting

### Common Issues

**Cron job not executing:**
1. Check `pg_cron` extension is enabled
2. Verify `edge_runtime.scheduled_functions` syntax in `config.toml`
3. Check Supabase logs for cron job failures

**Authentication errors (401):**
1. Verify function has `verify_jwt = true` in config.toml
2. Ensure service role key is passed in Authorization header for internal calls
3. Check `api_key_health` table for expired tokens

**Performance degradation:**
1. Check if multiple functions are running simultaneously (should not happen with this schedule)
2. Review `device_metrics_summary` aggregation times
3. Consider increasing cron intervals for non-critical functions

## Future Enhancements

1. **Adaptive Scheduling**: Adjust cron frequency based on system load
2. **Smart Batching**: Group related operations to reduce DB queries
3. **Predictive Monitoring**: Use AI to predict failures before they occur
4. **Auto-Scaling**: Automatically adjust resources based on device count
