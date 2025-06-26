

import os
import json
import re
from typing import List, Dict, Any
from collections import Counter
from datetime import datetime
from crewai import Agent
from crewai_tools import BaseTool
from langchain_openai import ChatOpenAI
import logging

logger = logging.getLogger(__name__)

# A set of common English stop words
STOP_WORDS = set([
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't", "as", "at",
    "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can't", "cannot", "could",
    "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during", "each", "few", "for",
    "from", "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's",
    "her", "here", "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm",
    "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't",
    "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours",
    "ourselves", "out", "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't",
    "so", "some", "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then", "there",
    "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", "those", "through", "to", "too",
    "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were", "weren't",
    "what", "what's", "when", "when's", "where", "where's", "which", "while", "who", "who's", "whom", "why", "why's",
    "with", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours", "yourself",
    "yourselves", "news", "latest", "trending"
])

class NewsAnalysisTool(BaseTool):
    name: str = "News Analysis and Synthesis"
    description: str = "Analyzes and synthesizes news data to create comprehensive insights and trends"

    def __init__(self, llm=None):
        super().__init__()
        self.llm = llm or ChatOpenAI(
            model_name=os.getenv("OPENAI_MODEL_NAME", "gpt-4o-mini"),
            temperature=0.2,
            openai_api_key=os.getenv('OPENAI_API_KEY')
        )

    def _run(self, news_data: str, topics: str = None) -> str:
        try:
            data = json.loads(news_data)
            topics_list = topics.split(',') if topics else []

            # Process data from each source
            processed_data = self._process_sources(data)

            # Perform comprehensive analysis
            analysis_result = self._perform_comprehensive_analysis(processed_data, topics_list)

            return json.dumps(analysis_result, indent=2)

        except Exception as e:
            logger.error(f"News analysis failed: {e}", exc_info=True)
            return json.dumps({'success': False, 'error': f"Analysis failed: {str(e)}"})

    def _process_sources(self, data: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
        """Standardize data from different sources into a consistent format."""
        processed = {}
        source_mapping = {
            'reddit': 'reddit_posts',
            'linkedin': 'linkedin_posts',
            'telegram': 'telegram_messages',
            'news_websites': 'news_articles'
        }

        for key, source_name in source_mapping.items():
            source_data = data.get(key, {})
            items = source_data.get('posts') or source_data.get('messages') or source_data.get('articles', [])
            
            # Basic validation to ensure items is a list of dicts
            if isinstance(items, list) and all(isinstance(i, dict) for i in items):
                processed[source_name] = {
                    "source_name": source_data.get('source', key).replace('_', ' ').title(),
                    "items": items,
                    "status": self._get_source_status(source_data)
                }
            else:
                 processed[source_name] = {
                    "source_name": key.replace('_', ' ').title(),
                    "items": [],
                    "status": "❌ No items received or invalid format"
                }
        return processed

    def _get_source_status(self, source_data: Dict[str, Any]) -> str:
        """Determine the status of the data source."""
        if not source_data.get('success', False):
            return f"❌ Failed: {source_data.get('error', 'Unknown error')}"
        if not source_data.get('posts') and not source_data.get('messages') and not source_data.get('articles'):
            return "⚠️ No items found"
        if any('simulated' in str(val).lower() for val in source_data.values()):
             return "⚠️ Simulated items"
        if any('rss' in str(val).lower() or 'alternative' in str(val).lower() for val in source_data.values()):
            return "⚠️ RSS Fallback"
        return "✅ Real items"

    def _perform_comprehensive_analysis(self, processed_data: Dict[str, Any], topics_list: List[str]) -> Dict[str, Any]:
        """Perform comprehensive analysis of all collected data."""
        all_items = [item for source in processed_data.values() for item in source.get('items', [])]

        # Generate trending topics dynamically
        trending_topics = self._identify_trending_topics(all_items, topics_list)

        # Generate executive summary using AI
        executive_summary = self._generate_executive_summary(all_items, trending_topics, topics_list)
        
        # Get AI insights
        ai_insights = self._ai_analyze_content(all_items, topics_list)

        # Generate recommendations
        recommendations = self._generate_recommendations(trending_topics, ai_insights)

        # Create the final structured report
        report = {
            'success': True,
            'analysis_timestamp': datetime.now().isoformat(),
            'metadata': {
                'topics_analyzed': topics_list,
                'total_items_analyzed': len(all_items),
                'sources_summary': {k: {"status": v['status'], "items_found": len(v['items'])} for k, v in processed_data.items()}
            },
            'executive_summary': executive_summary,
            'trending_topics': trending_topics,
            'source_specific_results': {k: {"source_name": v['source_name'], "items": v['items'][:10]} for k, v in processed_data.items()},
            'ai_insights': ai_insights,
            'recommendations': recommendations
        }
        return report

    def _identify_trending_topics(self, all_items: List[Dict[str, Any]], topics_list: List[str]) -> List[Dict[str, Any]]:
        """Identify trending topics from content dynamically."""
        text_corpus = " ".join(item.get('title', '') for item in all_items).lower()
        
        # Remove punctuation and extra spaces
        text_corpus = re.sub(r'[^\w\s]', '', text_corpus)
        words = text_corpus.split()

        # Filter out stop words and the original topics
        filtered_words = [word for word in words if word not in STOP_WORDS and word not in topics_list and len(word) > 3]

        # Get the most common words/phrases (bi-grams and tri-grams)
        bi_grams = [" ".join(grams) for grams in zip(filtered_words, filtered_words[1:])]
        tri_grams = [" ".join(grams) for grams in zip(filtered_words, filtered_words[1:], filtered_words[2:])]
        
        word_counts = Counter(filtered_words)
        bi_gram_counts = Counter(bi_grams)
        tri_gram_counts = Counter(tri_grams)

        # Combine and score topics
        trending = {}
        for word, count in word_counts.most_common(10):
            trending[word] = trending.get(word, 0) + count
        for phrase, count in bi_gram_counts.most_common(10):
            trending[phrase] = trending.get(phrase, 0) + count * 1.5 # Give more weight to phrases
        for phrase, count in tri_gram_counts.most_common(5):
            trending[phrase] = trending.get(phrase, 0) + count * 2.0

        # Format for output
        sorted_trending = sorted(trending.items(), key=lambda x: x[1], reverse=True)
        
        return [{"topic": topic, "score": round(score, 2)} for topic, score in sorted_trending[:7]]

    def _generate_executive_summary(self, all_items: List[Dict[str, Any]], trending_topics: List[Dict[str, Any]], topics_list: List[str]) -> List[str]:
        """Generate executive summary of key insights using an LLM."""
        if not all_items:
            return ["No content was found to generate a summary."]

        content_preview = ""
        for item in all_items[:15]: # Use a sample of items
            content_preview += f"- {item.get('title', 'No Title')}\n"

        prompt = f"""
        Based on the following list of item titles and trending topics, please generate a concise, professional executive summary (3-4 bullet points).
        The summary should highlight the main findings and the most significant trends for the general topic of '{', '.join(topics_list)}'.

        Item Titles:
        {content_preview}

        Trending Topics:
        {json.dumps(trending_topics)}

        Generate the executive summary as a JSON array of strings. For example:
        ["First bullet point.", "Second bullet point."]
        """
        try:
            response = self.llm.invoke(prompt)
            summary = json.loads(response.content)
            if isinstance(summary, list):
                return summary
            return ["Failed to generate a valid summary."]
        except Exception as e:
            logger.error(f"Failed to generate executive summary: {e}")
            return ["AI summary generation failed. Key trends appear to be around " + ", ".join(t['topic'] for t in trending_topics[:2]) + "."]

    def _ai_analyze_content(self, all_items: List[Dict[str, Any]], topics_list: List[str]) -> Dict[str, Any]:
        """Use AI to analyze content for patterns and insights."""
        if not all_items:
            return {}

        content_text = ""
        for item in all_items[:20]:  # Limit to 20 items for AI analysis
            content_text += f"Title: {item.get('title', '')}\\n"
        
        prompt = f"""
        Analyze the following news and social media content related to '{', '.join(topics_list)}' and provide insights.
        Content Titles:
        {content_text}

        Please provide analysis in the following JSON format:
        {{
            "key_themes": ["theme1", "theme2", "theme3"],
            "sentiment_analysis": "overall sentiment (e.g., 'Positive', 'Negative', 'Neutral', 'Mixed')",
            "emerging_trends": ["trend1", "trend2"]
        }}
        """
        try:
            response = self.llm.invoke(prompt)
            return json.loads(response.content)
        except Exception as e:
            logger.error(f"AI analysis failed: {e}")
            return {"error": "AI analysis failed to generate insights."}

    def _generate_recommendations(self, trending_topics: List[Dict], ai_analysis: Dict[str, Any]) -> List[str]:
        """Generate actionable recommendations based on analysis."""
        recommendations = []
        if not trending_topics and not ai_analysis:
            return ["No data available to generate recommendations."]

        if trending_topics:
            top_topic = trending_topics[0]['topic']
            recommendations.append(f"Monitor '{top_topic}' closely, as it shows the highest engagement and mentions.")
        
        sentiment = ai_analysis.get('sentiment_analysis', 'neutral').lower()
        if sentiment == 'positive':
            recommendations.append("Overall sentiment is positive, suggesting favorable conditions or reception in this area.")
        elif sentiment == 'negative':
            recommendations.append("Overall sentiment is negative; exercise caution and monitor for underlying issues.")

        if ai_analysis.get('emerging_trends'):
            recommendations.append(f"Focus on emerging trends: {', '.join(ai_analysis['emerging_trends'][:2])}.")
        
        recommendations.append("Cross-reference findings with primary news sources for deeper insights.")
        return recommendations

class NewsAnalystAgent:
    """News analyst agent for comprehensive analysis and synthesis"""

    def __init__(self, llm=None):
        self.tool = NewsAnalysisTool(llm=llm)
        self.agent = Agent(
            role='Principal News Analyst and Strategist',
            goal='Transform raw news data from multiple sources into a structured, insightful, and actionable intelligence report.',
            backstory=(
                "You are a top-tier news analyst, renowned for your ability to cut through the noise. "
                "You synthesize disparate information from news articles, social media, and professional networks "
                "into a coherent, easy-to-digest report. Your insights are trusted by decision-makers to "
                "understand market trends, public sentiment, and emerging opportunities."
            ),
            tools=[self.tool],
            llm=llm,
            verbose=True,
            allow_delegation=False
        )
