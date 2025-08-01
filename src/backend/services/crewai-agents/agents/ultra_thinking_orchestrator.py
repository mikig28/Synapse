"""
Ultra-Thinking Orchestrator for Multi-Agent Reasoning Chains
Coordinates complex analysis across Strategic Intelligence, Competitive Intelligence, Risk Assessment, 
Market Prediction, and Executive Decision agents using multi-step reasoning chains.
"""

import json
import logging
from typing import Dict, List, Any, Optional, Tuple, Union
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import asyncio
from enum import Enum
import traceback

# Import our ultra-thinking agents
from .strategic_intelligence_agent import StrategicIntelligenceAgent, StrategicIntelligence
from .competitive_intelligence_agent import CompetitiveIntelligenceAgent, CompetitiveIntelligence
from .risk_assessment_agent import RiskAssessmentAgent, RiskAssessment
from .market_prediction_agent import MarketPredictionAgent, MarketPrediction
from .executive_decision_agent import ExecutiveDecisionAgent, ExecutiveDecisionReport

logger = logging.getLogger(__name__)

class ReasoningChainType(Enum):
    SEQUENTIAL = "sequential"
    PARALLEL = "parallel"
    HIERARCHICAL = "hierarchical"
    ITERATIVE = "iterative"
    DEBATE = "debate"

class AnalysisDepth(Enum):
    RAPID = "rapid"           # Single agent, basic analysis
    STANDARD = "standard"     # 2-3 agents, moderate depth
    DEEP = "deep"            # 3-4 agents, comprehensive analysis
    ULTRA = "ultra"          # All 5 agents, maximum depth with reasoning chains

class AgentRole(Enum):
    STRATEGIC_INTELLIGENCE = "strategic_intelligence"
    COMPETITIVE_INTELLIGENCE = "competitive_intelligence"
    RISK_ASSESSMENT = "risk_assessment"
    MARKET_PREDICTION = "market_prediction"
    EXECUTIVE_DECISION = "executive_decision"

@dataclass
class ReasoningStep:
    """Individual step in multi-agent reasoning chain"""
    step_id: str
    agent_role: AgentRole
    input_data: Dict[str, Any]
    output_data: Optional[Dict[str, Any]]
    dependencies: List[str]
    reasoning_context: str
    confidence_score: float
    execution_time: float
    status: str  # "pending", "in_progress", "completed", "failed"

@dataclass
class ReasoningChain:
    """Complete multi-agent reasoning chain"""
    chain_id: str
    chain_type: ReasoningChainType
    analysis_depth: AnalysisDepth
    reasoning_steps: List[ReasoningStep]
    synthesis_result: Optional[Dict[str, Any]]
    overall_confidence: float
    execution_metadata: Dict[str, Any]
    created_timestamp: str
    completed_timestamp: Optional[str]

@dataclass
class UltraThinkingResult:
    """Final ultra-thinking analysis result with synthesized insights"""
    analysis_id: str
    strategic_intelligence: Optional[StrategicIntelligence]
    competitive_intelligence: Optional[CompetitiveIntelligence]
    risk_assessment: Optional[RiskAssessment]
    market_prediction: Optional[MarketPrediction]
    executive_decision: Optional[ExecutiveDecisionReport]
    cross_agent_insights: List[str]
    reasoning_chains: List[ReasoningChain]
    synthesis_confidence: float
    ultra_recommendations: List[str]
    analysis_timestamp: str

