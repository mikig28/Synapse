
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { newsService } from '../services/newsService';
import { 
    Bot, Newspaper, MessageSquare, Link, TrendingUp, 
    ThumbsUp, Star, List, CheckCircle, AlertTriangle, Info
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Define interfaces for the new report structure
interface ReportMetadata {
    topics_analyzed: string[];
    total_items_analyzed: number;
    sources_summary: Record<string, { status: string; items_found: number; }>;
}

interface TrendingTopic {
    topic: string;
    score: number;
}

interface SourceItem {
    title: string;
    url: string;
    content?: string;
    display_source?: string;
}

interface SourceResults {
    source_name: string;
    items: SourceItem[];
}

interface AiInsights {
    key_themes?: string[];
    sentiment_analysis?: string;
    emerging_trends?: string[];
    error?: string;
}

interface ReportStructure {
    success: boolean;
    metadata: ReportMetadata;
    executive_summary: string[];
    trending_topics: TrendingTopic[];
    source_specific_results: Record<string, SourceResults>;
    ai_insights: AiInsights;
    recommendations: string[];
}

const NewsPage: React.FC = () => {
    const [report, setReport] = useState<ReportStructure | null>(null);
    const [loading, setLoading] = useState(false);
    const [topics, setTopics] = useState('sports'); // Default to sports
    const { toast } = useToast();

    const fetchReport = async () => {
        if (!topics) {
            toast({ title: 'Topics are required', description: 'Please enter topics to search for.', variant: 'destructive' });
            return;
        }
        setLoading(true);
        setReport(null);
        try {
            const result = await newsService.gatherNewsReport({ topics: topics.split(',').map(t => t.trim()) });
            if (result.success) {
                setReport(result);
                toast({ title: 'Report Generated', description: `Analyzed ${result.metadata.total_items_analyzed} items.` });
            } else {
                throw new Error('Failed to generate report from backend.');
            }
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to fetch report', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    // Sub-components for rendering the report
    const renderMetadata = (metadata: ReportMetadata) => (
        <Card>
            <CardHeader>
                <CardTitle>Report Overview</CardTitle>
                <CardDescription>Analysis based on topics: {metadata.topics_analyzed.join(', ')}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-2xl font-bold">{metadata.total_items_analyzed}</p>
                    <p className="text-sm text-muted-foreground">Total Items Analyzed</p>
                </div>
                {Object.entries(metadata.sources_summary).map(([key, summary]) => (
                    <div key={key} className="p-4 bg-muted rounded-lg">
                        <p className="font-semibold">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                        <p className={`text-sm ${summary.status.includes('✅') ? 'text-green-500' : 'text-yellow-500'}`}>{summary.status}</p>
                        <p className="text-xs text-muted-foreground">Items found: {summary.items_found}</p>
                    </div>
                ))}
            </CardContent>
        </Card>
    );

    const renderExecutiveSummary = (summary: string[]) => (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center"><Info className="mr-2" /> Executive Summary</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="list-disc pl-5 space-y-2">
                    {summary.map((point, index) => <li key={index}>{point}</li>)}
                </ul>
            </CardContent>
        </Card>
    );

    const renderTrendingTopics = (topics: TrendingTopic[]) => (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center"><TrendingUp className="mr-2" /> Trending Topics</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
                {topics.map((topic, index) => (
                    <Badge key={index} variant="default" className="text-md">{topic.topic} (Score: {topic.score})</Badge>
                ))}
            </CardContent>
        </Card>
    );

    const renderSourceResults = (results: Record<string, SourceResults>) => (
        <Card>
            <CardHeader>
                <CardTitle>Source-Specific Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {Object.values(results).map((source, index) => (
                    <div key={index}>
                        <h3 className="text-lg font-semibold mb-2 flex items-center">
                            {source.source_name === 'Reddit Posts' ? <Bot className="mr-2" /> : <Newspaper className="mr-2"/>}
                            {source.source_name}
                        </h3>
                        <div className="pl-5 space-y-3">
                            {source.items.length > 0 ? source.items.map((item, itemIndex) => (
                                <div key={itemIndex} className="border-l-2 pl-4">
                                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-primary flex items-center">
                                        <Link className="w-4 h-4 mr-2" /> {item.title}
                                    </a>
                                    {item.display_source && <p className="text-xs text-muted-foreground">via {item.display_source}</p>}
                                </div>
                            )) : <p className="text-sm text-muted-foreground">No items found for this source.</p>}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );

    const renderAiInsights = (insights: AiInsights) => (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center"><Bot className="mr-2" /> AI Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {insights.error && <p className="text-red-500">{insights.error}</p>}
                {insights.key_themes && <p><strong>Key Themes:</strong> {insights.key_themes.join(', ')}</p>}
                {insights.sentiment_analysis && <p><strong>Sentiment:</strong> {insights.sentiment_analysis}</p>}
                {insights.emerging_trends && <p><strong>Emerging Trends:</strong> {insights.emerging_trends.join(', ')}</p>}
            </CardContent>
        </Card>
    );

    const renderRecommendations = (recommendations: string[]) => (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center"><ThumbsUp className="mr-2" /> Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="list-disc pl-5 space-y-2">
                    {recommendations.map((rec, index) => <li key={index}>{rec}</li>)}
                </ul>
            </CardContent>
        </Card>
    );

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-primary">AI News Agent Report</h1>
                    <p className="text-muted-foreground">Enter topics to generate a new intelligence report.</p>
                </div>

                <Card>
                    <CardContent className="p-6 flex flex-col md:flex-row items-center gap-4">
                        <Input 
                            type="text"
                            value={topics}
                            onChange={(e) => setTopics(e.target.value)}
                            placeholder="Enter topics, e.g., sports, AI, startups"
                            className="flex-grow"
                        />
                        <Button onClick={fetchReport} disabled={loading} className="w-full md:w-auto">
                            {loading ? 'Generating Report...' : 'Generate Report'}
                        </Button>
                    </CardContent>
                </Card>

                {loading && (
                    <div className="text-center p-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-4 text-muted-foreground">The AI agents are at work... this may take a moment.</p>
                    </div>
                )}

                {report && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        {report.metadata && renderMetadata(report.metadata)}
                        {report.executive_summary && renderExecutiveSummary(report.executive_summary)}
                        {report.trending_topics && renderTrendingTopics(report.trending_topics)}
                        {report.source_specific_results && renderSourceResults(report.source_specific_results)}
                        {report.ai_insights && renderAiInsights(report.ai_insights)}
                        {report.recommendations && renderRecommendations(report.recommendations)}
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default NewsPage;
