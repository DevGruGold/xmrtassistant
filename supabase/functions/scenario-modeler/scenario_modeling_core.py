#!/usr/bin/env python3
"""
Scenario Modeling Core for What-If Analysis
Monte Carlo, Agent-based, and Game Theory simulations
"""

import numpy as np
import json
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass

@dataclass
class SimulationResult:
    """Result from a simulation run"""
    scenario_type: str
    scenario_name: str
    confidence_level: float
    simulation_results: Dict[str, Any]
    recommendations: List[str]
    risk_assessment: Dict[str, Any]
    execution_time_ms: int

class EconomicSimulator:
    """Economic modeling and simulations"""
    
    def simulate_token_listing(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Monte Carlo simulation for exchange listing impact"""
        current_market_cap = params.get('current_market_cap', 1000000)
        current_volume = params.get('current_daily_volume', 50000)
        volume_increase_pct = params.get('expected_volume_increase', 500)
        time_horizon_days = params.get('time_horizon_days', 90)
        num_simulations = 1000
        
        # Simulate price movements
        price_scenarios = []
        
        for _ in range(num_simulations):
            # Random walk with drift
            drift = np.random.normal(0.02, 0.05)  # Expected price increase
            volatility = np.random.uniform(0.3, 0.6)  # Price volatility
            
            daily_returns = np.random.normal(drift, volatility, time_horizon_days)
            cumulative_return = np.prod(1 + daily_returns)
            
            price_scenarios.append({
                '30d': cumulative_return ** (30/time_horizon_days),
                '60d': cumulative_return ** (60/time_horizon_days),
                '90d': cumulative_return
            })
        
        # Calculate percentiles
        price_30d = [s['30d'] for s in price_scenarios]
        price_60d = [s['60d'] for s in price_scenarios]
        price_90d = [s['90d'] for s in price_scenarios]
        
        return {
            'price_forecast': {
                'pessimistic': {
                    '30d': float(np.percentile(price_30d, 10)),
                    '60d': float(np.percentile(price_60d, 10)),
                    '90d': float(np.percentile(price_90d, 10))
                },
                'baseline': {
                    '30d': float(np.percentile(price_30d, 50)),
                    '60d': float(np.percentile(price_60d, 50)),
                    '90d': float(np.percentile(price_90d, 50))
                },
                'optimistic': {
                    '30d': float(np.percentile(price_30d, 90)),
                    '60d': float(np.percentile(price_60d, 90)),
                    '90d': float(np.percentile(price_90d, 90))
                }
            },
            'volume_impact': {
                'expected_daily_volume': current_volume * (volume_increase_pct / 100),
                'liquidity_improvement': 'significant' if volume_increase_pct > 300 else 'moderate'
            },
            'risk_factors': ['wash_trading', 'pump_and_dump', 'regulatory_scrutiny']
        }
    
    def simulate_staking_dynamics(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Agent-based model for staking behavior"""
        total_supply = params.get('total_supply', 1000000)
        current_staked = params.get('current_staked', 200000)
        target_staked = params.get('target_staked', 500000)
        base_apr = params.get('base_apr', 12.5)
        
        # Calculate equilibrium
        staking_ratio = target_staked / total_supply
        
        # APR adjustment based on staking ratio
        if staking_ratio > 0.7:
            adjusted_apr = base_apr * 0.7  # Lower APR when too much is staked
        elif staking_ratio < 0.3:
            adjusted_apr = base_apr * 1.3  # Higher APR to incentivize staking
        else:
            adjusted_apr = base_apr
        
        # Liquidity impact
        circulating_supply = total_supply - target_staked
        liquidity_ratio = circulating_supply / total_supply
        
        return {
            'equilibrium_stake': target_staked,
            'staking_ratio': float(staking_ratio),
            'adjusted_apr': float(adjusted_apr),
            'apr_impact': float((adjusted_apr - base_apr) / base_apr * 100),
            'liquidity_effects': {
                'circulating_supply': circulating_supply,
                'liquidity_ratio': float(liquidity_ratio),
                'scarcity_level': 'high' if liquidity_ratio < 0.3 else 'moderate' if liquidity_ratio < 0.6 else 'low'
            },
            'time_to_equilibrium_days': int(30 + abs(target_staked - current_staked) / 10000)
        }
    
    def simulate_mining_profitability(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate mining ROI under different scenarios"""
        difficulty = params.get('difficulty', 1.0)
        fees = params.get('avg_tx_fee', 0.00015)
        electricity_cost_kwh = params.get('electricity_cost_kwh', 0.12)
        hashrate_hs = params.get('hardware_hashrate', 1000)
        power_watts = params.get('power_consumption_watts', 100)
        
        # Calculate daily earnings
        network_hashrate = 2.5e9  # 2.5 GH/s
        block_reward = 0.6  # XMR per block
        blocks_per_day = 720  # ~2 min blocks
        
        daily_blocks = (hashrate_hs / network_hashrate) * blocks_per_day * difficulty
        daily_xmr = daily_blocks * block_reward
        
        # Calculate costs
        daily_kwh = (power_watts / 1000) * 24
        daily_electricity_cost = daily_kwh * electricity_cost_kwh
        
        # Profitability
        xmr_price = 150  # Assumed price
        daily_revenue = daily_xmr * xmr_price
        daily_profit = daily_revenue - daily_electricity_cost
        
        return {
            'profitability_forecast': {
                'daily_xmr_mined': float(daily_xmr),
                'daily_revenue_usd': float(daily_revenue),
                'daily_electricity_cost': float(daily_electricity_cost),
                'daily_profit_usd': float(daily_profit),
                'monthly_profit_usd': float(daily_profit * 30)
            },
            'breakeven_analysis': {
                'profitable': daily_profit > 0,
                'roi_percent_monthly': float((daily_profit * 30) / (daily_electricity_cost * 30) * 100) if daily_electricity_cost > 0 else 0
            },
            'sensitivity': {
                'to_difficulty_increase': 'high',
                'to_price_changes': 'high',
                'to_electricity_cost': 'medium'
            }
        }

class TechnicalSimulator:
    """Technical and network simulations"""
    
    def simulate_fee_impact(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Impact of fee changes on bridge operations"""
        current_fee = params.get('current_avg_fee', 0.00015)
        fee_multiplier = params.get('fee_multiplier', 2.0)
        bridge_tx_volume = params.get('bridge_tx_volume_monthly', 1000)
        
        new_fee = current_fee * fee_multiplier
        monthly_cost_increase = (new_fee - current_fee) * bridge_tx_volume
        
        # Estimate tx reduction due to higher fees
        elasticity = -0.5  # Demand elasticity
        volume_change_pct = elasticity * (fee_multiplier - 1) * 100
        new_volume = bridge_tx_volume * (1 + volume_change_pct / 100)
        
        return {
            'fee_impact': {
                'old_fee': float(current_fee),
                'new_fee': float(new_fee),
                'fee_increase_pct': float((fee_multiplier - 1) * 100)
            },
            'cost_impact': {
                'monthly_cost_increase_xmr': float(monthly_cost_increase),
                'annual_cost_increase_xmr': float(monthly_cost_increase * 12)
            },
            'volume_impact': {
                'estimated_volume_change_pct': float(volume_change_pct),
                'new_monthly_volume': int(new_volume),
                'transactions_lost': int(bridge_tx_volume - new_volume)
            },
            'mitigation_strategies': [
                'Batch transactions to reduce frequency',
                'Implement fee pooling mechanism',
                'Negotiate lower fees with miners',
                'Explore alternative bridge solutions'
            ]
        }
    
    def simulate_network_congestion(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Network congestion and capacity modeling"""
        tx_rate_per_sec = params.get('tx_rate', 10)
        block_size_kb = params.get('block_size_kb', 300)
        block_time_sec = params.get('block_time_sec', 120)
        
        # Calculate capacity
        tx_size_kb = 2  # Average tx size
        txs_per_block = block_size_kb / tx_size_kb
        network_capacity_tps = txs_per_block / block_time_sec
        
        # Congestion metrics
        utilization = tx_rate_per_sec / network_capacity_tps
        congestion_level = 'critical' if utilization > 0.9 else 'high' if utilization > 0.7 else 'moderate' if utilization > 0.5 else 'low'
        
        # Queue analysis
        if utilization >= 1.0:
            avg_wait_time = float('inf')
            queue_buildup = 'unbounded'
        else:
            avg_wait_time = (1 / (network_capacity_tps - tx_rate_per_sec)) * block_time_sec
            queue_buildup = 'stable'
        
        return {
            'capacity_analysis': {
                'network_capacity_tps': float(network_capacity_tps),
                'current_tx_rate': float(tx_rate_per_sec),
                'utilization_pct': float(utilization * 100),
                'congestion_level': congestion_level
            },
            'latency_forecast': {
                'avg_confirmation_time_sec': float(avg_wait_time) if avg_wait_time != float('inf') else 'infinite',
                'queue_status': queue_buildup,
                'peak_wait_time_sec': float(avg_wait_time * 2) if avg_wait_time != float('inf') else 'infinite'
            },
            'recommendations': self._get_congestion_recommendations(utilization)
        }
    
    def _get_congestion_recommendations(self, utilization: float) -> List[str]:
        """Get recommendations based on network utilization"""
        if utilization > 0.9:
            return [
                'URGENT: Network near capacity - implement emergency scaling',
                'Increase block size or reduce block time',
                'Implement transaction prioritization',
                'Consider layer-2 solutions'
            ]
        elif utilization > 0.7:
            return [
                'Monitor capacity closely',
                'Prepare scaling solutions',
                'Optimize transaction batching'
            ]
        else:
            return ['Network capacity adequate', 'Continue monitoring']

class SecuritySimulator:
    """Security and attack simulations"""
    
    def simulate_attack_scenario(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Game theory model for attack scenarios"""
        attack_type = params.get('attack_type', '51_percent')
        attacker_hashrate_pct = params.get('attacker_hashrate_percentage', 51)
        network_hashrate = params.get('network_total_hashrate_hs', 2.5e9)
        attack_duration_hours = params.get('attack_duration_hours', 24)
        
        # Calculate attack costs
        attacker_hashrate = network_hashrate * (attacker_hashrate_pct / 100)
        power_per_hs = 0.0001  # watts per H/s
        electricity_cost_kwh = 0.12
        
        power_kw = (attacker_hashrate * power_per_hs) / 1000
        attack_cost = power_kw * attack_duration_hours * electricity_cost_kwh
        
        # Success probability (simplified)
        if attacker_hashrate_pct >= 51:
            success_probability = 0.95
        elif attacker_hashrate_pct >= 40:
            success_probability = 0.6
        else:
            success_probability = 0.2
        
        # Defense cost
        defense_multiplier = 1.5
        defense_cost = attack_cost * defense_multiplier
        
        return {
            'attack_analysis': {
                'attack_type': attack_type,
                'attacker_hashrate_pct': attacker_hashrate_pct,
                'success_probability': float(success_probability),
                'estimated_cost_usd': float(attack_cost)
            },
            'economic_feasibility': {
                'cost_per_hour': float(attack_cost / attack_duration_hours),
                'roi_required_for_profit': 'high',
                'likelihood': 'low' if attack_cost > 100000 else 'medium' if attack_cost > 50000 else 'high'
            },
            'defense_strategy': {
                'recommended_defense_investment': float(defense_cost),
                'mitigation_tactics': [
                    'Increase network hashrate through incentives',
                    'Implement checkpoint system',
                    'Monitor for unusual hashrate concentrations',
                    'Prepare emergency response protocol'
                ]
            },
            'risk_assessment': {
                'threat_level': 'critical' if success_probability > 0.8 else 'high' if success_probability > 0.5 else 'moderate',
                'recommended_action': 'immediate' if success_probability > 0.8 else 'monitor'
            }
        }

def run_simulation(scenario_type: str, scenario_name: str, parameters: Dict[str, Any]) -> SimulationResult:
    """Main entry point for scenario simulations"""
    start_time = datetime.now()
    
    try:
        if scenario_type == 'economic':
            simulator = EconomicSimulator()
            if 'listing' in scenario_name.lower() or 'exchange' in scenario_name.lower():
                results = simulator.simulate_token_listing(parameters)
            elif 'stak' in scenario_name.lower():
                results = simulator.simulate_staking_dynamics(parameters)
            elif 'mining' in scenario_name.lower():
                results = simulator.simulate_mining_profitability(parameters)
            else:
                results = {'error': 'Unknown economic scenario'}
        
        elif scenario_type == 'technical':
            simulator = TechnicalSimulator()
            if 'fee' in scenario_name.lower():
                results = simulator.simulate_fee_impact(parameters)
            elif 'congestion' in scenario_name.lower() or 'network' in scenario_name.lower():
                results = simulator.simulate_network_congestion(parameters)
            else:
                results = {'error': 'Unknown technical scenario'}
        
        elif scenario_type == 'security':
            simulator = SecuritySimulator()
            results = simulator.simulate_attack_scenario(parameters)
        
        else:
            results = {'error': f'Unknown scenario type: {scenario_type}'}
        
        execution_time = int((datetime.now() - start_time).total_seconds() * 1000)
        
        # Generate recommendations
        recommendations = results.get('recommendations', [])
        if not recommendations and 'mitigation_strategies' in results:
            recommendations = results['mitigation_strategies']
        if not recommendations and 'defense_strategy' in results:
            recommendations = results['defense_strategy'].get('mitigation_tactics', [])
        
        return SimulationResult(
            scenario_type=scenario_type,
            scenario_name=scenario_name,
            confidence_level=0.75,
            simulation_results=results,
            recommendations=recommendations,
            risk_assessment=results.get('risk_assessment', {}),
            execution_time_ms=execution_time
        )
    
    except Exception as e:
        return SimulationResult(
            scenario_type=scenario_type,
            scenario_name=scenario_name,
            confidence_level=0.0,
            simulation_results={'error': str(e)},
            recommendations=[],
            risk_assessment={},
            execution_time_ms=0
        )

# CLI entry point for testing
if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 1:
        # Read from stdin
        input_data = json.loads(sys.stdin.read())
        result = run_simulation(
            input_data['scenario_type'],
            input_data['scenario_name'],
            input_data['parameters']
        )
        print(json.dumps({
            'scenario_type': result.scenario_type,
            'scenario_name': result.scenario_name,
            'confidence_level': result.confidence_level,
            'simulation_results': result.simulation_results,
            'recommendations': result.recommendations,
            'risk_assessment': result.risk_assessment,
            'execution_time_ms': result.execution_time_ms
        }, indent=2))
    else:
        # Test run
        test_result = run_simulation(
            'economic',
            'Token Exchange Listing',
            {'current_market_cap': 1000000, 'expected_volume_increase': 500}
        )
        print(json.dumps(test_result.simulation_results, indent=2))
