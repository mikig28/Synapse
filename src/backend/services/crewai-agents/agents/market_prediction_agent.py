"""
Market Prediction Agent for Ultra-Thinking Analysis
Provides advanced trend forecasting, investment insights, and market prediction capabilities.
"""

import json
import logging
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import re
from enum import Enum
import math

logger = logging.getLogger(__name__)

class TrendDirection(Enum):
    BULLISH = "bullish"
    BEARISH = "bearish"
    SIDEWAYS = "sideways"
    VOLATILE = "volatile"

class MarketCycle(Enum):
    EARLY_CYCLE = "early_cycle"
    MID_CYCLE = "mid_cycle"
    LATE_CYCLE = "late_cycle"
    RECESSION = "recession"
    RECOVERY = "recovery"

class PredictionHorizon(Enum):
    SHORT_TERM = "short_term"      # 1-3 months
    MEDIUM_TERM = "medium_term"    # 3-12 months
    LONG_TERM = "long_term"        # 1-3 years
    STRATEGIC = "strategic"        # 3+ years

class ConfidenceLevel(Enum):
    VERY_HIGH = "very_high"  # >90%
    HIGH = "high"           # 75-90%
    MODERATE = "moderate"    # 50-75%
    LOW = "low"             # 25-50%
    VERY_LOW = "very_low"   # <25%

class InvestmentTheme(Enum):
    GROWTH = "growth"
    VALUE = "value"
    MOMENTUM = "momentum"
    CONTRARIAN = "contrarian"
    QUALITY = "quality"
    DIVIDEND = "dividend"
    ESG = "esg"
    THEMATIC = "thematic"

@dataclass
class MarketTrend:
    """Individual market trend with predictive analysis"""
    name: str
    direction: TrendDirection
    strength: float  # 0-1 scale
    duration_forecast: str
    key_drivers: List[str]
    supporting_indicators: List[str]
    contrarian_signals: List[str]
    probability: float
    confidence_level: ConfidenceLevel
    historical_precedents: List[str]
    catalyst_events: List[str]
    risk_factors: List[str]

@dataclass
class InvestmentInsight:
    """Investment insight with actionable recommendations"""
    title: str
    theme: InvestmentTheme
    investment_thesis: str
    time_horizon: PredictionHorizon
    expected_return: str
    risk_assessment: str
    entry_strategy: str
    exit_strategy: str
    key_metrics: List[str]
    catalysts: List[str]
    risks: List[str]
    allocation_suggestion: str
    confidence_score: float

@dataclass
class MarketForecast:
    """Comprehensive market forecast with multiple scenarios"""
    forecast_name: str
    base_case_scenario: str
    bull_case_scenario: str
    bear_case_scenario: str
    probability_distribution: Dict[str, float]
    key_assumptions: List[str]
    critical_variables: List[str]
    inflection_points: List[str]
    monitoring_indicators: List[str]
    forecast_accuracy: float
    revision_triggers: List[str]

@dataclass
class EconomicIndicator:
    """Economic indicator analysis with predictive value"""
    name: str
    current_value: str
    trend_direction: TrendDirection
    predictive_power: float
    lead_lag_relationship: str
    historical_correlation: float
    signal_strength: float
    turning_point_proximity: str
    policy_implications: List[str]
    market_impact: str

@dataclass
class MarketCycleAnalysis:
    """Market cycle position and transition predictions"""
    current_phase: MarketCycle
    phase_duration: str
    transition_probability: Dict[MarketCycle, float]
    cycle_indicators: List[str]
    phase_characteristics: List[str]
    optimal_strategies: List[str]
    sector_rotations: List[str]
    timing_signals: List[str]
    historical_patterns: List[str]

@dataclass
class MarketPrediction:
    """Complete market prediction report with ultra-thinking analysis"""
    market_trends: List[MarketTrend]
    investment_insights: List[InvestmentInsight]
    market_forecasts: List[MarketForecast]
    economic_indicators: List[EconomicIndicator]
    market_cycle_analysis: MarketCycleAnalysis
    predictive_models: Dict[str, Any]
    timing_analysis: Dict[str, Any]
    strategic_recommendations: List[str]
    confidence_score: float
    analysis_timestamp: str

