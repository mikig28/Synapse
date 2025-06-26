import os
import json
import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Any
from datetime import datetime
from crewai import Agent
from crewai_tools import BaseTool
import logging

# Attempt to import telegram library, but don't make it a hard requirement
try:
    from telegram import Bot
    from telegram.error import TelegramError
    TELEGRAM_AVAILABLE = True
except ImportError:
    TELEGRAM_AVAILABLE = False
    Bot = None
    TelegramError = None

logger = logging.getLogger(__name__)

class TelegramMonitorTool(BaseTool):
    name: str = "Telegram Public Channel Scraper"
    description: str = "Scrapes public Telegram channels for messages related to specific topics."

    def __init__(self):
        super().__init__()
        self.bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
        self.bot = None
        if TELEGRAM_AVAILABLE and self.bot_token:
            try:
                self.bot = Bot(token=self.bot_token)
                logger.info("Telegram bot initialized for channel verification.")
            except Exception as e:
                logger.warning(f"Failed to initialize Telegram bot, proceeding without verification: {e}")

    def _run(self, topics: str, channels: str = None) -> str:
        topics_list = [topic.strip().lower() for topic in topics.split(',')]
        
        # If no channels are provided, select some based on topics
        if not channels:
            target_channels = self._get_default_channels(topics_list)
        else:
            target_channels = [ch.strip() for ch in channels.split(',')]

        logger.info(f"Scraping Telegram channels {target_channels} for topics: {topics_list}")

        all_messages = []
        for channel_name in target_channels:
            # 1. Verify channel existence with Bot API if possible
            if self.bot:
                try:
                    self.bot.get_chat(chat_id=channel_name)
                    logger.info(f"Successfully verified channel: {channel_name}")
                except TelegramError as e:
                    logger.warning(f"Cannot verify channel {channel_name}: {e}. It may be private, non-existent, or the bot is blocked. Skipping.")
                    continue
            
            # 2. Scrape the public web view of the channel
            try:
                messages = self._scrape_telegram_web_channel(channel_name, topics_list)
                if messages:
                    all_messages.extend(messages)
                    logger.info(f"Found {len(messages)} relevant messages in {channel_name}.")
            except Exception as e:
                logger.error(f"Failed to scrape channel {channel_name}: {e}")

        if not all_messages:
            return json.dumps({
                'success': False,
                'source': 'telegram',
                'error': 'No relevant messages found in the specified Telegram channels.',
                'articles': []
            })

        return json.dumps({
            'success': True,
            'source': 'telegram',
            'note': 'Content was scraped from the public web view of Telegram channels.',
            'articles': all_messages
        }, indent=2)

    def _get_default_channels(self, topics: List[str]) -> List[str]:
        """Provides default channels if none are specified by the user."""
        channel_map = {
            'sport': ['@espn', '@skysports'],
            'ai': ['@artificialintelligenceinc', '@AI_News_Feed'],
            'technology': ['@TechCrunch', '@verge'],
            'news': ['@Reuters', '@BBCNews']
        }
        defaults = []
        for topic in topics:
            for keyword, channels in channel_map.items():
                if keyword in topic:
                    defaults.extend(channels)
        return list(set(defaults)) or ['@Reuters'] # Return unique channels or a default

    def _scrape_telegram_web_channel(self, channel_name: str, topics: List[str]) -> List[Dict[str, Any]]:
        """Scrapes the t.me/s/ public web view of a channel."""
        messages = []
        channel_username = channel_name.replace('@', '')
        url = f"https://t.me/s/{channel_username}"
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, headers=headers)
        response.raise_for_status() # Will raise an exception for non-200 status

        soup = BeautifulSoup(response.text, 'html.parser')
        message_elements = soup.find_all('div', class_='tgme_widget_message_text')

        for element in message_elements:
            text = element.get_text(strip=True).lower()
            if any(topic in text for topic in topics):
                # Find the parent message container to get date and link
                message_container = element.find_parent('div', class_='tgme_widget_message')
                date_tag = message_container.find('time')
                link_tag = message_container.find('a', class_='tgme_widget_message_date')

                messages.append({
                    'source': f'telegram_web_scrape ({channel_name})',
                    'title': element.get_text(strip=True)[:100] + '...' if len(element.get_text(strip=True)) > 100 else element.get_text(strip=True),
                    'url': link_tag['href'] if link_tag else url,
                    'content': element.get_text(strip=True),
                    'published_date': date_tag['datetime'] if date_tag else datetime.now().isoformat()
                })
        return messages

class TelegramMonitorAgent:
    """Agent that scrapes public Telegram channels for relevant information."""

    def __init__(self, llm=None):
        self.tool = TelegramMonitorTool()
        self.agent = Agent(
            role='Public Telegram Channel Monitor',
            goal='Scrape public Telegram web pages to find messages relevant to given topics.',
            backstory=(
                "You are a specialist in gathering information from public Telegram channels. "
                "You know that the Bot API has limitations, so you use a robust method of scraping the public web view of channels (t.me/s/) "
                "to find the latest posts. You are an expert at parsing this content and extracting messages that are directly relevant to the user\'s topics of interest."
            ),
            tools=[self.tool],
            llm=llm,
            verbose=True,
            allow_delegation=False
        )
