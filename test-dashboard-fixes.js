#!/usr/bin/env node

/**
 * Test Script for AI Agents Dashboard Fixes
 * Tests progress broadcasting, content fetching, and session management
 */

const axios = require('axios');

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const CREWAI_URL = process.env.CREWAI_SERVICE_URL || 'http://localhost:5000';

class DashboardTester {
  constructor() {
    this.testResults = {
      health: null,
      sessionManagement: null,
      progressBroadcasting: null,
      contentFetching: null,
      errors: []
    };
  }

  async runAllTests() {
    console.log('🧪 Starting AI Agents Dashboard Fix Verification\n');

    try {
      // Test 1: Health Checks
      await this.testHealthChecks();
      
      // Test 2: Session Management
      await this.testSessionManagement();
      
      // Test 3: Progress Broadcasting
      await this.testProgressBroadcasting();
      
      // Test 4: Content Fetching
      await this.testContentFetching();
      
      // Display results
      this.displayResults();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      this.testResults.errors.push(`Suite failure: ${error.message}`);
    }
  }

  async testHealthChecks() {
    console.log('🏥 Testing Health Checks...');
    
    try {
      // Test CrewAI service health
      const crewaiHealth = await axios.get(`${CREWAI_URL}/health`, { timeout: 10000 });
      console.log(`✅ CrewAI Service: ${crewaiHealth.data.status} (Mode: ${crewaiHealth.data.mode})`);
      
      if (crewaiHealth.data.initialized) {
        console.log('✅ CrewAI service is properly initialized');
      } else {
        console.log('⚠️ CrewAI service not fully initialized');
      }
      
      this.testResults.health = {
        crewai: 'healthy',
        initialized: crewaiHealth.data.initialized,
        mode: crewaiHealth.data.mode
      };
      
    } catch (error) {
      console.log(`❌ Health check failed: ${error.message}`);
      this.testResults.health = { error: error.message };
      this.testResults.errors.push(`Health check: ${error.message}`);
    }
    
    console.log('');
  }

  async testSessionManagement() {
    console.log('🔄 Testing Session Management...');
    
    try {
      // Test session creation through news gathering
      const testRequest = {
        topics: ['technology', 'AI'],
        sources: {
          reddit: true,
          linkedin: true,
          telegram: true,
          news_websites: true
        },
        agent_id: 'test_agent_' + Date.now()
      };
      
      console.log(`📊 Sending test request with agent_id: ${testRequest.agent_id}`);
      
      const response = await axios.post(`${CREWAI_URL}/gather-news`, testRequest, {
        timeout: 60000 // 1 minute timeout
      });
      
      if (response.data.session_id) {
        console.log(`✅ Session ID generated: ${response.data.session_id}`);
        this.testResults.sessionManagement = {
          sessionId: response.data.session_id,
          agentId: testRequest.agent_id,
          success: true
        };
        
        // Test progress retrieval with session ID
        await this.testProgressRetrieval(response.data.session_id);
        
      } else {
        console.log('⚠️ No session ID in response');
        this.testResults.sessionManagement = { error: 'No session ID returned' };
      }
      
    } catch (error) {
      console.log(`❌ Session management test failed: ${error.message}`);
      this.testResults.sessionManagement = { error: error.message };
      this.testResults.errors.push(`Session management: ${error.message}`);
    }
    
    console.log('');
  }

  async testProgressRetrieval(sessionId) {
    console.log('📊 Testing Progress Retrieval...');
    
    try {
      const progressResponse = await axios.get(`${CREWAI_URL}/progress`, {
        params: { session_id: sessionId },
        timeout: 5000
      });
      
      if (progressResponse.data.success) {
        const progress = progressResponse.data.progress;
        console.log(`✅ Progress retrieved for session: ${sessionId}`);
        console.log(`📋 Steps: ${progress.steps?.length || 0}`);
        console.log(`🔄 Has active progress: ${progress.hasActiveProgress}`);
        
        this.testResults.progressBroadcasting = {
          sessionId,
          stepsCount: progress.steps?.length || 0,
          hasActiveProgress: progress.hasActiveProgress,
          success: true
        };
      } else {
        console.log('⚠️ Progress retrieval failed');
        this.testResults.progressBroadcasting = { error: 'Progress retrieval failed' };
      }
      
    } catch (error) {
      console.log(`❌ Progress retrieval failed: ${error.message}`);
      this.testResults.progressBroadcasting = { error: error.message };
    }
  }

  async testProgressBroadcasting() {
    console.log('📡 Testing Progress Broadcasting...');
    
    try {
      // Test general progress endpoint
      const generalProgress = await axios.get(`${CREWAI_URL}/progress`, { timeout: 5000 });
      
      if (generalProgress.data.success) {
        console.log('✅ General progress endpoint working');
        console.log(`📊 Progress data structure: ${Object.keys(generalProgress.data.progress || {}).join(', ')}`);
      } else {
        console.log('⚠️ General progress endpoint not returning success');
      }
      
    } catch (error) {
      console.log(`❌ Progress broadcasting test failed: ${error.message}`);
      this.testResults.errors.push(`Progress broadcasting: ${error.message}`);
    }
    
    console.log('');
  }

