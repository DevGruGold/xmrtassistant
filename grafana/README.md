# Eliza AI - Grafana & Prometheus Monitoring Setup

This directory contains configuration files for comprehensive monitoring and observability of the Eliza AI ecosystem using Prometheus and Grafana.

## 📊 Overview

The monitoring stack provides:

- **Real-time metrics** from all Eliza components
- **Visual dashboards** for system health and performance
- **Automated alerts** for critical issues
- **Historical data** for trend analysis
- **Multi-dimensional metrics** across agents, tasks, executions, and conversations

## 🚀 Quick Start

### 1. Prometheus Setup

```bash
# Run Prometheus with the provided configuration
prometheus --config.file=grafana/prometheus.yml

# Or using Docker
docker run -d \
  --name eliza-prometheus \
  -p 9090:9090 \
  -v $(pwd)/grafana/prometheus.yml:/etc/prometheus/prometheus.yml \
  -v $(pwd)/grafana/alerts.yml:/etc/prometheus/alerts.yml \
  prom/prometheus
```

Access Prometheus at: http://localhost:9090

### 2. Grafana Setup

```bash
# Run Grafana using Docker
docker run -d \
  --name eliza-grafana \
  -p 3000:3000 \
  grafana/grafana-oss

# Default credentials: admin/admin
```

Access Grafana at: http://localhost:3000

### 3. Configure Grafana

1. **Add Prometheus Data Source:**
   - Navigate to Configuration → Data Sources
   - Click "Add data source"
   - Select "Prometheus"
   - Set URL to `http://localhost:9090` (or your Prometheus instance)
   - Click "Save & Test"

2. **Import Eliza Dashboard:**
   - Navigate to Dashboards → Import
   - Upload `grafana/eliza-dashboard.json`
   - Select your Prometheus data source
   - Click "Import"

## 📈 Available Metrics

### System Health
- `eliza_health_score` - Overall system health (0-100)
- `eliza_system_operational` - System operational status (1=up, 0=down)

### Agents
- `eliza_agents_total` - Total number of agents
- `eliza_agents_by_status{status}` - Agents grouped by status (IDLE, BUSY, WORKING, ERROR)

### Tasks
- `eliza_tasks_total` - Total number of tasks
- `eliza_tasks_by_status{status}` - Tasks by status (PENDING, IN_PROGRESS, BLOCKED, COMPLETED, FAILED)

### Python Executions
- `eliza_python_executions_total` - Total executions in last hour
- `eliza_python_executions_successful` - Successful executions
- `eliza_python_executions_failed` - Failed executions
- `eliza_python_execution_time_avg_ms` - Average execution time (ms)
- `eliza_python_success_rate_percent` - Success rate percentage

### Activities
- `eliza_activities_total` - Total activities in last hour
- `eliza_activities_by_type{type}` - Activities grouped by type

### Conversations
- `eliza_conversations_total` - Total conversations
- `eliza_conversations_active` - Active conversations

### Knowledge Base
- `eliza_knowledge_entities_total` - Total knowledge entities
- `eliza_knowledge_entities_by_type{type}` - Entities by type

## 🚨 Alerts

The system includes pre-configured alerts for:

### Critical Alerts
- System down (no agents responding)
- Health score below 30%
- Python executions stalled
- All agents in error state

### Warning Alerts
- Health score below 50%
- Python execution failure rate > 30%
- Slow execution times (>10s average)
- High number of blocked tasks (>5)
- Agents idle with pending work

### Info Alerts
- No active conversations for 1 hour
- Empty knowledge base
- Unusual conversation activity spikes

## 🔍 Metrics Endpoint

The Prometheus metrics are exposed at:
```
https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/prometheus-metrics
```

You can query this endpoint directly:
```bash
curl -H "Authorization: Bearer YOUR_ANON_KEY" \
  https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/prometheus-metrics
```

## 📊 Dashboard Panels

The Grafana dashboard includes:

1. **System Health Score** - Gauge showing overall health
2. **Python Execution Success Rate** - Time series of success percentage
3. **Total Agents** - Current agent count
4. **Agents by Status** - Pie chart of agent statuses
5. **Tasks by Status** - Pie chart of task statuses
6. **Knowledge Base Size** - Total knowledge entities
7. **Python Executions** - Success/failure bar chart
8. **Execution Performance** - Average execution time trend
9. **Activity by Type** - Stacked bar chart of recent activities

## 🛠️ Customization

### Adding Custom Metrics

Edit `supabase/functions/prometheus-metrics/index.ts` to add new metrics:

```typescript
metrics += formatPrometheusMetric(
  'your_metric_name',
  value,
  { label1: 'value1' },
  'Help text description'
);
```

### Modifying Alerts

Edit `grafana/alerts.yml` to adjust alert thresholds or add new alerts:

```yaml
- alert: YourAlertName
  expr: your_metric_expression > threshold
  for: duration
  labels:
    severity: warning
  annotations:
    summary: "Alert summary"
    description: "Detailed description"
```

## 🔐 Security

- Metrics endpoint uses Supabase authentication
- Bearer token required for all requests
- Configure IP whitelisting in Supabase if needed
- Use HTTPS for all connections

## 📚 Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [PromQL Query Language](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Grafana Dashboard Best Practices](https://grafana.com/docs/grafana/latest/best-practices/)

## 🤝 Support

For issues or questions about the monitoring setup:
1. Check the metrics endpoint is accessible
2. Verify Prometheus is scraping successfully
3. Review Grafana data source configuration
4. Check Supabase edge function logs

## 🎯 Next Steps

Consider enhancing monitoring with:
- Custom recording rules for pre-computed metrics
- Integration with PagerDuty or Slack for alerts
- Long-term metrics storage with Thanos
- Custom visualization panels
- Performance profiling integration