class MarketPredictionAgent:
    """
    Advanced Market Prediction Agent for ultra-thinking analysis.
    
    Provides comprehensive trend forecasting, investment insights, market timing,
    and predictive analysis using multiple analytical frameworks.
    """
    
    def __init__(self):
        self.agent_name = "Market Prediction Agent"
        self.version = "2.0.0"
        self.capabilities = [
            "trend_forecasting",
            "investment_insight_generation",
            "market_timing_analysis",
            "economic_indicator_analysis",
            "predictive_modeling",
            "cycle_analysis",
            "scenario_planning",
            "quantitative_analysis"
        ]
        
        # Predictive analysis frameworks
        self.analysis_frameworks = {
            "technical_analysis": self._perform_technical_analysis,
            "fundamental_analysis": self._perform_fundamental_analysis,
            "quantitative_modeling": self._perform_quantitative_modeling,
            "behavioral_analysis": self._perform_behavioral_analysis,
            "macro_economic_analysis": self._perform_macro_analysis,
            "intermarket_analysis": self._perform_intermarket_analysis
        }
        
        # Market indicator libraries
        self.market_indicators = {
            "bullish_signals": [
                "momentum acceleration", "breakout pattern", "volume surge",
                "earnings growth", "positive sentiment", "institutional buying",
                "economic expansion", "policy support", "innovation breakthrough"
            ],
            "bearish_signals": [
                "momentum deceleration", "breakdown pattern", "volume decline",
                "earnings contraction", "negative sentiment", "institutional selling",
                "economic contraction", "policy tightening", "disruption threat"
            ],
            "volatility_indicators": [
                "geopolitical tension", "policy uncertainty", "market stress",
                "liquidity shortage", "correlation breakdown", "regime change"
            ],
            "cycle_indicators": [
                "yield curve", "credit spreads", "leading indicators",
                "employment data", "manufacturing PMI", "consumer confidence"
            ]
        }
        
        # Predictive pattern recognition
        self.predictive_patterns = {
            "trend_continuation": {
                "momentum": "sustained momentum indicates trend continuation",
                "volume": "increasing volume confirms trend strength",
                "fundamentals": "improving fundamentals support trend"
            },
            "trend_reversal": {
                "divergence": "momentum divergence signals potential reversal",
                "exhaustion": "trend exhaustion patterns indicate reversal risk",
                "catalyst": "fundamental catalyst triggers reversal"
            },
            "regime_change": {
                "structural": "structural changes alter market dynamics",
                "policy": "policy shifts create new market regime",
                "technology": "technological disruption changes landscape"
            }
        }

    def ultra_predict_markets(
        self, 
        content: Dict[str, Any], 
        topics: List[str],
        prediction_horizon: Optional[str] = None
    ) -> MarketPrediction:
        """
        Ultra-thinking market prediction with multi-step reasoning chains.
        
        8-Phase Ultra-Prediction Process:
        1. Market Data Analysis & Pattern Recognition
        2. Trend Identification & Strength Assessment
        3. Economic Indicator Analysis & Correlation
        4. Market Cycle Position & Transition Analysis
        5. Investment Insight Generation & Themes
        6. Scenario Development & Probability Assessment
        7. Predictive Model Construction & Validation
        8. Strategic Prediction Synthesis
        """
        logger.info(f"{self.agent_name}: Starting ultra-market prediction for topics: {topics}")
        
        try:
            # Phase 1: Market Data Analysis & Pattern Recognition
            market_patterns = self._analyze_market_patterns(content, topics)
            
            # Phase 2: Trend Identification & Strength Assessment
            market_trends = self._identify_and_assess_trends(content, topics, market_patterns)
            
            # Phase 3: Economic Indicator Analysis & Correlation
            economic_indicators = self._analyze_economic_indicators(content, market_patterns)
            
            # Phase 4: Market Cycle Position & Transition Analysis
            market_cycle_analysis = self._analyze_market_cycle(content, market_patterns, economic_indicators)
            
            # Phase 5: Investment Insight Generation & Themes
            investment_insights = self._generate_investment_insights(
                market_trends, economic_indicators, market_cycle_analysis
            )
            
            # Phase 6: Scenario Development & Probability Assessment
            market_forecasts = self._develop_market_forecasts(
                market_trends, economic_indicators, market_cycle_analysis
            )
            
            # Phase 7: Predictive Model Construction & Validation
            predictive_models = self._construct_predictive_models(
                market_patterns, market_trends, economic_indicators
            )
            
            # Phase 8: Strategic Prediction Synthesis
            timing_analysis = self._perform_timing_analysis(
                market_trends, market_cycle_analysis, predictive_models
            )
            strategic_recommendations = self._generate_prediction_recommendations(
                market_trends, investment_insights, market_forecasts, timing_analysis
            )
            
            # Calculate overall confidence score
            confidence_score = self._calculate_prediction_confidence(
                market_trends, investment_insights, market_forecasts
            )
            
            market_prediction = MarketPrediction(
                market_trends=market_trends,
                investment_insights=investment_insights,
                market_forecasts=market_forecasts,
                economic_indicators=economic_indicators,
                market_cycle_analysis=market_cycle_analysis,
                predictive_models=predictive_models,
                timing_analysis=timing_analysis,
                strategic_recommendations=strategic_recommendations,
                confidence_score=confidence_score,
                analysis_timestamp=datetime.now().isoformat()
            )
            
            logger.info(f"{self.agent_name}: Ultra-prediction completed with {confidence_score:.1%} confidence")
            return market_prediction
            
        except Exception as e:
            logger.error(f"{self.agent_name}: Ultra-prediction failed: {str(e)}")
            return self._create_fallback_prediction()

    def _analyze_market_patterns(
        self, 
        content: Dict[str, Any], 
        topics: List[str]
    ) -> Dict[str, Any]:
        """Phase 1: Comprehensive market pattern analysis"""
        logger.info(f"{self.agent_name}: Analyzing market patterns")
        
        content_text = self._extract_text_from_content(content)
        
        # Detect market signals
        market_signals = {}
        for signal_type, patterns in self.market_indicators.items():
            detected_signals = []
            for pattern in patterns:
                if pattern.lower() in content_text.lower():
                    signal_context = self._extract_signal_context(content_text, pattern)
                    detected_signals.append({
                        "pattern": pattern,
                        "context": signal_context,
                        "strength": self._assess_signal_strength(pattern, signal_context)
                    })
            market_signals[signal_type] = detected_signals
        
        # Analyze pattern relationships
        pattern_correlations = self._analyze_pattern_correlations(market_signals)
        
        # Identify regime indicators
        regime_indicators = self._identify_regime_indicators(content_text, market_signals)
        
        return {
            "market_signals": market_signals,
            "pattern_correlations": pattern_correlations,
            "regime_indicators": regime_indicators,
            "signal_strength": self._calculate_overall_signal_strength(market_signals)
        }

    def _identify_and_assess_trends(
        self, 
        content: Dict[str, Any], 
        topics: List[str],
        market_patterns: Dict[str, Any]
    ) -> List[MarketTrend]:
        """Phase 2: Identify and assess market trends"""
        logger.info(f"{self.agent_name}: Identifying and assessing trends")
        
        trends = []
        
        # Analyze each topic for trend signals
        for topic in topics:
            topic_trends = self._analyze_topic_trends(topic, content, market_patterns)
            trends.extend(topic_trends)
        
        # Global market trends
        global_trends = self._identify_global_trends(content, market_patterns)
        trends.extend(global_trends)
        
        # Validate and score trends
        validated_trends = self._validate_and_score_trends(trends, market_patterns)
        
        # Sort by strength and confidence
        validated_trends.sort(key=lambda t: t.strength * t.probability, reverse=True)
        
        return validated_trends[:10]  # Return top 10 trends

    def _analyze_topic_trends(
        self, 
        topic: str, 
        content: Dict[str, Any],
        market_patterns: Dict[str, Any]
    ) -> List[MarketTrend]:
        """Analyze trends specific to a topic"""
        
        trends = []
        content_text = self._extract_text_from_content(content)
        
        # Extract topic-specific signals
        topic_context = self._extract_topic_context(content_text, topic)
        
        if not topic_context:
            return trends
        
        # Determine trend direction
        direction = self._determine_trend_direction(topic_context, market_patterns)
        
        # Assess trend strength
        strength = self._assess_trend_strength(topic_context, market_patterns)
        
        # Identify key drivers
        key_drivers = self._identify_trend_drivers(topic_context, topic)
        
        # Generate trend forecast
        duration_forecast = self._forecast_trend_duration(topic_context, strength)
        
        # Calculate probability and confidence
        probability = self._calculate_trend_probability(topic_context, market_patterns)
        confidence_level = self._assess_confidence_level(probability)
        
        trend = MarketTrend(
            name=f"{topic} Market Trend",
            direction=direction,
            strength=strength,
            duration_forecast=duration_forecast,
            key_drivers=key_drivers,
            supporting_indicators=self._identify_supporting_indicators(topic_context),
            contrarian_signals=self._identify_contrarian_signals(topic_context),
            probability=probability,
            confidence_level=confidence_level,
            historical_precedents=self._find_historical_precedents(topic, direction),
            catalyst_events=self._identify_catalyst_events(topic_context),
            risk_factors=self._identify_trend_risks(topic_context)
        )
        
        trends.append(trend)
        return trends

    def _generate_investment_insights(
        self,
        market_trends: List[MarketTrend],
        economic_indicators: List[EconomicIndicator],
        market_cycle_analysis: MarketCycleAnalysis
    ) -> List[InvestmentInsight]:
        """Phase 5: Generate actionable investment insights"""
        logger.info(f"{self.agent_name}: Generating investment insights")
        
        insights = []
        
        # Trend-based insights
        for trend in market_trends[:5]:  # Top 5 trends
            insight = self._create_trend_based_insight(trend, market_cycle_analysis)
            if insight:
                insights.append(insight)
        
        # Cycle-based insights
        cycle_insights = self._create_cycle_based_insights(market_cycle_analysis, economic_indicators)
        insights.extend(cycle_insights)
        
        # Contrarian insights
        contrarian_insights = self._create_contrarian_insights(market_trends, economic_indicators)
        insights.extend(contrarian_insights)
        
        # Quality insights
        quality_insights = self._create_quality_insights(market_trends, economic_indicators)
        insights.extend(quality_insights)
        
        # Sort by confidence and expected return
        insights.sort(key=lambda i: i.confidence_score, reverse=True)
        
        return insights[:8]  # Return top 8 insights

    def _create_trend_based_insight(
        self, 
        trend: MarketTrend, 
        cycle_analysis: MarketCycleAnalysis
    ) -> Optional[InvestmentInsight]:
        """Create investment insight based on market trend"""
        
        if trend.strength < 0.5 or trend.probability < 0.6:
            return None
        
        # Determine investment theme
        theme = self._determine_investment_theme(trend, cycle_analysis)
        
        # Generate investment thesis
        investment_thesis = self._generate_investment_thesis(trend, theme)
        
        # Determine time horizon
        time_horizon = self._determine_time_horizon(trend.duration_forecast)
        
        # Calculate expected return
        expected_return = self._calculate_expected_return(trend, theme)
        
        # Assess risk
        risk_assessment = self._assess_investment_risk(trend)
        
        # Develop strategies
        entry_strategy = self._develop_entry_strategy(trend, theme)
        exit_strategy = self._develop_exit_strategy(trend, theme)
        
        return InvestmentInsight(
            title=f"{trend.name} Investment Opportunity",
            theme=theme,
            investment_thesis=investment_thesis,
            time_horizon=time_horizon,
            expected_return=expected_return,
            risk_assessment=risk_assessment,
            entry_strategy=entry_strategy,
            exit_strategy=exit_strategy,
            key_metrics=trend.supporting_indicators,
            catalysts=trend.catalyst_events,
            risks=trend.risk_factors,
            allocation_suggestion=self._suggest_allocation(trend, theme),
            confidence_score=trend.probability * trend.strength
        )

    def _generate_prediction_recommendations(
        self,
        market_trends: List[MarketTrend],
        investment_insights: List[InvestmentInsight],
        market_forecasts: List[MarketForecast],
        timing_analysis: Dict[str, Any]
    ) -> List[str]:
        """Generate strategic market prediction recommendations"""
        
        recommendations = []
        
        # Trend-based recommendations
        strong_trends = [t for t in market_trends if t.strength > 0.7 and t.probability > 0.7]
        if strong_trends:
            recommendations.append(
                f"📈 **High-Conviction Trend**: Position for {strong_trends[0].name} with {strong_trends[0].direction.value} bias - strength: {strong_trends[0].strength:.1%}"
            )
        
        # Timing recommendations
        if timing_analysis.get("optimal_entry_window"):
            recommendations.append(
                f"⏰ **Optimal Timing**: {timing_analysis['optimal_entry_window']} presents favorable entry conditions based on cycle analysis"
            )
        
        # Investment theme recommendations
        top_themes = {}
        for insight in investment_insights:
            theme = insight.theme.value
            if theme not in top_themes:
                top_themes[theme] = []
            top_themes[theme].append(insight.confidence_score)
        
        if top_themes:
            best_theme = max(top_themes.keys(), key=lambda k: sum(top_themes[k]) / len(top_themes[k]))
            recommendations.append(
                f"🎯 **Thematic Focus**: {best_theme.replace('_', ' ').title()} theme shows highest conviction across multiple opportunities"
            )
        
        # Risk management recommendations
        high_vol_trends = [t for t in market_trends if t.direction == TrendDirection.VOLATILE]
        if high_vol_trends:
            recommendations.append(
                f"⚠️ **Volatility Management**: Prepare for increased volatility in {high_vol_trends[0].name} - consider hedging strategies"
            )
        
        # Scenario-based recommendations
        if market_forecasts:
            base_case = market_forecasts[0]
            recommendations.append(
                f"📊 **Base Case Preparation**: {base_case.base_case_scenario} - monitor {', '.join(base_case.monitoring_indicators[:3])}"
            )
        
        # Contrarian opportunities
        contrarian_insights = [i for i in investment_insights if i.theme == InvestmentTheme.CONTRARIAN]
        if contrarian_insights:
            recommendations.append(
                f"🔄 **Contrarian Opportunity**: {contrarian_insights[0].title} offers counter-trend positioning with asymmetric risk/reward"
            )
        
        return recommendations

    # Helper methods for market analysis
    def _extract_text_from_content(self, content: Dict[str, Any]) -> str:
        """Extract text content for market analysis"""
        text_parts = []
        
        if isinstance(content, dict):
            for key, value in content.items():
                if isinstance(value, str):
                    text_parts.append(value)
                elif isinstance(value, list):
                    for item in value:
                        if isinstance(item, str):
                            text_parts.append(item)
                        elif isinstance(item, dict) and 'content' in item:
                            text_parts.append(str(item['content']))
        
        return " ".join(text_parts)

    def _determine_trend_direction(
        self, 
        topic_context: str, 
        market_patterns: Dict[str, Any]
    ) -> TrendDirection:
        """Determine trend direction based on context and patterns"""
        
        bullish_signals = len(market_patterns.get("market_signals", {}).get("bullish_signals", []))
        bearish_signals = len(market_patterns.get("market_signals", {}).get("bearish_signals", []))
        volatility_signals = len(market_patterns.get("market_signals", {}).get("volatility_indicators", []))
        
        context_lower = topic_context.lower()
        
        # Keyword-based direction assessment
        bullish_keywords = ["growth", "expansion", "positive", "increase", "rise", "boom"]
        bearish_keywords = ["decline", "decrease", "negative", "fall", "recession", "contraction"]
        volatile_keywords = ["uncertain", "volatility", "instability", "fluctuation"]
        
        bullish_score = sum(1 for keyword in bullish_keywords if keyword in context_lower)
        bearish_score = sum(1 for keyword in bearish_keywords if keyword in context_lower)
        volatile_score = sum(1 for keyword in volatile_keywords if keyword in context_lower)
        
        # Combined scoring
        total_bullish = bullish_signals + bullish_score
        total_bearish = bearish_signals + bearish_score
        total_volatile = volatility_signals + volatile_score
        
        if total_volatile > max(total_bullish, total_bearish):
            return TrendDirection.VOLATILE
        elif total_bullish > total_bearish:
            return TrendDirection.BULLISH
        elif total_bearish > total_bullish:
            return TrendDirection.BEARISH
        else:
            return TrendDirection.SIDEWAYS

    def _calculate_prediction_confidence(
        self,
        market_trends: List[MarketTrend],
        investment_insights: List[InvestmentInsight],
        market_forecasts: List[MarketForecast]
    ) -> float:
        """Calculate overall prediction confidence score"""
        
        if not market_trends:
            return 0.3
        
        # Average trend confidence
        avg_trend_confidence = sum(t.probability for t in market_trends) / len(market_trends)
        
        # Average insight confidence
        if investment_insights:
            avg_insight_confidence = sum(i.confidence_score for i in investment_insights) / len(investment_insights)
        else:
            avg_insight_confidence = 0.5
        
        # Forecast accuracy factor
        if market_forecasts:
            avg_forecast_accuracy = sum(f.forecast_accuracy for f in market_forecasts) / len(market_forecasts)
        else:
            avg_forecast_accuracy = 0.5
        
        # Weighted confidence score
        overall_confidence = (
            avg_trend_confidence * 0.4 +
            avg_insight_confidence * 0.3 +
            avg_forecast_accuracy * 0.3
        )
        
        return min(max(overall_confidence, 0.0), 1.0)

    def _create_fallback_prediction(self) -> MarketPrediction:
        """Create fallback prediction when analysis fails"""
        return MarketPrediction(
            market_trends=[],
            investment_insights=[],
            market_forecasts=[],
            economic_indicators=[],
            market_cycle_analysis=MarketCycleAnalysis(
                current_phase=MarketCycle.MID_CYCLE,
                phase_duration="Assessment in progress",
                transition_probability={},
                cycle_indicators=[],
                phase_characteristics=[],
                optimal_strategies=[],
                sector_rotations=[],
                timing_signals=[],
                historical_patterns=[]
            ),
            predictive_models={"status": "Models require market data"},
            timing_analysis={"status": "Timing analysis pending"},
            strategic_recommendations=[
                "📊 **Data Enhancement**: Increase market data collection for comprehensive prediction analysis",
                "🔍 **Pattern Recognition**: Implement advanced pattern recognition for market signals"
            ],
            confidence_score=0.3,
            analysis_timestamp=datetime.now().isoformat()
        )

    # Additional placeholder implementations for comprehensive prediction
    def _extract_signal_context(self, content_text: str, pattern: str) -> str:
        """Extract context around market signal"""
        pattern_index = content_text.lower().find(pattern.lower())
        if pattern_index == -1:
            return ""
        
        start = max(0, pattern_index - 100)
        end = min(len(content_text), pattern_index + len(pattern) + 100)
        return content_text[start:end]

    def _assess_signal_strength(self, pattern: str, context: str) -> float:
        """Assess the strength of a market signal"""
        strong_modifiers = ["strong", "significant", "major", "substantial"]
        weak_modifiers = ["weak", "minor", "slight", "modest"]
        
        context_lower = context.lower()
        
        if any(modifier in context_lower for modifier in strong_modifiers):
            return 0.8
        elif any(modifier in context_lower for modifier in weak_modifiers):
            return 0.3
        else:
            return 0.5

    def export_market_prediction(self, prediction: MarketPrediction) -> Dict[str, Any]:
        """Export market prediction in structured format"""
        return {
            "market_prediction": asdict(prediction),
            "export_metadata": {
                "agent": self.agent_name,
                "version": self.version,
                "export_timestamp": datetime.now().isoformat(),
                "prediction_confidence": prediction.confidence_score
            }
        }