  async testContentFetching() {
    console.log('📰 Testing Content Fetching...');
    
    try {
      // Test simple crew for dashboard functionality
      const testCrewResponse = await axios.post(`${CREWAI_URL}/test-simple-crew`, {
        topics: ['technology', 'innovation'],
        sources: { reddit: true, linkedin: true, news_websites: true }
      }, { timeout: 30000 });
      
      if (testCrewResponse.data.success) {
        const data = testCrewResponse.data.data;
        const organizedContent = data?.organized_content || {};
        
        const totalItems = Object.values(organizedContent).reduce((sum, items) => {
          return sum + (Array.isArray(items) ? items.length : 0);
        }, 0);
        
        console.log(`✅ Content fetching working - ${totalItems} total items`);
        console.log(`📊 Reddit: ${organizedContent.reddit_posts?.length || 0} posts`);
        console.log(`💼 LinkedIn: ${organizedContent.linkedin_posts?.length || 0} posts`);
        console.log(`📰 News: ${organizedContent.news_articles?.length || 0} articles`);
        
        const isRealContent = testCrewResponse.data.mode !== 'no_content_found' && 
                            testCrewResponse.data.mode !== 'scraping_failed' &&
                            totalItems > 0;
        
        this.testResults.contentFetching = {
          success: true,
          totalItems,
          isRealContent,
          mode: testCrewResponse.data.mode,
          breakdown: {
            reddit: organizedContent.reddit_posts?.length || 0,
            linkedin: organizedContent.linkedin_posts?.length || 0,
            news: organizedContent.news_articles?.length || 0
          }
        };
        
        if (isRealContent) {
          console.log('✅ Fetching REAL content (not fallback/mock data)');
        } else {
          console.log('⚠️ Using fallback/mock data - check API credentials and connectivity');
        }
        
      } else {
        console.log(`❌ Content fetching failed: ${testCrewResponse.data.error}`);
        this.testResults.contentFetching = { error: testCrewResponse.data.error };
      }
      
    } catch (error) {
      console.log(`❌ Content fetching test failed: ${error.message}`);
      this.testResults.contentFetching = { error: error.message };
      this.testResults.errors.push(`Content fetching: ${error.message}`);
    }
    
    console.log('');
  }

  displayResults() {
    console.log('📋 Test Results Summary');
    console.log('========================\n');
    
    // Health Check Results
    console.log('🏥 Health Checks:');
    if (this.testResults.health?.crewai === 'healthy') {
      console.log(`✅ CrewAI Service: Healthy (${this.testResults.health.mode})`);
    } else {
      console.log(`❌ CrewAI Service: ${this.testResults.health?.error || 'Unknown error'}`);
    }
    console.log('');
    
    // Session Management Results
    console.log('🔄 Session Management:');
    if (this.testResults.sessionManagement?.success) {
      console.log(`✅ Session ID Generation: Working`);
      console.log(`📋 Session ID: ${this.testResults.sessionManagement.sessionId}`);
    } else {
      console.log(`❌ Session Management: ${this.testResults.sessionManagement?.error || 'Failed'}`);
    }
    console.log('');
    
    // Progress Broadcasting Results
    console.log('📡 Progress Broadcasting:');
    if (this.testResults.progressBroadcasting?.success) {
      console.log(`✅ Progress Retrieval: Working`);
      console.log(`📊 Steps Available: ${this.testResults.progressBroadcasting.stepsCount}`);
    } else {
      console.log(`❌ Progress Broadcasting: ${this.testResults.progressBroadcasting?.error || 'Failed'}`);
    }
    console.log('');
    
    // Content Fetching Results
    console.log('📰 Content Fetching:');
    if (this.testResults.contentFetching?.success) {
      console.log(`✅ Content Fetching: Working`);
      console.log(`📊 Total Items: ${this.testResults.contentFetching.totalItems}`);
      console.log(`🔍 Content Type: ${this.testResults.contentFetching.isRealContent ? 'REAL' : 'Fallback/Mock'}`);
      console.log(`📋 Breakdown: Reddit(${this.testResults.contentFetching.breakdown.reddit}), LinkedIn(${this.testResults.contentFetching.breakdown.linkedin}), News(${this.testResults.contentFetching.breakdown.news})`);
    } else {
      console.log(`❌ Content Fetching: ${this.testResults.contentFetching?.error || 'Failed'}`);
    }
    console.log('');
    
    // Overall Status
    const allTestsPassed = this.testResults.health?.crewai === 'healthy' &&
                          this.testResults.sessionManagement?.success &&
                          this.testResults.progressBroadcasting?.success &&
                          this.testResults.contentFetching?.success;
    
    console.log('🎯 Overall Status:');
    if (allTestsPassed) {
      console.log('✅ ALL TESTS PASSED - Dashboard fixes are working correctly!');
    } else {
      console.log('⚠️ Some tests failed - check the issues above');
      if (this.testResults.errors.length > 0) {
        console.log('\n🐛 Errors encountered:');
        this.testResults.errors.forEach(error => console.log(`   - ${error}`));
      }
    }
    
    console.log('\n💡 Next Steps:');
    if (allTestsPassed) {
      console.log('   - Your AI agents dashboard should now be working correctly');
      console.log('   - Progress updates should broadcast in real-time');
      console.log('   - Content fetching should return real data from sources');
    } else {
      console.log('   - Check the CrewAI service is running and accessible');
      console.log('   - Verify environment variables are set correctly');
      console.log('   - Check network connectivity to external APIs');
      console.log('   - Review the error messages above for specific issues');
    }
  }
}

// Run the tests
async function main() {
  const tester = new DashboardTester();
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = DashboardTester; 