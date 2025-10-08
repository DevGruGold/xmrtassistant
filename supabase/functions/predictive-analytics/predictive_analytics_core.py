#!/usr/bin/env python3
"""
Predictive Analytics & Anomaly Detection Core
Advanced ML algorithms for forecasting and anomaly detection
"""

import numpy as np
import json
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from collections import deque
from dataclasses import dataclass

@dataclass
class DataPoint:
    """Single data point for time series"""
    timestamp: datetime
    value: float
    metadata: Dict[str, Any] = None

class TimeSeriesAnalyzer:
    """Time series analysis and forecasting"""
    
    def __init__(self, window_size: int = 100):
        self.window_size = window_size
        self.data_buffer = deque(maxlen=window_size)
        
    def add_datapoint(self, datapoint: DataPoint):
        """Add datapoint to buffer"""
        self.data_buffer.append(datapoint)
    
    def calculate_statistics(self) -> Dict[str, float]:
        """Calculate basic statistics"""
        if not self.data_buffer:
            return {}
        
        values = [dp.value for dp in self.data_buffer]
        return {
            'mean': np.mean(values),
            'std': np.std(values),
            'min': np.min(values),
            'max': np.max(values),
            'median': np.median(values),
            'q25': np.percentile(values, 25),
            'q75': np.percentile(values, 75)
        }
    
    def detect_trend(self) -> Dict[str, Any]:
        """Detect trend direction and strength"""
        if len(self.data_buffer) < 10:
            return {'trend': 'insufficient_data'}
        
        values = np.array([dp.value for dp in self.data_buffer])
        x = np.arange(len(values))
        
        # Linear regression
        coeffs = np.polyfit(x, values, 1)
        slope, intercept = coeffs
        
        # Calculate R-squared
        y_pred = slope * x + intercept
        ss_res = np.sum((values - y_pred) ** 2)
        ss_tot = np.sum((values - np.mean(values)) ** 2)
        r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0
        
        direction = 'increasing' if slope > 0 else 'decreasing' if slope < 0 else 'stable'
        strength = abs(slope) / (np.std(values) + 1e-10)  # Normalized slope
        
        return {
            'trend': direction,
            'slope': float(slope),
            'strength': float(strength),
            'r_squared': float(r_squared),
            'confidence': float(r_squared)
        }
    
    def forecast_simple(self, horizon: int = 24) -> List[Dict[str, Any]]:
        """Simple forecasting using moving average and trend"""
        if len(self.data_buffer) < 10:
            return []
        
        stats = self.calculate_statistics()
        trend = self.detect_trend()
        
        # Use exponential moving average for recent trend
        values = np.array([dp.value for dp in self.data_buffer])
        alpha = 0.3  # Smoothing factor
        ema = values[-1]
        
        forecasts = []
        last_timestamp = self.data_buffer[-1].timestamp
        
        for i in range(1, horizon + 1):
            # Forecast with trend adjustment
            forecast_value = ema + (trend['slope'] * i)
            
            # Add uncertainty bounds (simple approach)
            uncertainty = stats['std'] * np.sqrt(i) * 0.5
            
            forecasts.append({
                'timestamp': (last_timestamp + timedelta(hours=i)).isoformat(),
                'forecast': float(forecast_value),
                'lower_bound': float(forecast_value - uncertainty),
                'upper_bound': float(forecast_value + uncertainty),
                'confidence': max(0.3, 0.9 - (i * 0.02))  # Decreasing confidence
            })
        
        return forecasts

