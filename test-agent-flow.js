// Complete Agent Execution Flow Test
// This simulates what your frontend does when you click "Run Agent"

const BACKEND_URL = 'https://synapse-pxad.onrender.com/api/v1';

class AgentExecutionTester {
    constructor() {
        this.token = null;
        this.agents = [];
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const emoji = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`[${timestamp}] ${emoji} ${message}`);
    }

    async makeRequest(endpoint, options = {}) {
        const url = `${BACKEND_URL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
            ...options.headers
        };

        this.log(`Making request to: ${url}`);
        this.log(`Headers: ${JSON.stringify(headers, null, 2)}`);

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            this.log(`Response status: ${response.status} ${response.statusText}`, 
                response.ok ? 'success' : 'error');

            const data = await response.json();
            this.log(`Response data: ${JSON.stringify(data, null, 2)}`);

            return { response, data };
        } catch (error) {
            this.log(`Request failed: ${error.message}`, 'error');
            throw error;
        }
    }

    async testAuthentication() {
        this.log('=== TESTING AUTHENTICATION ===');
        
        // First, try without token
        try {
            const { response, data } = await this.makeRequest('/agents');
            
            if (response.status === 401) {
                this.log('Authentication required (expected)', 'warning');
                return false;
            } else if (response.ok) {
                this.log('No authentication needed!', 'success');
                return true;
            }
        } catch (error) {
            this.log(`Auth test failed: ${error.message}`, 'error');
            return false;
        }
    }

    async createTestAgent() {
        this.log('=== CREATING TEST AGENT ===');
        
        const testAgent = {
            name: 'Test CrewAI Agent',
            type: 'crewai_news',
            description: 'Test agent for debugging execution issues',
            isActive: true,
            configuration: {
                topics: ['technology', 'AI'],
                crewaiSources: {
                    reddit: true,
                    linkedin: true,
                    telegram: true,
                    news_websites: true
                },
                maxItemsPerRun: 5,
                schedule: '0 */6 * * *'
            }
        };

        try {
            const { response, data } = await this.makeRequest('/agents', {
                method: 'POST',
                body: JSON.stringify(testAgent)
            });

            if (response.ok) {
                this.log(`Test agent created successfully! ID: ${data.data._id}`, 'success');
                return data.data;
            } else {
                this.log(`Failed to create test agent: ${data.message || data.error}`, 'error');
                return null;
            }
        } catch (error) {
            this.log(`Error creating test agent: ${error.message}`, 'error');
            return null;
        }
    }

    async listAgents() {
        this.log('=== LISTING AGENTS ===');
        
        try {
            const { response, data } = await this.makeRequest('/agents');
            
            if (response.ok) {
                this.agents = data.data || [];
                this.log(`Found ${this.agents.length} agents`, 'success');
                
                this.agents.forEach((agent, index) => {
                    this.log(`Agent ${index + 1}: ${agent.name} (${agent.type}) - Active: ${agent.isActive} - Status: ${agent.status} - ID: ${agent._id}`);
                });
                
                return this.agents;
            } else {
                this.log(`Failed to list agents: ${data.message || data.error}`, 'error');
                return [];
            }
        } catch (error) {
            this.log(`Error listing agents: ${error.message}`, 'error');
            return [];
        }
    }

    async executeAgent(agentId) {
        this.log(`=== EXECUTING AGENT ${agentId} ===`);
        
        try {
            const { response, data } = await this.makeRequest(`/agents/${agentId}/execute`, {
                method: 'POST'
            });

            if (response.ok) {
                this.log(`Agent execution started successfully!`, 'success');
                this.log(`Run ID: ${data.data._id}`);
                this.log(`Status: ${data.data.status}`);
                this.log(`Start Time: ${data.data.startTime}`);
                return data.data;
            } else {
                this.log(`Agent execution failed: ${data.message || data.error}`, 'error');
                
                if (data.errorType) {
                    this.log(`Error Type: ${data.errorType}`, 'error');
                }
                
                if (data.details) {
                    this.log(`Error Details: ${JSON.stringify(data.details, null, 2)}`, 'error');
                }
                
                return null;
            }
        } catch (error) {
            this.log(`Error executing agent: ${error.message}`, 'error');
            return null;
        }
    }

    async testCrewAIService() {
        this.log('=== TESTING CREWAI SERVICE ===');
        
        try {
            const response = await fetch('https://synapse-crewai.onrender.com/health');
            const data = await response.json();
            
            this.log(`CrewAI Status: ${data.status}`, data.status === 'healthy' ? 'success' : 'error');
            this.log(`Initialized: ${data.initialized}`, data.initialized ? 'success' : 'error');
            this.log(`Current Mode: ${data.current_mode}`);
            
            // Test a simple endpoint
            try {
                const testResponse = await fetch('https://synapse-crewai.onrender.com/system-info');
                if (testResponse.ok) {
                    this.log('CrewAI system-info endpoint accessible', 'success');
                } else {
                    this.log('CrewAI system-info endpoint failed', 'warning');
                }
            } catch (e) {
                this.log('CrewAI system-info endpoint error', 'warning');
            }
            
        } catch (error) {
            this.log(`CrewAI service test failed: ${error.message}`, 'error');
        }
    }

    async runFullTest() {
        this.log('🚀 STARTING COMPLETE AGENT EXECUTION TEST');
        this.log('==============================================');
        
        // Step 1: Test CrewAI service
        await this.testCrewAIService();
        
        // Step 2: Test authentication
        await this.testAuthentication();
        
        // Step 3: List existing agents
        const agents = await this.listAgents();
        
        // Step 4: Create test agent if needed
        let testAgent = agents.find(a => a.name === 'Test CrewAI Agent');
        if (!testAgent) {
            this.log('No test agent found, creating one...');
            testAgent = await this.createTestAgent();
        } else {
            this.log('Found existing test agent', 'success');
        }
        
        if (!testAgent) {
            this.log('Cannot proceed without a test agent', 'error');
            return;
        }
        
        // Step 5: Execute the agent
        const execution = await this.executeAgent(testAgent._id);
        
        if (execution) {
            this.log('🎉 FULL TEST COMPLETED SUCCESSFULLY!', 'success');
            
            // Monitor execution for a bit
            this.log('Monitoring execution for 30 seconds...');
            setTimeout(async () => {
                try {
                    const { response, data } = await this.makeRequest(`/agents/${testAgent._id}/runs?limit=1`);
                    if (response.ok && data.data.length > 0) {
                        const run = data.data[0];
                        this.log(`Latest run status: ${run.status}`);
                        this.log(`Items processed: ${run.itemsProcessed}`);
                        this.log(`Logs count: ${run.logs?.length || 0}`);
                    }
                } catch (e) {
                    this.log('Error checking run status', 'warning');
                }
            }, 30000);
        } else {
            this.log('❌ FULL TEST FAILED', 'error');
        }
        
        this.log('==============================================');
        this.log('Test completed. Check logs above for issues.');
    }
}

// Create and run the test
const tester = new AgentExecutionTester();

// Immediately start the test
console.log('Starting automated agent execution test...');
tester.runFullTest().catch(error => {
    console.error('Test suite failed:', error);
});

// Export for manual testing
window.AgentTester = tester;