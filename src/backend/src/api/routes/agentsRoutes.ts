import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { trackAgentExecution, rateLimitByUsage } from '../../middleware/usageTracking';
import {
  getAgents,
  getAgentById,
  createAgent,
  updateAgent,
  deleteAgent,
  executeAgent,
  getAgentRuns,
  getUserAgentRuns,
  getAgentStatistics,
  pauseAgent,
  resumeAgent,
  getSchedulerStatus,
  getBuiltinTools,
  testMCPConnection,
  getAgentCapabilities,
  getMCPRecommendations,
  testCrewAISources,
  getEnvironmentDebug,
  getAgentStatus,
  resetAgentStatus,
  getCrewProgress,
  getHealthStatus,
} from '../controllers/agentsController';
import AgentRun from '../../models/AgentRun';

const router = express.Router();

// Health check endpoint (no auth required)
router.get('/health', getHealthStatus);

// Debug endpoint (no auth required for testing)
router.get('/debug/environment', getEnvironmentDebug);

// All other routes require authentication
router.use(authMiddleware);

// Tools and capabilities endpoints
router.get('/builtin-tools', getBuiltinTools);
router.post('/test-mcp', testMCPConnection);
router.get('/mcp-recommendations/:agentType', getMCPRecommendations);

// Agent CRUD operations
router.get('/', getAgents);
router.get('/runs', getUserAgentRuns); // Get all runs for user (must be before /:agentId routes)
router.get('/scheduler/status', getSchedulerStatus); // Get scheduler status
router.post('/', createAgent);

router.get('/:agentId', getAgentById);
router.put('/:agentId', updateAgent);
router.delete('/:agentId', deleteAgent);

// Agent execution and control
router.get('/:agentId/status', getAgentStatus);
router.post('/:agentId/reset-status', resetAgentStatus);
router.get('/:agentId/crew-progress', getCrewProgress);
router.post('/:agentId/execute', rateLimitByUsage('agent'), trackAgentExecution, executeAgent);
router.post('/:agentId/pause', pauseAgent);
router.post('/:agentId/resume', resumeAgent);

// Agent runs and statistics
router.get('/:agentId/runs', getAgentRuns);
router.get('/:agentId/statistics', getAgentStatistics);
router.get('/:agentId/capabilities', getAgentCapabilities);

// Debug and testing endpoints
router.get('/debug/crewai-sources', testCrewAISources);

// Get full agent run report (for web viewing)
router.get('/runs/:runId/report', async (req, res) => {
  try {
    const { runId } = req.params;
    const userId = (req as any).user.userId;

    const agentRun = await AgentRun.findOne({ 
      _id: runId,
      userId: userId 
    }).populate('agentId', 'name type');

    if (!agentRun) {
      return res.status(404).json({ 
        success: false, 
        message: 'Agent run not found or access denied' 
      });
    }

    // Generate full detailed report
    const savedArticleLogs = agentRun.logs.filter(log => 
      log.level === 'info' && 
      log.message === 'Saved news article' && 
      log.data?.title && 
      log.data?.source
    );

    const completionLog = agentRun.logs.find(log => 
      log.message === 'CrewAI execution completed' && 
      log.data?.sourceBreakdown
    );

    const reportData = {
      agent: agentRun.agentId,
      run: {
        id: agentRun._id,
        status: agentRun.status,
        startTime: agentRun.startTime,
        endTime: agentRun.endTime,
        duration: agentRun.duration,
        itemsProcessed: agentRun.itemsProcessed,
        itemsAdded: agentRun.itemsAdded
      },
      articles: savedArticleLogs.map(log => ({
        title: log.data.title,
        source: log.data.source,
        sourceType: log.data.sourceType,
        qualityScore: log.data.qualityScore,
        urlValidated: log.data.urlValidated,
        uniqueId: log.data.uniqueId,
        timestamp: log.timestamp
      })),
      sourceBreakdown: completionLog?.data?.sourceBreakdown || {},
      qualityMetrics: completionLog?.data?.qualityMetrics || {},
      refreshMode: completionLog?.data?.refreshMode || 'standard'
    };

    res.json({ success: true, data: reportData });
  } catch (error: any) {
    console.error('[AgentsRoutes] Error fetching agent run report:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch agent run report',
      error: error.message 
    });
  }
});