class AnomalyDetector:
    """Anomaly detection using statistical methods"""
    
    def __init__(self, sensitivity: float = 3.0):
        self.sensitivity = sensitivity  # Z-score threshold
        self.baseline_calculator = TimeSeriesAnalyzer()
    
    def detect_zscore(self, current_value: float, historical_data: List[float]) -> Dict[str, Any]:
        """Z-score based anomaly detection"""
        if len(historical_data) < 10:
            return {'is_anomaly': False, 'reason': 'insufficient_data'}
        
        mean = np.mean(historical_data)
        std = np.std(historical_data)
        
        if std == 0:
            return {'is_anomaly': False, 'reason': 'zero_variance'}
        
        z_score = (current_value - mean) / std
        is_anomaly = abs(z_score) > self.sensitivity
        
        return {
            'is_anomaly': is_anomaly,
            'z_score': float(z_score),
            'mean': float(mean),
            'std': float(std),
            'current_value': float(current_value),
            'deviation_percent': float(abs((current_value - mean) / mean * 100)) if mean != 0 else 0,
            'severity': self._calculate_severity(abs(z_score))
        }
    
    def detect_iqr(self, current_value: float, historical_data: List[float]) -> Dict[str, Any]:
        """Interquartile range (IQR) based anomaly detection"""
        if len(historical_data) < 10:
            return {'is_anomaly': False, 'reason': 'insufficient_data'}
        
        q1 = np.percentile(historical_data, 25)
        q3 = np.percentile(historical_data, 75)
        iqr = q3 - q1
        
        lower_bound = q1 - (1.5 * iqr)
        upper_bound = q3 + (1.5 * iqr)
        
        is_anomaly = current_value < lower_bound or current_value > upper_bound
        
        return {
            'is_anomaly': is_anomaly,
            'current_value': float(current_value),
            'lower_bound': float(lower_bound),
            'upper_bound': float(upper_bound),
            'q1': float(q1),
            'q3': float(q3),
            'iqr': float(iqr)
        }
    
    def _calculate_severity(self, z_score: float) -> str:
        """Calculate severity based on z-score"""
        if z_score >= 4.0:
            return 'critical'
        elif z_score >= 3.0:
            return 'warning'
        else:
            return 'info'

