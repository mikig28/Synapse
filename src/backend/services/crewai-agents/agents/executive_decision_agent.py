"""
Executive Decision Agent for Ultra-Thinking Analysis
Provides C-level strategic insights, executive decision support, and board-level recommendations.
"""

import json
import logging
from typing import Dict, List, Any, Optional, Tuple, Union
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import re
from enum import Enum

logger = logging.getLogger(__name__)

class StrategicPriority(Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class DecisionType(Enum):
    STRATEGIC = "strategic"
    OPERATIONAL = "operational"
    FINANCIAL = "financial"
    INVESTMENT = "investment"
    RISK_MANAGEMENT = "risk_management"
    ORGANIZATIONAL = "organizational"
    MARKET_ENTRY = "market_entry"
    INNOVATION = "innovation"

class ExecutiveRole(Enum):
    CEO = "ceo"
    CFO = "cfo"
    COO = "coo"
    CTO = "cto"
    CMO = "cmo"
    CHRO = "chro"
    BOARD = "board"

class TimeHorizon(Enum):
    IMMEDIATE = "immediate"    # 0-3 months
    SHORT_TERM = "short_term"  # 3-12 months
    MEDIUM_TERM = "medium_term" # 1-3 years
    LONG_TERM = "long_term"    # 3+ years

class ImplementationComplexity(Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    VERY_HIGH = "very_high"

@dataclass
class StrategicOption:
    """Strategic option with comprehensive analysis"""
    title: str
    description: str
    decision_type: DecisionType
    strategic_rationale: str
    expected_outcomes: List[str]
    success_metrics: List[str]
    resource_requirements: Dict[str, str]
    implementation_complexity: ImplementationComplexity
    time_horizon: TimeHorizon
    risk_factors: List[str]
    mitigation_strategies: List[str]
    competitive_advantages: List[str]
    stakeholder_impact: Dict[str, str]
    financial_implications: str
    confidence_score: float

@dataclass
class ExecutiveInsight:
    """Executive-level insight with strategic implications"""
    title: str
    target_role: ExecutiveRole
    insight_summary: str
    strategic_implications: List[str]
    action_items: List[str]
    decision_points: List[str]
    success_indicators: List[str]
    risk_considerations: List[str]
    competitive_context: str
    market_timing: str
    resource_allocation: str
    stakeholder_communication: str
    confidence_level: float

@dataclass
class BoardRecommendation:
    """Board-level strategic recommendation"""
    recommendation_title: str
    executive_summary: str
    strategic_context: str
    recommendation_details: List[str]
    expected_value_creation: str
    investment_requirements: str
    risk_assessment: str
    implementation_timeline: str
    governance_considerations: List[str]
    stakeholder_alignment: Dict[str, str]
    success_metrics: List[str]
    approval_requirements: List[str]
    confidence_rating: float

@dataclass
class StrategicDecisionFramework:
    """Comprehensive decision-making framework"""
    decision_context: str
    key_considerations: List[str]
    evaluation_criteria: List[str]
    option_analysis: Dict[str, Any]
    recommendation_matrix: Dict[str, Any]
    implementation_roadmap: List[str]
    monitoring_framework: List[str]
    contingency_plans: List[str]
    stakeholder_alignment_strategy: str

@dataclass
class ResourceAllocationGuidance:
    """Strategic resource allocation recommendations"""
    allocation_strategy: str
    priority_investments: List[Dict[str, Any]]
    optimization_opportunities: List[str]
    divestiture_candidates: List[str]
    capability_gaps: List[str]
    talent_strategy: str
    technology_investments: str
    market_investments: str
    risk_management_allocation: str

@dataclass
class ExecutiveDecisionReport:
    """Complete executive decision support report"""
    strategic_options: List[StrategicOption]
    executive_insights: List[ExecutiveInsight]
    board_recommendations: List[BoardRecommendation]
    decision_framework: StrategicDecisionFramework
    resource_allocation: ResourceAllocationGuidance
    leadership_priorities: Dict[str, List[str]]
    strategic_calendar: Dict[str, List[str]]
    executive_recommendations: List[str]
    confidence_score: float
    analysis_timestamp: str

class ExecutiveDecisionAgent:
    """
    Advanced Executive Decision Agent for ultra-thinking analysis.
    
    Provides C-level strategic insights, executive decision support, board-level
    recommendations, and comprehensive strategic analysis for leadership teams.
    """
    
    def __init__(self):
        self.agent_name = "Executive Decision Agent"
        self.version = "2.0.0"
        self.capabilities = [
            "strategic_synthesis",
            "executive_insight_generation",
            "board_level_recommendations",
            "decision_framework_design",
            "resource_allocation_optimization",
            "leadership_priority_setting",
            "stakeholder_alignment_strategy",
            "corporate_strategy_development"
        ]
        
        # Executive decision frameworks
        self.decision_frameworks = {
            "strategic_planning": self._apply_strategic_planning_framework,
            "investment_evaluation": self._apply_investment_evaluation_framework,
            "risk_decision_matrix": self._apply_risk_decision_matrix,
            "stakeholder_analysis": self._apply_stakeholder_analysis_framework,
            "resource_optimization": self._apply_resource_optimization_framework,
            "competitive_positioning": self._apply_competitive_positioning_framework
        }
        
        # Executive priorities by role
        self.role_priorities = {
            ExecutiveRole.CEO: [
                "strategic_vision", "stakeholder_alignment", "culture_leadership",
                "performance_delivery", "risk_management", "board_relations"
            ],
            ExecutiveRole.CFO: [
                "financial_performance", "capital_allocation", "risk_management",
                "investor_relations", "cost_optimization", "compliance"
            ],
            ExecutiveRole.COO: [
                "operational_excellence", "process_optimization", "supply_chain",
                "quality_management", "scalability", "efficiency"
            ],
            ExecutiveRole.CTO: [
                "technology_strategy", "innovation_pipeline", "digital_transformation",
                "cybersecurity", "technical_architecture", "talent_development"
            ],
            ExecutiveRole.CMO: [
                "market_positioning", "brand_strategy", "customer_acquisition",
                "digital_marketing", "customer_experience", "market_research"
            ]
        }
        
        # Strategic decision patterns
        self.decision_patterns = {
            "growth_strategies": {
                "organic_growth": "internal capability development and market expansion",
                "acquisition_growth": "strategic acquisitions and market consolidation",
                "partnership_growth": "strategic alliances and joint ventures",
                "innovation_growth": "new product development and market creation"
            },
            "competitive_responses": {
                "defensive": "protect market position and customer base",
                "offensive": "aggressive market expansion and competition",
                "collaborative": "strategic partnerships and ecosystem building",
                "disruptive": "business model innovation and market disruption"
            },
            "resource_strategies": {
                "investment": "strategic capital allocation for growth",
                "optimization": "efficiency improvement and cost reduction",
                "divestiture": "portfolio rationalization and focus",
                "transformation": "fundamental business model change"
            }
        }

    def ultra_executive_analysis(
        self, 
        content: Dict[str, Any], 
        topics: List[str],
        strategic_context: Optional[str] = None,
        target_roles: Optional[List[str]] = None
    ) -> ExecutiveDecisionReport:
        """
        Ultra-thinking executive analysis with multi-step reasoning chains.
        
        9-Phase Ultra-Executive Process:
        1. Strategic Context Analysis & Synthesis
        2. Executive Insight Development by Role
        3. Strategic Option Generation & Evaluation
        4. Board-Level Recommendation Development
        5. Decision Framework Construction
        6. Resource Allocation Strategy Development
        7. Leadership Priority Setting & Alignment
        8. Strategic Calendar & Timeline Development
        9. Executive Decision Synthesis
        """
        logger.info(f"{self.agent_name}: Starting ultra-executive analysis for topics: {topics}")
        
        try:
            # Phase 1: Strategic Context Analysis & Synthesis
            strategic_synthesis = self._synthesize_strategic_context(content, topics, strategic_context)
            
            # Phase 2: Executive Insight Development by Role
            executive_insights = self._develop_executive_insights(
                content, topics, strategic_synthesis, target_roles
            )
            
            # Phase 3: Strategic Option Generation & Evaluation
            strategic_options = self._generate_strategic_options(
                content, topics, strategic_synthesis, executive_insights
            )
            
            # Phase 4: Board-Level Recommendation Development
            board_recommendations = self._develop_board_recommendations(
                strategic_options, executive_insights, strategic_synthesis
            )
            
            # Phase 5: Decision Framework Construction
            decision_framework = self._construct_decision_framework(
                strategic_options, executive_insights, strategic_synthesis
            )
            
            # Phase 6: Resource Allocation Strategy Development
            resource_allocation = self._develop_resource_allocation_strategy(
                strategic_options, board_recommendations, decision_framework
            )
            
            # Phase 7: Leadership Priority Setting & Alignment
            leadership_priorities = self._set_leadership_priorities(
                executive_insights, strategic_options, target_roles
            )
            
            # Phase 8: Strategic Calendar & Timeline Development
            strategic_calendar = self._develop_strategic_calendar(
                strategic_options, board_recommendations, leadership_priorities
            )
            
            # Phase 9: Executive Decision Synthesis
            executive_recommendations = self._synthesize_executive_recommendations(
                strategic_options, executive_insights, board_recommendations, 
                decision_framework, resource_allocation
            )
            
            # Calculate overall confidence score
            confidence_score = self._calculate_executive_confidence(
                strategic_options, executive_insights, board_recommendations
            )
            
            executive_report = ExecutiveDecisionReport(
                strategic_options=strategic_options,
                executive_insights=executive_insights,
                board_recommendations=board_recommendations,
                decision_framework=decision_framework,
                resource_allocation=resource_allocation,
                leadership_priorities=leadership_priorities,
                strategic_calendar=strategic_calendar,
                executive_recommendations=executive_recommendations,
                confidence_score=confidence_score,
                analysis_timestamp=datetime.now().isoformat()
            )
            
            logger.info(f"{self.agent_name}: Ultra-executive analysis completed with {confidence_score:.1%} confidence")
            return executive_report
            
        except Exception as e:
            logger.error(f"{self.agent_name}: Ultra-executive analysis failed: {str(e)}")
            return self._create_fallback_executive_report()

    def _synthesize_strategic_context(
        self, 
        content: Dict[str, Any], 
        topics: List[str],
        strategic_context: Optional[str]
    ) -> Dict[str, Any]:
        """Phase 1: Comprehensive strategic context synthesis"""
        logger.info(f"{self.agent_name}: Synthesizing strategic context")
        
        content_text = self._extract_text_from_content(content)
        
        # Identify strategic themes
        strategic_themes = self._identify_strategic_themes(content_text, topics)
        
        # Analyze competitive dynamics
        competitive_landscape = self._analyze_competitive_dynamics(content_text, strategic_themes)
        
        # Identify market opportunities
        market_opportunities = self._identify_market_opportunities(content_text, topics)
        
        # Assess strategic risks
        strategic_risks = self._assess_strategic_risks(content_text, strategic_themes)
        
        # Determine strategic imperatives
        strategic_imperatives = self._determine_strategic_imperatives(
            strategic_themes, competitive_landscape, market_opportunities, strategic_risks
        )
        
        return {
            "strategic_themes": strategic_themes,
            "competitive_landscape": competitive_landscape,
            "market_opportunities": market_opportunities,
            "strategic_risks": strategic_risks,
            "strategic_imperatives": strategic_imperatives,
            "context_strength": self._assess_context_strength(content_text, topics)
        }

    def _develop_executive_insights(
        self, 
        content: Dict[str, Any], 
        topics: List[str],
        strategic_synthesis: Dict[str, Any],
        target_roles: Optional[List[str]]
    ) -> List[ExecutiveInsight]:
        """Phase 2: Develop role-specific executive insights"""
        logger.info(f"{self.agent_name}: Developing executive insights")
        
        insights = []
        
        # Determine target roles
        if target_roles:
            roles = [ExecutiveRole(role) for role in target_roles if role in [r.value for r in ExecutiveRole]]
        else:
            roles = [ExecutiveRole.CEO, ExecutiveRole.CFO, ExecutiveRole.COO, ExecutiveRole.CTO]
        
        # Generate insights for each role
        for role in roles:
            role_insights = self._generate_role_specific_insights(
                role, content, topics, strategic_synthesis
            )
            insights.extend(role_insights)
        
        # Board-level insights
        board_insights = self._generate_board_insights(content, topics, strategic_synthesis)
        insights.extend(board_insights)
        
        # Sort by confidence and strategic impact
        insights.sort(key=lambda i: i.confidence_level, reverse=True)
        
        return insights[:12]  # Return top 12 insights

    def _generate_role_specific_insights(
        self, 
        role: ExecutiveRole, 
        content: Dict[str, Any],
        topics: List[str],
        strategic_synthesis: Dict[str, Any]
    ) -> List[ExecutiveInsight]:
        """Generate insights specific to executive role"""
        
        insights = []
        role_priorities = self.role_priorities.get(role, [])
        
        # Analyze content for role-relevant insights
        for priority in role_priorities[:3]:  # Top 3 priorities per role
            insight = self._create_priority_insight(
                role, priority, content, topics, strategic_synthesis
            )
            if insight:
                insights.append(insight)
        
        return insights

    def _create_priority_insight(
        self,
        role: ExecutiveRole,
        priority: str,
        content: Dict[str, Any],
        topics: List[str],
        strategic_synthesis: Dict[str, Any]
    ) -> Optional[ExecutiveInsight]:
        """Create insight for specific role priority"""
        
        content_text = self._extract_text_from_content(content)
        
        # Extract priority-relevant context
        priority_context = self._extract_priority_context(content_text, priority, topics)
        
        if not priority_context:
            return None
        
        # Generate insight based on role and priority
        title = f"{role.value.upper()} {priority.replace('_', ' ').title()} Strategy"
        
        insight_summary = self._generate_insight_summary(priority, priority_context, strategic_synthesis)
        
        strategic_implications = self._identify_strategic_implications(
            priority, priority_context, strategic_synthesis
        )
        
        action_items = self._generate_action_items(role, priority, priority_context)
        
        decision_points = self._identify_decision_points(role, priority, strategic_synthesis)
        
        return ExecutiveInsight(
            title=title,
            target_role=role,
            insight_summary=insight_summary,
            strategic_implications=strategic_implications,
            action_items=action_items,
            decision_points=decision_points,
            success_indicators=self._define_success_indicators(priority, role),
            risk_considerations=self._identify_risk_considerations(priority, strategic_synthesis),
            competitive_context=self._assess_competitive_context(priority, strategic_synthesis),
            market_timing=self._assess_market_timing(priority, content),
            resource_allocation=self._recommend_resource_allocation(priority, role),
            stakeholder_communication=self._recommend_stakeholder_communication(priority, role),
            confidence_level=self._calculate_insight_confidence(priority_context, strategic_synthesis)
        )

    def _generate_strategic_options(
        self,
        content: Dict[str, Any],
        topics: List[str],
        strategic_synthesis: Dict[str, Any],
        executive_insights: List[ExecutiveInsight]
    ) -> List[StrategicOption]:
        """Phase 3: Generate and evaluate strategic options"""
        logger.info(f"{self.agent_name}: Generating strategic options")
        
        options = []
        
        # Growth strategy options
        growth_options = self._generate_growth_options(strategic_synthesis, executive_insights)
        options.extend(growth_options)
        
        # Competitive response options
        competitive_options = self._generate_competitive_options(strategic_synthesis, executive_insights)
        options.extend(competitive_options)
        
        # Innovation options
        innovation_options = self._generate_innovation_options(content, topics, strategic_synthesis)
        options.extend(innovation_options)
        
        # Risk management options
        risk_options = self._generate_risk_management_options(strategic_synthesis, executive_insights)
        options.extend(risk_options)
        
        # Evaluate and score options
        evaluated_options = self._evaluate_strategic_options(options, strategic_synthesis)
        
        # Sort by strategic value and feasibility
        evaluated_options.sort(
            key=lambda o: o.confidence_score * self._calculate_strategic_value(o),
            reverse=True
        )
        
        return evaluated_options[:8]  # Return top 8 options

    def _develop_board_recommendations(
        self,
        strategic_options: List[StrategicOption],
        executive_insights: List[ExecutiveInsight],
        strategic_synthesis: Dict[str, Any]
    ) -> List[BoardRecommendation]:
        """Phase 4: Develop board-level recommendations"""
        logger.info(f"{self.agent_name}: Developing board recommendations")
        
        recommendations = []
        
        # High-impact strategic options for board consideration
        board_level_options = [
            option for option in strategic_options[:5] 
            if option.decision_type in [DecisionType.STRATEGIC, DecisionType.INVESTMENT, DecisionType.MARKET_ENTRY]
        ]
        
        for option in board_level_options:
            recommendation = self._create_board_recommendation(option, strategic_synthesis)
            if recommendation:
                recommendations.append(recommendation)
        
        # Strategic risk recommendations
        risk_recommendations = self._create_risk_board_recommendations(executive_insights, strategic_synthesis)
        recommendations.extend(risk_recommendations)
        
        return recommendations[:5]  # Return top 5 board recommendations

    def _synthesize_executive_recommendations(
        self,
        strategic_options: List[StrategicOption],
        executive_insights: List[ExecutiveInsight],
        board_recommendations: List[BoardRecommendation],
        decision_framework: StrategicDecisionFramework,
        resource_allocation: ResourceAllocationGuidance
    ) -> List[str]:
        """Generate final executive recommendations synthesis"""
        
        recommendations = []
        
        # Strategic priority recommendations
        if strategic_options:
            top_option = strategic_options[0]
            recommendations.append(
                f"🎯 **Strategic Priority**: Execute {top_option.title} - Expected outcomes: {', '.join(top_option.expected_outcomes[:2])}"
            )
        
        # Leadership alignment recommendations
        ceo_insights = [i for i in executive_insights if i.target_role == ExecutiveRole.CEO]
        if ceo_insights:
            recommendations.append(
                f"👥 **Leadership Alignment**: CEO focus on {ceo_insights[0].title} with immediate action on {', '.join(ceo_insights[0].action_items[:2])}"
            )
        
        # Investment recommendations
        if resource_allocation.priority_investments:
            top_investment = resource_allocation.priority_investments[0]
            recommendations.append(
                f"💰 **Investment Priority**: Allocate resources to {top_investment.get('area', 'strategic initiatives')} - {resource_allocation.allocation_strategy}"
            )
        
        # Board governance recommendations
        if board_recommendations:
            top_board_rec = board_recommendations[0]
            recommendations.append(
                f"📋 **Board Action**: {top_board_rec.recommendation_title} - {top_board_rec.expected_value_creation}"
            )
        
        # Risk management recommendations
        high_risk_options = [o for o in strategic_options if len(o.risk_factors) >= 3]
        if high_risk_options:
            recommendations.append(
                f"⚠️ **Risk Management**: Implement comprehensive risk mitigation for {high_risk_options[0].title} initiatives"
            )
        
        # Execution excellence recommendations
        recommendations.append(
            f"🚀 **Execution Excellence**: Establish {decision_framework.monitoring_framework[0] if decision_framework.monitoring_framework else 'quarterly'} progress reviews with stakeholder alignment strategy"
        )
        
        # Market timing recommendations
        time_sensitive_insights = [i for i in executive_insights if "immediate" in i.market_timing.lower()]
        if time_sensitive_insights:
            recommendations.append(
                f"⏰ **Market Timing**: Act immediately on {time_sensitive_insights[0].title} while market conditions are favorable"
            )
        
        return recommendations

    # Helper methods for executive analysis
    def _extract_text_from_content(self, content: Dict[str, Any]) -> str:
        """Extract text content for executive analysis"""
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

    def _identify_strategic_themes(self, content_text: str, topics: List[str]) -> List[str]:
        """Identify strategic themes from content"""
        strategic_keywords = [
            "growth", "expansion", "innovation", "transformation", "competitive advantage",
            "market leadership", "digital transformation", "sustainability", "efficiency",
            "customer experience", "operational excellence", "strategic partnership"
        ]
        
        themes = []
        content_lower = content_text.lower()
        
        for keyword in strategic_keywords:
            if keyword in content_lower:
                themes.append(keyword.title())
        
        # Add topic-based themes
        for topic in topics:
            if topic.lower() in content_lower:
                themes.append(f"{topic} Strategy")
        
        return list(set(themes))[:8]  # Return unique themes, max 8

    def _calculate_executive_confidence(
        self,
        strategic_options: List[StrategicOption],
        executive_insights: List[ExecutiveInsight],
        board_recommendations: List[BoardRecommendation]
    ) -> float:
        """Calculate overall executive analysis confidence"""
        
        if not strategic_options and not executive_insights:
            return 0.3
        
        # Average option confidence
        if strategic_options:
            avg_option_confidence = sum(o.confidence_score for o in strategic_options) / len(strategic_options)
        else:
            avg_option_confidence = 0.5
        
        # Average insight confidence
        if executive_insights:
            avg_insight_confidence = sum(i.confidence_level for i in executive_insights) / len(executive_insights)
        else:
            avg_insight_confidence = 0.5
        
        # Board recommendation confidence
        if board_recommendations:
            avg_board_confidence = sum(r.confidence_rating for r in board_recommendations) / len(board_recommendations)
        else:
            avg_board_confidence = 0.5
        
        # Weighted confidence score
        overall_confidence = (
            avg_option_confidence * 0.4 +
            avg_insight_confidence * 0.3 +
            avg_board_confidence * 0.3
        )
        
        return min(max(overall_confidence, 0.0), 1.0)

    def _create_fallback_executive_report(self) -> ExecutiveDecisionReport:
        """Create fallback executive report when analysis fails"""
        return ExecutiveDecisionReport(
            strategic_options=[],
            executive_insights=[],
            board_recommendations=[],
            decision_framework=StrategicDecisionFramework(
                decision_context="Executive analysis requires additional strategic data",
                key_considerations=[],
                evaluation_criteria=[],
                option_analysis={},
                recommendation_matrix={},
                implementation_roadmap=[],
                monitoring_framework=[],
                contingency_plans=[],
                stakeholder_alignment_strategy="Stakeholder analysis pending"
            ),
            resource_allocation=ResourceAllocationGuidance(
                allocation_strategy="Resource strategy development in progress",
                priority_investments=[],
                optimization_opportunities=[],
                divestiture_candidates=[],
                capability_gaps=[],
                talent_strategy="Talent analysis pending",
                technology_investments="Technology assessment in progress",
                market_investments="Market analysis pending",
                risk_management_allocation="Risk assessment ongoing"
            ),
            leadership_priorities={},
            strategic_calendar={},
            executive_recommendations=[
                "📊 **Strategic Data Enhancement**: Increase strategic intelligence gathering for comprehensive executive analysis",
                "🎯 **Leadership Alignment**: Establish executive team alignment sessions for strategic direction setting"
            ],
            confidence_score=0.3,
            analysis_timestamp=datetime.now().isoformat()
        )

    # Additional placeholder implementations for comprehensive executive analysis
    def _extract_priority_context(self, content_text: str, priority: str, topics: List[str]) -> str:
        """Extract context relevant to executive priority"""
        priority_keywords = priority.split('_')
        
        # Find sentences containing priority keywords
        sentences = content_text.split('.')
        relevant_sentences = []
        
        for sentence in sentences:
            sentence_lower = sentence.lower()
            if any(keyword in sentence_lower for keyword in priority_keywords):
                relevant_sentences.append(sentence.strip())
        
        return '. '.join(relevant_sentences[:3])  # Return top 3 relevant sentences

    def _calculate_strategic_value(self, option: StrategicOption) -> float:
        """Calculate strategic value of option"""
        complexity_penalty = {
            ImplementationComplexity.LOW: 1.0,
            ImplementationComplexity.MODERATE: 0.8,
            ImplementationComplexity.HIGH: 0.6,
            ImplementationComplexity.VERY_HIGH: 0.4
        }
        
        time_horizon_weight = {
            TimeHorizon.IMMEDIATE: 1.0,
            TimeHorizon.SHORT_TERM: 0.9,
            TimeHorizon.MEDIUM_TERM: 0.7,
            TimeHorizon.LONG_TERM: 0.5
        }
        
        complexity_factor = complexity_penalty.get(option.implementation_complexity, 0.5)
        time_factor = time_horizon_weight.get(option.time_horizon, 0.5)
        outcome_value = len(option.expected_outcomes) * 0.1  # 0.1 per expected outcome
        
        strategic_value = (complexity_factor + time_factor + outcome_value) / 3
        return min(max(strategic_value, 0.0), 1.0)

    def export_executive_decision_report(self, report: ExecutiveDecisionReport) -> Dict[str, Any]:
        """Export executive decision report in structured format"""
        return {
            "executive_decision_report": asdict(report),
            "export_metadata": {
                "agent": self.agent_name,
                "version": self.version,
                "export_timestamp": datetime.now().isoformat(),
                "analysis_confidence": report.confidence_score
            }
        }