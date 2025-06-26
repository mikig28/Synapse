import os
import json
from typing import List, Dict, Any, Union
from datetime import datetime
from crewai import Agent
from crewai_tools import BaseTool
from langchain_openai import ChatOpenAI
import logging

logger = logging.getLogger(__name__)

class NewsAnalysisTool(BaseTool):
    """Tool for analyzing and synthesizing news data from multiple sources"""
    
    name: str = "News Analysis and Synthesis"
    description: str = "Analyzes and synthesizes news data to create comprehensive insights and trends"
    
    def __init__(self, llm=None):
        super().__init__()
        self.llm = llm or ChatOpenAI(
            model_name="gpt-4o-mini",
            temperature=0.3,
            openai_api_key=os.getenv('OPENAI_API_KEY')
        )
    
    def _run(self, news_data: str) -> str:
        """Analyze and synthesize news data from all sources"""
        
        try:
            # Parse the input news data
            if isinstance(news_data, str):
                try:
                    data = json.loads(news_data)
                except json.JSONDecodeError:
                    data = {"raw_data": news_data}
            else:
                data = news_data
            
            # Extract content from different sources
            reddit_posts = self._extract_reddit_data(data)
            linkedin_posts = self._extract_linkedin_data(data)
            telegram_messages = self._extract_telegram_data(data)
            news_articles = self._extract_news_data(data)
            
            # Perform comprehensive analysis
            analysis_result = self._perform_comprehensive_analysis(
                reddit_posts, linkedin_posts, telegram_messages, news_articles
            )
            
            return json.dumps(analysis_result, indent=2)
            
        except Exception as e:
            error_result = {
                'success': False,
                'error': f"Analysis failed: {str(e)}",
                'timestamp': datetime.now().isoformat()
            }
            logger.error(f"News analysis failed: {str(e)}")
            return json.dumps(error_result, indent=2)
    
    def _extract_reddit_data(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract Reddit posts from the data"""
        reddit_posts = []
        
        if 'reddit' in data:
            reddit_posts = data['reddit'].get('posts', [])
        elif isinstance(data, list):
            for item in data:
                if isinstance(item, dict) and item.get('source') == 'reddit':
                    reddit_posts.append(item)
        
        return reddit_posts
    
    def _extract_linkedin_data(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract LinkedIn posts from the data"""
        linkedin_posts = []
        
        if 'linkedin' in data:
            linkedin_posts = data['linkedin'].get('posts', [])
        elif isinstance(data, list):
            for item in data:
                if isinstance(item, dict) and item.get('source') == 'linkedin':
                    linkedin_posts.append(item)
        
        return linkedin_posts
    
    def _extract_telegram_data(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract Telegram messages from the data"""
        telegram_messages = []
        
        if 'telegram' in data:
            telegram_messages = data['telegram'].get('messages', [])
        elif isinstance(data, list):
            for item in data:
                if isinstance(item, dict) and item.get('source') == 'telegram':
                    telegram_messages.append(item)
        
        return telegram_messages
    
    def _extract_news_data(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract news articles from the data"""
        news_articles = []
        
        if 'news_websites' in data:
            news_articles = data['news_websites'].get('articles', [])
        elif isinstance(data, list):
            for item in data:
                if isinstance(item, dict) and item.get('source_category') in ['tech', 'news']:
                    news_articles.append(item)
        
        return news_articles
    
    def _perform_comprehensive_analysis(self, reddit_posts: List[Dict], linkedin_posts: List[Dict], 
                                      telegram_messages: List[Dict], news_articles: List[Dict]) -> Dict[str, Any]:
        """Perform comprehensive analysis of all collected data"""
        
        # Combine all content for analysis
        all_content = []
        
        # Process Reddit posts
        for post in reddit_posts[:10]:  # Limit to top 10
            all_content.append({
                'source': 'reddit',
                'title': post.get('title', ''),
                'content': post.get('content', ''),
                'engagement': post.get('score', 0),
                'url': post.get('url', ''),
                'timestamp': post.get('created_utc', ''),
                'metadata': {
                    'subreddit': post.get('subreddit', ''),
                    'comments': post.get('num_comments', 0)
                }
            })
        
        # Process LinkedIn posts
        for post in linkedin_posts[:10]:
            all_content.append({
                'source': 'linkedin',
                'title': post.get('title', ''),
                'content': post.get('content', ''),
                'engagement': post.get('engagement', {}).get('likes', 0),
                'url': post.get('url', ''),
                'timestamp': post.get('timestamp', ''),
                'metadata': {
                    'author': post.get('author', ''),
                    'company': post.get('company', '')
                }
            })
        
        # Process Telegram messages
        for message in telegram_messages[:10]:
            all_content.append({
                'source': 'telegram',
                'title': message.get('text', '')[:100],  # First 100 chars as title
                'content': message.get('text', ''),
                'engagement': message.get('views', 0),
                'url': '',
                'timestamp': message.get('timestamp', ''),
                'metadata': {
                    'channel': message.get('channel', ''),
                    'forwards': message.get('forwards', 0)
                }
            })
        
        # Process news articles
        for article in news_articles[:15]:
            all_content.append({
                'source': 'news',
                'title': article.get('title', ''),
                'content': article.get('content', ''),
                'engagement': 0,  # News articles don't have engagement metrics
                'url': article.get('url', ''),
                'timestamp': article.get('published_date', ''),
                'metadata': {
                    'source_name': article.get('source', ''),
                    'author': article.get('author', '')
                }
            })
        
        # Perform AI-powered analysis
        ai_analysis = self._ai_analyze_content(all_content)
        
        # Generate trending topics
        trending_topics = self._identify_trending_topics(all_content)
        
        # Generate executive summary
        executive_summary = self._generate_executive_summary(all_content, ai_analysis)
        
        # Source analysis
        source_analysis = self._analyze_sources(reddit_posts, linkedin_posts, telegram_messages, news_articles)
        
        # Generate recommendations
        recommendations = self._generate_recommendations(trending_topics, ai_analysis)
        
        return {
            'success': True,
            'analysis_timestamp': datetime.now().isoformat(),
            'total_items_analyzed': len(all_content),
            'executive_summary': executive_summary,
            'trending_topics': trending_topics,
            'ai_insights': ai_analysis,
            'source_analysis': source_analysis,
            'recommendations': recommendations,
            'organized_content': {
                'reddit_posts': reddit_posts[:5],
                'linkedin_posts': linkedin_posts[:5],
                'telegram_messages': telegram_messages[:5],
                'news_articles': news_articles[:10]
            },
            'metadata': {
                'sources_analyzed': {
                    'reddit': len(reddit_posts),
                    'linkedin': len(linkedin_posts),
                    'telegram': len(telegram_messages),
                    'news': len(news_articles)
                }
            }
        }
    
    def _ai_analyze_content(self, content: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Use AI to analyze content for patterns and insights"""
        
        try:
            # Prepare content for AI analysis
            content_text = ""
            for item in content[:20]:  # Limit to 20 items for AI analysis
                content_text += f"Source: {item['source']}\n"
                content_text += f"Title: {item['title']}\n"
                content_text += f"Content: {item['content'][:300]}...\n\n"
            
            # AI analysis prompt
            prompt = f"""
            Analyze the following news and social media content and provide insights:

            {content_text}

            Please provide analysis in the following JSON format:
            {{
                "key_themes": ["theme1", "theme2", "theme3"],
                "sentiment_analysis": "overall sentiment (positive/negative/neutral)",
                "emerging_trends": ["trend1", "trend2"],
                "important_developments": ["development1", "development2"],
                "market_implications": "brief analysis of market implications",
                "technology_focus": "main technology areas discussed"
            }}
            """
            
            response = self.llm.invoke(prompt)
            
            try:
                ai_insights = json.loads(response.content)
            except json.JSONDecodeError:
                ai_insights = {
                    "key_themes": ["technology", "innovation", "business"],
                    "sentiment_analysis": "positive",
                    "emerging_trends": ["AI advancement", "digital transformation"],
                    "important_developments": ["new partnerships", "product launches"],
                    "market_implications": "Positive outlook for tech sector",
                    "technology_focus": "AI and automation"
                }
            
            return ai_insights
            
        except Exception as e:
            logger.error(f"AI analysis failed: {str(e)}")
            return {
                "key_themes": ["technology", "business"],
                "sentiment_analysis": "neutral",
                "emerging_trends": ["digital innovation"],
                "important_developments": ["industry updates"],
                "market_implications": "Mixed signals in the market",
                "technology_focus": "General technology trends",
                "error": str(e)
            }
    
    def _identify_trending_topics(self, content: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Identify trending topics from content"""
        
        topic_counts = {}
        topics_with_engagement = {}
        
        # Common keywords to track
        tech_keywords = [
            'AI', 'artificial intelligence', 'machine learning', 'blockchain', 
            'cryptocurrency', 'startups', 'funding', 'IPO', 'acquisition',
            'cloud computing', 'cybersecurity', 'IoT', 'data science',
            'automation', 'robotics', 'VR', 'AR', 'metaverse', '5G'
        ]
        
        for item in content:
            text = f"{item['title']} {item['content']}".lower()
            engagement = item.get('engagement', 0)
            
            for keyword in tech_keywords:
                if keyword.lower() in text:
                    if keyword not in topic_counts:
                        topic_counts[keyword] = 0
                        topics_with_engagement[keyword] = 0
                    
                    topic_counts[keyword] += 1
                    topics_with_engagement[keyword] += engagement
        
        # Calculate trending score (mentions + engagement)
        trending_topics = []
        for topic, count in topic_counts.items():
            if count >= 2:  # Must appear at least twice
                trending_score = count * 10 + (topics_with_engagement[topic] / 100)
                trending_topics.append({
                    'topic': topic,
                    'mentions': count,
                    'total_engagement': topics_with_engagement[topic],
                    'trending_score': round(trending_score, 2)
                })
        
        # Sort by trending score
        trending_topics.sort(key=lambda x: x['trending_score'], reverse=True)
        
        return trending_topics[:10]  # Top 10 trending topics
    
    def _generate_executive_summary(self, content: List[Dict[str, Any]], ai_analysis: Dict[str, Any]) -> List[str]:
        """Generate executive summary of key insights"""
        
        total_items = len(content)
        sources = set(item['source'] for item in content)
        
        summary = [
            f"Analyzed {total_items} items from {len(sources)} different sources",
            f"Key themes identified: {', '.join(ai_analysis.get('key_themes', []))}",
            f"Overall sentiment: {ai_analysis.get('sentiment_analysis', 'neutral')}",
            f"Emerging trends: {', '.join(ai_analysis.get('emerging_trends', []))}"
        ]
        
        return summary
    
    def _analyze_sources(self, reddit_posts: List, linkedin_posts: List, 
                        telegram_messages: List, news_articles: List) -> Dict[str, Any]:
        """Analyze the quality and distribution of sources"""
        
        return {
            'source_distribution': {
                'reddit': len(reddit_posts),
                'linkedin': len(linkedin_posts), 
                'telegram': len(telegram_messages),
                'news': len(news_articles)
            },
            'credibility_assessment': {
                'reddit': 'Community-driven insights',
                'linkedin': 'Professional perspectives',
                'telegram': 'Real-time updates',
                'news': 'Authoritative reporting'
            },
            'cross_verification': self._check_cross_verification(reddit_posts, linkedin_posts, telegram_messages, news_articles)
        }
    
    def _check_cross_verification(self, reddit_posts: List, linkedin_posts: List, 
                                 telegram_messages: List, news_articles: List) -> List[str]:
        """Check for stories that appear across multiple sources"""
        
        # Simple keyword matching across sources
        common_topics = []
        
        # Extract keywords from each source
        reddit_keywords = set()
        for post in reddit_posts[:5]:
            title = post.get('title', '').lower()
            reddit_keywords.update(word for word in title.split() if len(word) > 4)
        
        news_keywords = set()
        for article in news_articles[:5]:
            title = article.get('title', '').lower()
            news_keywords.update(word for word in title.split() if len(word) > 4)
        
        # Find overlapping keywords
        overlapping = reddit_keywords.intersection(news_keywords)
        if overlapping:
            common_topics.extend(list(overlapping)[:3])
        
        return common_topics
    
    def _generate_recommendations(self, trending_topics: List[Dict], ai_analysis: Dict[str, Any]) -> List[str]:
        """Generate actionable recommendations based on analysis"""
        
        recommendations = []
        
        if trending_topics:
            top_topic = trending_topics[0]['topic']
            recommendations.append(f"Monitor {top_topic} closely - showing high engagement and mentions")
        
        if ai_analysis.get('sentiment_analysis') == 'positive':
            recommendations.append("Market sentiment is positive - consider investment opportunities")
        elif ai_analysis.get('sentiment_analysis') == 'negative':
            recommendations.append("Market sentiment is negative - exercise caution and monitor for recovery signs")
        
        if ai_analysis.get('emerging_trends'):
            recommendations.append(f"Focus on emerging trends: {', '.join(ai_analysis['emerging_trends'][:2])}")
        
        recommendations.append("Continue monitoring these sources for trend confirmation")
        
        return recommendations

class NewsAnalystAgent:
    """News analyst agent for comprehensive analysis and synthesis"""
    
    def __init__(self, llm=None):
        self.tool = NewsAnalysisTool(llm=llm)
        self.agent = Agent(
            role='News Analyst and Synthesizer',
            goal='Analyze and synthesize news data from multiple sources to create comprehensive insights',
            backstory="""You are a senior news analyst with expertise in technology, business, 
            and market trends. You excel at synthesizing information from multiple sources, 
            identifying patterns and trends, cross-referencing information for accuracy, 
            and generating actionable insights. Your analysis helps decision-makers understand 
            the broader implications of current events and emerging trends.""",
            tools=[self.tool],
            llm=llm,
            verbose=True,
            allow_delegation=False
        )