class PatternRecognizer:
    """Pattern recognition for various data sources"""
    
    def detect_voting_anomaly(self, voting_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Detect unusual voting patterns"""
        if len(voting_data) < 10:
            return {'pattern_detected': False, 'reason': 'insufficient_data'}
        
        # Extract vote counts per user
        user_votes = {}
        for vote in voting_data:
            user = vote.get('user_id', 'unknown')
            user_votes[user] = user_votes.get(user, 0) + 1
        
        vote_counts = list(user_votes.values())
        mean_votes = np.mean(vote_counts)
        std_votes = np.std(vote_counts)
        
        # Check for coordinated voting (multiple users voting at exact same time)
        timestamps = [vote.get('timestamp') for vote in voting_data if vote.get('timestamp')]
        timestamp_counts = {}
        for ts in timestamps:
            timestamp_counts[ts] = timestamp_counts.get(ts, 0) + 1
        
        max_simultaneous = max(timestamp_counts.values()) if timestamp_counts else 0
        
        # Detect anomalies
        patterns = []
        
        # Highly coordinated voting
        if max_simultaneous >= 5:
            patterns.append({
                'type': 'coordinated_voting',
                'severity': 'critical',
                'simultaneous_votes': max_simultaneous,
                'description': f'{max_simultaneous} votes cast at exact same time'
            })
        
        # Unusual vote concentration
        if std_votes > mean_votes * 2:
            patterns.append({
                'type': 'vote_concentration',
                'severity': 'warning',
                'description': 'Highly uneven vote distribution among users'
            })
        
        return {
            'pattern_detected': len(patterns) > 0,
            'patterns': patterns,
            'statistics': {
                'total_votes': len(voting_data),
                'unique_users': len(user_votes),
                'mean_votes_per_user': float(mean_votes),
                'max_simultaneous_votes': max_simultaneous
            }
        }
    
    def detect_workload_bottleneck(self, agent_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Detect agent workload bottlenecks"""
        if not agent_data:
            return {'bottleneck_detected': False}
        
        # Analyze agent workloads
        agent_loads = {}
        for agent in agent_data:
            agent_id = agent.get('id', 'unknown')
            status = agent.get('status', 'IDLE')
            assigned_tasks = agent.get('assigned_tasks', 0)
            agent_loads[agent_id] = {
                'status': status,
                'tasks': assigned_tasks
            }
        
        # Calculate statistics
        task_counts = [a['tasks'] for a in agent_loads.values()]
        if not task_counts:
            return {'bottleneck_detected': False}
        
        mean_load = np.mean(task_counts)
        max_load = np.max(task_counts)
        
        # Detect bottlenecks
        bottlenecks = []
        
        # Overloaded agents
        overloaded = [aid for aid, data in agent_loads.items() if data['tasks'] > mean_load * 2]
        if overloaded:
            bottlenecks.append({
                'type': 'overloaded_agents',
                'severity': 'warning',
                'affected_agents': overloaded,
                'description': f'{len(overloaded)} agents with >2x average load'
            })
        
        # All agents busy
        busy_count = sum(1 for data in agent_loads.values() if data['status'] != 'IDLE')
        if busy_count / len(agent_loads) > 0.8:
            bottlenecks.append({
                'type': 'system_saturation',
                'severity': 'critical',
                'utilization': float(busy_count / len(agent_loads)),
                'description': f'{busy_count}/{len(agent_loads)} agents busy (>80%)'
            })
        
        return {
            'bottleneck_detected': len(bottlenecks) > 0,
            'bottlenecks': bottlenecks,
            'statistics': {
                'total_agents': len(agent_loads),
                'mean_load': float(mean_load),
                'max_load': float(max_load),
                'busy_agents': busy_count
            }
        }

def analyze_data_source(data_source: str, data: List[Dict[str, Any]], action: str) -> Dict[str, Any]:
    """Main entry point for predictive analytics"""
    
    try:
        if action == 'analyze_current':
            return perform_anomaly_detection(data_source, data)
        elif action == 'forecast_24h':
            return generate_forecast(data_source, data, horizon=24)
        elif action == 'forecast_72h':
            return generate_forecast(data_source, data, horizon=72)
        elif action == 'detect_patterns':
            return detect_patterns(data_source, data)
        else:
            return {'error': f'Unknown action: {action}'}
    
    except Exception as e:
        return {'error': str(e)}

def perform_anomaly_detection(data_source: str, data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Perform anomaly detection on current data"""
    
    if not data:
        return {'anomalies': [], 'message': 'No data to analyze'}
    
    detector = AnomalyDetector(sensitivity=3.0)
    anomalies = []
    
    # Extract numerical values for analysis
    if data_source == 'agents':
        # Analyze agent count and status distribution
        active_count = sum(1 for d in data if d.get('status') != 'IDLE')
        historical = [len(data)] * 50  # Simplified baseline
        
        result = detector.detect_zscore(active_count, historical)
        if result.get('is_anomaly'):
            anomalies.append({
                'type': 'agent_activity',
                'severity': result.get('severity', 'info'),
                'description': f'Unusual agent activity: {active_count} active agents',
                'data': result
            })
    
    elif data_source == 'tasks':
        # Analyze task queue length
        pending_count = sum(1 for d in data if d.get('status') == 'PENDING')
        historical = [pending_count] * 50  # Simplified baseline
        
        result = detector.detect_zscore(pending_count, historical)
        if result.get('is_anomaly'):
            anomalies.append({
                'type': 'task_queue',
                'severity': result.get('severity', 'info'),
                'description': f'Unusual task queue size: {pending_count} pending tasks',
                'data': result
            })
    
    return {
        'anomalies': anomalies,
        'analyzed_at': datetime.now().isoformat(),
        'data_source': data_source,
        'data_points': len(data)
    }

def generate_forecast(data_source: str, data: List[Dict[str, Any]], horizon: int) -> Dict[str, Any]:
    """Generate forecast for specified horizon"""
    
    if not data:
        return {'forecasts': [], 'message': 'No data to forecast'}
    
    analyzer = TimeSeriesAnalyzer()
    
    # Convert data to time series
    for item in data:
        timestamp = item.get('created_at') or item.get('timestamp')
        if timestamp:
            # Create a simple metric based on data source
            value = 1.0  # Simplified
            analyzer.add_datapoint(DataPoint(
                timestamp=datetime.fromisoformat(timestamp.replace('Z', '+00:00')),
                value=value
            ))
    
    forecasts = analyzer.forecast_simple(horizon=horizon)
    trend = analyzer.detect_trend()
    
    return {
        'forecasts': forecasts,
        'trend': trend,
        'horizon_hours': horizon,
        'data_source': data_source,
        'generated_at': datetime.now().isoformat()
    }

def detect_patterns(data_source: str, data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Detect patterns in data"""
    
    recognizer = PatternRecognizer()
    
    if data_source == 'dao':
        return recognizer.detect_voting_anomaly(data)
    elif data_source == 'agents':
        return recognizer.detect_workload_bottleneck(data)
    else:
        return {'patterns': [], 'message': f'Pattern detection not implemented for {data_source}'}

# Export main function
if __name__ == '__main__':
    # Test
    test_data = [{'id': i, 'status': 'ACTIVE'} for i in range(10)]
    result = analyze_data_source('agents', test_data, 'analyze_current')
    print(json.dumps(result, indent=2))