class UltraThinkingOrchestrator:
    """
    Advanced orchestrator for coordinating ultra-thinking multi-agent reasoning chains.
    
    Manages complex analysis flows across all strategic intelligence agents,
    enabling sophisticated multi-step reasoning and cross-agent synthesis.
    """
    
    def __init__(self):
        self.orchestrator_name = "Ultra-Thinking Orchestrator"
        self.version = "2.0.0"
        
        # Initialize all ultra-thinking agents
        self.agents = {
            AgentRole.STRATEGIC_INTELLIGENCE: StrategicIntelligenceAgent(),
            AgentRole.COMPETITIVE_INTELLIGENCE: CompetitiveIntelligenceAgent(),
            AgentRole.RISK_ASSESSMENT: RiskAssessmentAgent(),
            AgentRole.MARKET_PREDICTION: MarketPredictionAgent(),
            AgentRole.EXECUTIVE_DECISION: ExecutiveDecisionAgent()
        }
        
        # Define reasoning chain templates
        self.reasoning_templates = {
            AnalysisDepth.RAPID: {
                "agents": [AgentRole.STRATEGIC_INTELLIGENCE],
                "chain_type": ReasoningChainType.SEQUENTIAL
            },
            AnalysisDepth.STANDARD: {
                "agents": [
                    AgentRole.STRATEGIC_INTELLIGENCE,
                    AgentRole.COMPETITIVE_INTELLIGENCE,
                    AgentRole.EXECUTIVE_DECISION
                ],
                "chain_type": ReasoningChainType.SEQUENTIAL
            },
            AnalysisDepth.DEEP: {
                "agents": [
                    AgentRole.STRATEGIC_INTELLIGENCE,
                    AgentRole.COMPETITIVE_INTELLIGENCE,
                    AgentRole.RISK_ASSESSMENT,
                    AgentRole.EXECUTIVE_DECISION
                ],
                "chain_type": ReasoningChainType.HIERARCHICAL
            },
            AnalysisDepth.ULTRA: {
                "agents": [
                    AgentRole.STRATEGIC_INTELLIGENCE,
                    AgentRole.COMPETITIVE_INTELLIGENCE,
                    AgentRole.RISK_ASSESSMENT,
                    AgentRole.MARKET_PREDICTION,
                    AgentRole.EXECUTIVE_DECISION
                ],
                "chain_type": ReasoningChainType.ITERATIVE
            }
        }
        
        # Cross-agent synthesis patterns
        self.synthesis_patterns = {
            "strategic_competitive": self._synthesize_strategic_competitive,
            "risk_prediction": self._synthesize_risk_prediction,
            "competitive_market": self._synthesize_competitive_market,
            "full_spectrum": self._synthesize_full_spectrum
        }

    async def execute_ultra_thinking(
        self,
        content: Dict[str, Any],
        topics: List[str],
        analysis_depth: AnalysisDepth = AnalysisDepth.ULTRA,
        chain_type: Optional[ReasoningChainType] = None,
        custom_workflow: Optional[List[AgentRole]] = None
    ) -> UltraThinkingResult:
        """
        Execute ultra-thinking analysis with multi-agent reasoning chains.
        
        Args:
            content: Input content for analysis
            topics: Topics to analyze
            analysis_depth: Depth of analysis (RAPID, STANDARD, DEEP, ULTRA)
            chain_type: Type of reasoning chain to use
            custom_workflow: Custom agent workflow sequence
        
        Returns:
            UltraThinkingResult with synthesized insights from all agents
        """
        logger.info(f"{self.orchestrator_name}: Starting ultra-thinking analysis with {analysis_depth.value} depth")
        
        analysis_id = f"ultra_thinking_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        try:
            # Design reasoning chain
            reasoning_chain = await self._design_reasoning_chain(
                analysis_id, content, topics, analysis_depth, chain_type, custom_workflow
            )
            
            # Execute reasoning chain
            execution_result = await self._execute_reasoning_chain(reasoning_chain)
            
            # Synthesize cross-agent insights
            synthesis_result = await self._synthesize_cross_agent_insights(
                execution_result, topics, analysis_depth
            )
            
            # Generate ultra-recommendations
            ultra_recommendations = await self._generate_ultra_recommendations(
                synthesis_result, execution_result
            )
            
            # Calculate synthesis confidence
            synthesis_confidence = self._calculate_synthesis_confidence(execution_result)
            
            # Create final result
            ultra_result = UltraThinkingResult(
                analysis_id=analysis_id,
                strategic_intelligence=execution_result.get("strategic_intelligence"),
                competitive_intelligence=execution_result.get("competitive_intelligence"),
                risk_assessment=execution_result.get("risk_assessment"),
                market_prediction=execution_result.get("market_prediction"),
                executive_decision=execution_result.get("executive_decision"),
                cross_agent_insights=synthesis_result.get("insights", []),
                reasoning_chains=[reasoning_chain],
                synthesis_confidence=synthesis_confidence,
                ultra_recommendations=ultra_recommendations,
                analysis_timestamp=datetime.now().isoformat()
            )
            
            logger.info(f"{self.orchestrator_name}: Ultra-thinking completed with {synthesis_confidence:.1%} confidence")
            return ultra_result
            
        except Exception as e:
            logger.error(f"{self.orchestrator_name}: Ultra-thinking failed: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return self._create_fallback_result(analysis_id)

    async def _design_reasoning_chain(
        self,
        analysis_id: str,
        content: Dict[str, Any],
        topics: List[str],
        analysis_depth: AnalysisDepth,
        chain_type: Optional[ReasoningChainType],
        custom_workflow: Optional[List[AgentRole]]
    ) -> ReasoningChain:
        """Design the reasoning chain based on analysis requirements"""
        
        # Get template or use custom workflow
        if custom_workflow:
            agent_sequence = custom_workflow
            selected_chain_type = chain_type or ReasoningChainType.SEQUENTIAL
        else:
            template = self.reasoning_templates[analysis_depth]
            agent_sequence = template["agents"]
            selected_chain_type = chain_type or template["chain_type"]
        
        # Create reasoning steps
        reasoning_steps = []
        
        if selected_chain_type == ReasoningChainType.SEQUENTIAL:
            reasoning_steps = self._create_sequential_steps(agent_sequence, content, topics)
        elif selected_chain_type == ReasoningChainType.PARALLEL:
            reasoning_steps = self._create_parallel_steps(agent_sequence, content, topics)
        elif selected_chain_type == ReasoningChainType.HIERARCHICAL:
            reasoning_steps = self._create_hierarchical_steps(agent_sequence, content, topics)
        elif selected_chain_type == ReasoningChainType.ITERATIVE:
            reasoning_steps = self._create_iterative_steps(agent_sequence, content, topics)
        elif selected_chain_type == ReasoningChainType.DEBATE:
            reasoning_steps = self._create_debate_steps(agent_sequence, content, topics)
        
        return ReasoningChain(
            chain_id=f"{analysis_id}_chain",
            chain_type=selected_chain_type,
            analysis_depth=analysis_depth,
            reasoning_steps=reasoning_steps,
            synthesis_result=None,
            overall_confidence=0.0,
            execution_metadata={
                "agent_count": len(agent_sequence),
                "step_count": len(reasoning_steps),
                "topics": topics
            },
            created_timestamp=datetime.now().isoformat(),
            completed_timestamp=None
        )

    async def _execute_reasoning_chain(self, reasoning_chain: ReasoningChain) -> Dict[str, Any]:
        """Execute the reasoning chain with appropriate flow control"""
        
        execution_results = {}
        step_outputs = {}
        
        logger.info(f"Executing {reasoning_chain.chain_type.value} reasoning chain with {len(reasoning_chain.reasoning_steps)} steps")
        
        if reasoning_chain.chain_type == ReasoningChainType.SEQUENTIAL:
            execution_results = await self._execute_sequential_chain(reasoning_chain, step_outputs)
        elif reasoning_chain.chain_type == ReasoningChainType.PARALLEL:
            execution_results = await self._execute_parallel_chain(reasoning_chain, step_outputs)
        elif reasoning_chain.chain_type == ReasoningChainType.HIERARCHICAL:
            execution_results = await self._execute_hierarchical_chain(reasoning_chain, step_outputs)
        elif reasoning_chain.chain_type == ReasoningChainType.ITERATIVE:
            execution_results = await self._execute_iterative_chain(reasoning_chain, step_outputs)
        elif reasoning_chain.chain_type == ReasoningChainType.DEBATE:
            execution_results = await self._execute_debate_chain(reasoning_chain, step_outputs)
        
        # Update reasoning chain with results
        reasoning_chain.synthesis_result = execution_results
        reasoning_chain.overall_confidence = self._calculate_chain_confidence(reasoning_chain.reasoning_steps)
        reasoning_chain.completed_timestamp = datetime.now().isoformat()
        
        return execution_results

    async def _execute_sequential_chain(
        self, 
        reasoning_chain: ReasoningChain, 
        step_outputs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute reasoning chain sequentially, passing outputs between agents"""
        
        execution_results = {}
        
        for step in reasoning_chain.reasoning_steps:
            logger.info(f"Executing sequential step: {step.agent_role.value}")
            
            start_time = datetime.now()
            step.status = "in_progress"
            
            try:
                # Prepare input data with outputs from previous steps
                enhanced_input = self._enhance_input_with_dependencies(
                    step.input_data, step.dependencies, step_outputs
                )
                
                # Execute agent analysis
                agent_result = await self._execute_agent_analysis(
                    step.agent_role, enhanced_input
                )
                
                # Store results
                step.output_data = agent_result
                step_outputs[step.step_id] = agent_result
                execution_results[step.agent_role.value] = agent_result
                
                step.status = "completed"
                step.confidence_score = self._extract_confidence_score(agent_result)
                step.execution_time = (datetime.now() - start_time).total_seconds()
                
                logger.info(f"Completed {step.agent_role.value} with {step.confidence_score:.1%} confidence")
                
            except Exception as e:
                logger.error(f"Step {step.step_id} failed: {str(e)}")
                step.status = "failed"
                step.output_data = {"error": str(e)}
                step.execution_time = (datetime.now() - start_time).total_seconds()
        
        return execution_results

    async def _execute_parallel_chain(
        self, 
        reasoning_chain: ReasoningChain, 
        step_outputs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute reasoning chain in parallel for independent analyses"""
        
        execution_results = {}
        
        # Group steps by dependency level
        dependency_levels = self._group_steps_by_dependencies(reasoning_chain.reasoning_steps)
        
        for level, steps in dependency_levels.items():
            logger.info(f"Executing parallel level {level} with {len(steps)} steps")
            
            # Execute all steps in this level concurrently
            level_tasks = []
            for step in steps:
                task = self._execute_single_step(step, step_outputs)
                level_tasks.append(task)
            
            # Wait for all steps in this level to complete
            level_results = await asyncio.gather(*level_tasks, return_exceptions=True)
            
            # Process results
            for step, result in zip(steps, level_results):
                if isinstance(result, Exception):
                    logger.error(f"Step {step.step_id} failed: {str(result)}")
                    step.status = "failed"
                    step.output_data = {"error": str(result)}
                else:
                    step_outputs[step.step_id] = result
                    execution_results[step.agent_role.value] = result
        
        return execution_results

    async def _execute_single_step(
        self, 
        step: ReasoningStep, 
        step_outputs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute a single reasoning step"""
        
        start_time = datetime.now()
        step.status = "in_progress"
        
        try:
            # Prepare input with dependencies
            enhanced_input = self._enhance_input_with_dependencies(
                step.input_data, step.dependencies, step_outputs
            )
            
            # Execute agent
            result = await self._execute_agent_analysis(step.agent_role, enhanced_input)
            
            # Update step
            step.output_data = result
            step.status = "completed"
            step.confidence_score = self._extract_confidence_score(result)
            step.execution_time = (datetime.now() - start_time).total_seconds()
            
            return result
            
        except Exception as e:
            step.status = "failed"
            step.execution_time = (datetime.now() - start_time).total_seconds()
            raise e

    async def _execute_agent_analysis(
        self, 
        agent_role: AgentRole, 
        input_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute analysis for specific agent"""
        
        agent = self.agents[agent_role]
        content = input_data.get("content", {})
        topics = input_data.get("topics", [])
        
        try:
            if agent_role == AgentRole.STRATEGIC_INTELLIGENCE:
                result = agent.ultra_analyze_content(content, topics)
                return asdict(result)
                
            elif agent_role == AgentRole.COMPETITIVE_INTELLIGENCE:
                result = agent.ultra_analyze_competitive_landscape(content, topics)
                return asdict(result)
                
            elif agent_role == AgentRole.RISK_ASSESSMENT:
                result = agent.ultra_assess_risks(content, topics)
                return asdict(result)
                
            elif agent_role == AgentRole.MARKET_PREDICTION:
                result = agent.ultra_predict_markets(content, topics)
                return asdict(result)
                
            elif agent_role == AgentRole.EXECUTIVE_DECISION:
                result = agent.ultra_executive_analysis(content, topics)
                return asdict(result)
                
            else:
                raise ValueError(f"Unknown agent role: {agent_role}")
                
        except Exception as e:
            logger.error(f"Agent {agent_role.value} analysis failed: {str(e)}")
            return {"error": str(e), "agent": agent_role.value}

    async def _synthesize_cross_agent_insights(
        self,
        execution_results: Dict[str, Any],
        topics: List[str],
        analysis_depth: AnalysisDepth
    ) -> Dict[str, Any]:
        """Synthesize insights across all executed agents"""
        
        logger.info("Synthesizing cross-agent insights")
        
        # Determine synthesis pattern based on available results
        if len(execution_results) >= 4:
            synthesis_pattern = "full_spectrum"
        elif "competitive_intelligence" in execution_results and "market_prediction" in execution_results:
            synthesis_pattern = "competitive_market"
        elif "risk_assessment" in execution_results and "market_prediction" in execution_results:
            synthesis_pattern = "risk_prediction"
        elif "strategic_intelligence" in execution_results and "competitive_intelligence" in execution_results:
            synthesis_pattern = "strategic_competitive"
        else:
            synthesis_pattern = "basic"
        
        # Apply synthesis pattern
        if synthesis_pattern in self.synthesis_patterns:
            synthesis_result = self.synthesis_patterns[synthesis_pattern](execution_results, topics)
        else:
            synthesis_result = self._basic_synthesis(execution_results, topics)
        
        return synthesis_result

    def _synthesize_full_spectrum(
        self, 
        execution_results: Dict[str, Any], 
        topics: List[str]
    ) -> Dict[str, Any]:
        """Full spectrum synthesis across all agents"""
        
        insights = []
        
        # Extract key insights from each agent
        strategic_insights = self._extract_strategic_insights(execution_results.get("strategic_intelligence"))
        competitive_insights = self._extract_competitive_insights(execution_results.get("competitive_intelligence"))
        risk_insights = self._extract_risk_insights(execution_results.get("risk_assessment"))
        market_insights = self._extract_market_insights(execution_results.get("market_prediction"))
        executive_insights = self._extract_executive_insights(execution_results.get("executive_decision"))
        
        # Cross-agent synthesis
        insights.extend([
            f"🧠 **Strategic-Competitive Synthesis**: {strategic_insights[0] if strategic_insights else 'Strategic analysis'} + {competitive_insights[0] if competitive_insights else 'Competitive analysis'}",
            f"⚖️ **Risk-Prediction Balance**: {risk_insights[0] if risk_insights else 'Risk assessment'} balanced with {market_insights[0] if market_insights else 'Market prediction'}",
            f"👥 **Executive Integration**: {executive_insights[0] if executive_insights else 'Executive recommendations'} synthesizes all strategic perspectives"
        ])
        
        # Topic-specific synthesis
        for topic in topics[:3]:
            topic_synthesis = self._synthesize_topic_across_agents(topic, execution_results)
            if topic_synthesis:
                insights.append(f"🎯 **{topic} Ultra-Analysis**: {topic_synthesis}")
        
        return {
            "insights": insights,
            "synthesis_type": "full_spectrum",
            "agent_count": len(execution_results),
            "confidence": self._calculate_synthesis_confidence(execution_results)
        }

    async def _generate_ultra_recommendations(
        self,
        synthesis_result: Dict[str, Any],
        execution_results: Dict[str, Any]
    ) -> List[str]:
        """Generate final ultra-thinking recommendations"""
        
        recommendations = []
        
        # Strategic recommendations from synthesis
        if synthesis_result.get("insights"):
            top_insight = synthesis_result["insights"][0]
            recommendations.append(f"🌟 **Ultra-Strategic Priority**: {top_insight}")
        
        # Cross-agent coordination recommendations
        if len(execution_results) >= 3:
            recommendations.append(
                "🔄 **Multi-Agent Coordination**: Implement continuous feedback loops between strategic, competitive, and risk analysis for dynamic decision-making"
            )
        
        # Confidence-based recommendations
        high_confidence_agents = [
            agent for agent, result in execution_results.items()
            if self._extract_confidence_score(result) > 0.8
        ]
        
        if high_confidence_agents:
            recommendations.append(
                f"✅ **High-Confidence Focus**: Prioritize insights from {', '.join(high_confidence_agents)} with >80% confidence"
            )
        
        # Synthesis strength recommendations
        if synthesis_result.get("confidence", 0) > 0.7:
            recommendations.append(
                "🎯 **Ultra-Thinking Advantage**: Leverage multi-agent synthesis for strategic advantage - confidence exceeds single-agent analysis"
            )
        
        return recommendations

    # Helper methods for orchestration
    def _create_sequential_steps(
        self, 
        agent_sequence: List[AgentRole], 
        content: Dict[str, Any], 
        topics: List[str]
    ) -> List[ReasoningStep]:
        """Create sequential reasoning steps"""
        
        steps = []
        
        for i, agent_role in enumerate(agent_sequence):
            dependencies = [f"step_{i-1}"] if i > 0 else []
            
            step = ReasoningStep(
                step_id=f"step_{i}",
                agent_role=agent_role,
                input_data={"content": content, "topics": topics},
                output_data=None,
                dependencies=dependencies,
                reasoning_context=f"Sequential analysis step {i+1}/{len(agent_sequence)}",
                confidence_score=0.0,
                execution_time=0.0,
                status="pending"
            )
            steps.append(step)
        
        return steps

    def _extract_confidence_score(self, result: Dict[str, Any]) -> float:
        """Extract confidence score from agent result"""
        if isinstance(result, dict):
            # Try various confidence field names
            confidence_fields = ["confidence_score", "synthesis_confidence", "overall_confidence"]
            for field in confidence_fields:
                if field in result:
                    return result[field]
        return 0.5  # Default confidence

    def _calculate_synthesis_confidence(self, execution_results: Dict[str, Any]) -> float:
        """Calculate overall synthesis confidence"""
        if not execution_results:
            return 0.3
        
        confidences = []
        for result in execution_results.values():
            confidence = self._extract_confidence_score(result)
            confidences.append(confidence)
        
        # Weighted average with bonus for multiple agents
        avg_confidence = sum(confidences) / len(confidences)
        multi_agent_bonus = min(len(confidences) * 0.05, 0.2)  # Up to 20% bonus
        
        return min(avg_confidence + multi_agent_bonus, 1.0)

    def _create_fallback_result(self, analysis_id: str) -> UltraThinkingResult:
        """Create fallback result when analysis fails"""
        return UltraThinkingResult(
            analysis_id=analysis_id,
            strategic_intelligence=None,
            competitive_intelligence=None,
            risk_assessment=None,
            market_prediction=None,
            executive_decision=None,
            cross_agent_insights=[
                "Ultra-thinking analysis requires additional data for comprehensive multi-agent reasoning",
                "Single-agent analysis available - multi-agent synthesis pending data enhancement"
            ],
            reasoning_chains=[],
            synthesis_confidence=0.3,
            ultra_recommendations=[
                "📊 **Data Enhancement**: Increase data quality and quantity for ultra-thinking capabilities",
                "🔧 **System Optimization**: Optimize agent coordination for improved reasoning chains"
            ],
            analysis_timestamp=datetime.now().isoformat()
        )

    # Additional placeholder methods for comprehensive orchestration
    def _enhance_input_with_dependencies(
        self, 
        base_input: Dict[str, Any], 
        dependencies: List[str], 
        step_outputs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Enhance input data with outputs from dependency steps"""
        enhanced_input = base_input.copy()
        
        # Add dependency outputs to input context
        dependency_context = {}
        for dep_id in dependencies:
            if dep_id in step_outputs:
                dependency_context[dep_id] = step_outputs[dep_id]
        
        if dependency_context:
            enhanced_input["dependency_context"] = dependency_context
        
        return enhanced_input

    def export_ultra_thinking_result(self, result: UltraThinkingResult) -> Dict[str, Any]:
        """Export ultra-thinking result in structured format"""
        return {
            "ultra_thinking_result": asdict(result),
            "export_metadata": {
                "orchestrator": self.orchestrator_name,
                "version": self.version,
                "export_timestamp": datetime.now().isoformat(),
                "synthesis_confidence": result.synthesis_confidence
            }
        }