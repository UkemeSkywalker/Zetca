"""
Mock Strategist Agent for testing and development.

This module provides a mock implementation of the Strategist Agent that returns
hardcoded strategy data without calling external AI services. Useful for:
- Testing the API endpoints and data flow
- Frontend development without AWS dependencies
- Verifying the complete request/response cycle
"""

import asyncio
from typing import Optional
from models.strategy import StrategyInput, StrategyOutput, PlatformRecommendation


class MockStrategistAgent:
    """
    Mock implementation of the Strategist Agent.
    
    Returns realistic hardcoded strategy data with a simulated delay
    to mimic the behavior of a real AI agent call.
    """
    
    async def generate_strategy(self, strategy_input: StrategyInput) -> StrategyOutput:
        """
        Generate a mock social media strategy.
        
        Args:
            strategy_input: The brand information and goals
            
        Returns:
            StrategyOutput: A hardcoded strategy with realistic sample data
            
        Note:
            Includes a 1-second delay to simulate API call latency
        """
        # Simulate API call delay
        await asyncio.sleep(1)
        
        # Return hardcoded strategy with realistic B2B SaaS example
        return StrategyOutput(
            content_pillars=[
                "Thought Leadership & Industry Insights",
                "Product Innovation & Features",
                "Customer Success Stories",
                "Educational Content & Best Practices",
                "Company Culture & Behind-the-Scenes"
            ],
            posting_schedule=(
                "Post 3-4 times per week on LinkedIn and Twitter. "
                "Optimal times: Tuesday-Thursday, 9-11 AM and 2-4 PM EST. "
                "Reserve Fridays for community engagement and responding to comments."
            ),
            platform_recommendations=[
                PlatformRecommendation(
                    platform="LinkedIn",
                    rationale=(
                        "Primary platform for B2B decision makers. "
                        "Highest engagement rates for professional content and thought leadership. "
                        "Ideal for reaching executives and managers in target industries."
                    ),
                    priority="high"
                ),
                PlatformRecommendation(
                    platform="Twitter",
                    rationale=(
                        "Real-time engagement with tech community and industry influencers. "
                        "Great for sharing quick insights, participating in trending conversations, "
                        "and building brand personality."
                    ),
                    priority="high"
                ),
                PlatformRecommendation(
                    platform="YouTube",
                    rationale=(
                        "Long-form content for product demos, tutorials, and webinar recordings. "
                        "Strong SEO benefits and evergreen content value. "
                        "Secondary platform for deeper engagement."
                    ),
                    priority="medium"
                )
            ],
            content_themes=[
                "Industry trend analysis and market insights",
                "Product feature deep-dives and use case tutorials",
                "Customer success stories and case studies",
                "Team spotlights and company culture highlights",
                "Tips and best practices for target audience pain points",
                "Live Q&A sessions and webinar announcements",
                "Infographics on industry statistics and benchmarks"
            ],
            engagement_tactics=[
                "Host monthly LinkedIn Live Q&A sessions with product experts",
                "Respond to all comments and mentions within 2 hours during business hours",
                "Create polls and surveys to gather audience insights and spark conversations",
                "Share and comment on customer posts that mention the brand",
                "Participate in relevant industry hashtags and Twitter chats weekly",
                "Feature user-generated content and customer testimonials regularly"
            ],
            visual_prompts=[
                (
                    "Professional office workspace with diverse team of 3-4 people collaborating "
                    "around a modern conference table with laptops and digital screens, "
                    "bright natural lighting, clean contemporary design, conveying innovation "
                    "and teamwork in a B2B tech environment"
                ),
                (
                    "Modern SaaS dashboard interface displayed on a sleek laptop screen, "
                    "showing colorful data visualizations and analytics charts, "
                    "minimalist desk setup with coffee cup and notepad, "
                    "professional yet approachable aesthetic for product showcase content"
                ),
                (
                    "Happy business professional smiling while looking at laptop screen, "
                    "office background slightly blurred, natural expression of success and satisfaction, "
                    "suitable for customer testimonial and success story content"
                )
            ]
        )