// Get HTML formatted agent run report
router.get('/runs/:runId/report/html', async (req, res) => {
  try {
    const { runId } = req.params;
    const userId = (req as any).user.userId;

    const agentRun = await AgentRun.findOne({ 
      _id: runId,
      userId: userId 
    }).populate('agentId', 'name type');

    if (!agentRun) {
      return res.status(404).send(`
        <html><body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
          <h1>Report Not Found</h1>
          <p>The requested agent run report was not found or you don't have access to it.</p>
        </body></html>
      `);
    }

    const agent = agentRun.agentId as any;
    const savedArticleLogs = agentRun.logs.filter(log => 
      log.level === 'info' && 
      log.message === 'Saved news article' && 
      log.data?.title && 
      log.data?.source
    );

    const completionLog = agentRun.logs.find(log => 
      log.message === 'CrewAI execution completed' && 
      log.data?.sourceBreakdown
    );

    const sourceBreakdown = completionLog?.data?.sourceBreakdown || {};
    const qualityMetrics = completionLog?.data?.qualityMetrics || {};

    const getSourceEmoji = (source: string) => {
      const sourceType = source.toLowerCase();
      if (sourceType.includes('reddit')) return '🔴';
      if (sourceType.includes('telegram')) return '💬';
      if (sourceType.includes('linkedin')) return '💼';
      if (sourceType.includes('twitter') || sourceType.includes('x.com')) return '🐦';
      if (sourceType.includes('news')) return '📰';
      return '🌐';
    };

    const getQualityEmoji = (score: number) => {
      if (score >= 8) return '🌟';
      if (score >= 6) return '⭐';
      if (score >= 4) return '🔸';
      return '🔹';
    };

    const formatDuration = (ms: number) => {
      const seconds = Math.round(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${seconds}s`;
    };

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Agent Report - ${agent.name}</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1000px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; margin-bottom: 10px; }
        .subtitle { color: #666; margin-bottom: 30px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #007bff; }
        .stat-value { font-size: 24px; font-weight: bold; color: #007bff; }
        .stat-label { color: #666; font-size: 14px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 5px; }
        .article { background: #f8f9fa; margin: 10px 0; padding: 15px; border-radius: 6px; border-left: 4px solid #28a745; }
        .article-title { font-weight: bold; margin-bottom: 5px; }
        .article-meta { color: #666; font-size: 14px; }
        .source-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #eee; }
        .source-item:last-child { border-bottom: none; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
        .metric-card { background: #f8f9fa; padding: 15px; border-radius: 6px; }
        .back-btn { display: inline-block; background: #007bff; color: white; padding: 8px 16px; border-radius: 4px; text-decoration: none; margin-bottom: 20px; }
        .back-btn:hover { background: #0056b3; }
      </style>
    </head>
    <body>
      <div class="container">
        <a href="javascript:history.back()" class="back-btn">← Back</a>
        
        <h1>📊 Agent Execution Report</h1>
        <div class="subtitle">
          <strong>${agent.name}</strong> • ${new Date(agentRun.startTime).toLocaleString()}
        </div>

        <div class="stats">
          <div class="stat-card">
            <div class="stat-value">${agentRun.itemsProcessed}</div>
            <div class="stat-label">Items Processed</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${agentRun.itemsAdded}</div>
            <div class="stat-label">New Items Added</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${agentRun.duration ? formatDuration(agentRun.duration) : 'N/A'}</div>
            <div class="stat-label">Duration</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${agentRun.status}</div>
            <div class="stat-label">Status</div>
          </div>
        </div>

        ${Object.keys(sourceBreakdown).length > 0 ? `
        <div class="section">
          <h2>📈 Source Breakdown</h2>
          ${Object.entries(sourceBreakdown).map(([source, count]) => `
            <div class="source-item">
              <span>${getSourceEmoji(source)} ${source}</span>
              <strong>${count} articles</strong>
            </div>
          `).join('')}
        </div>
        ` : ''}

        ${savedArticleLogs.length > 0 ? `
        <div class="section">
          <h2>📰 Articles Added (${savedArticleLogs.length} total)</h2>
          ${savedArticleLogs.map((log, index) => {
            const { title, source, sourceType, qualityScore, urlValidated } = log.data;
            return `
              <div class="article">
                <div class="article-title">
                  ${index + 1}. ${getSourceEmoji(sourceType || source)} ${title}
                </div>
                <div class="article-meta">
                  📍 ${source} 
                  ${qualityScore ? getQualityEmoji(qualityScore) + ' Quality: ' + qualityScore + '/10' : ''} 
                  ${urlValidated ? '✅ URL Validated' : ''}
                  <br>⏰ ${new Date(log.timestamp).toLocaleString()}
                </div>
              </div>
            `;
          }).join('')}
        </div>
        ` : ''}

        ${Object.keys(qualityMetrics).length > 0 ? `
        <div class="section">
          <h2>🎯 Quality Metrics</h2>
          <div class="metrics">
            ${qualityMetrics.avgQualityScore ? `
            <div class="metric-card">
              <strong>Average Quality Score</strong><br>
              ${qualityMetrics.avgQualityScore.toFixed(1)}/10
            </div>
            ` : ''}
            ${qualityMetrics.urlValidationRate ? `
            <div class="metric-card">
              <strong>URL Validation Rate</strong><br>
              ${(qualityMetrics.urlValidationRate * 100).toFixed(0)}%
            </div>
            ` : ''}
            ${completionLog?.data?.refreshMode ? `
            <div class="metric-card">
              <strong>Execution Mode</strong><br>
              ${completionLog.data.refreshMode}
            </div>
            ` : ''}
          </div>
        </div>
        ` : ''}

        <div class="section">
          <h2>🔍 Technical Details</h2>
          <div class="metrics">
            <div class="metric-card">
              <strong>Agent Type</strong><br>
              ${agent.type}
            </div>
            <div class="metric-card">
              <strong>Run ID</strong><br>
              ${agentRun._id}
            </div>
            <div class="metric-card">
              <strong>Start Time</strong><br>
              ${new Date(agentRun.startTime).toLocaleString()}
            </div>
            ${agentRun.endTime ? `
            <div class="metric-card">
              <strong>End Time</strong><br>
              ${new Date(agentRun.endTime).toLocaleString()}
            </div>
            ` : ''}
          </div>
        </div>
      </div>
    </body>
    </html>
    `;

    res.send(html);
  } catch (error: any) {
    console.error('[AgentsRoutes] Error generating HTML report:', error);
    res.status(500).send(`
      <html><body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
        <h1>Error</h1>
        <p>Failed to generate report: ${error.message}</p>
      </body></html>
    `);
  }
});

export default router;