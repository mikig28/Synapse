import { MCPServer } from '../types/agent';

export interface MCPServerTemplate {
  id: string;
  name: string;
  description: string;
  serverUri: string;
  category: 'productivity' | 'ai' | 'data' | 'files' | 'search';
  capabilities: string[];
  authentication: MCPServer['authentication'];
  dockerImage?: string;
  npmPackage?: string;
  configuration?: Record<string, any>;
  documentation?: string;
  useCase: string;
}

export const SYNAPSE_MCP_SERVERS: MCPServerTemplate[] = [
  {
    id: 'memory',
    name: 'Memory Server',
    description: 'Knowledge graph-based persistent memory system for connecting information across your workspace',
    serverUri: 'npx -y @modelcontextprotocol/server-memory',
    category: 'ai',
    capabilities: ['knowledge-graph', 'entities', 'relations', 'observations', 'persistent-memory'],
    authentication: { type: 'none' },
    npmPackage: '@modelcontextprotocol/server-memory',
    useCase: 'Perfect for linking notes, tasks, and ideas. Remembers connections between your content.',
    documentation: 'https://github.com/modelcontextprotocol/servers/tree/main/src/memory'
  },
  {
    id: 'filesystem',
    name: 'Filesystem Server',
    description: 'Secure file operations with configurable access controls for document management',
    serverUri: 'npx -y @modelcontextprotocol/server-filesystem',
    category: 'files',
    capabilities: ['file-read', 'file-write', 'directory-ops', 'file-search', 'metadata'],
    authentication: { type: 'none' },
    npmPackage: '@modelcontextprotocol/server-filesystem',
    configuration: {
      allowedPaths: ['/workspace', '/documents', '/uploads'],
      readOnly: false
    },
    useCase: 'Essential for file management, document processing, and secure file operations.',
    documentation: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem'
  },
  {
    id: 'sequential-thinking',
    name: 'Sequential Thinking Server',
    description: 'Dynamic and reflective problem-solving through structured thought sequences',
    serverUri: 'npx -y @modelcontextprotocol/server-sequentialthinking',
    category: 'ai',
    capabilities: ['problem-decomposition', 'step-by-step-reasoning', 'thought-revision', 'planning'],
    authentication: { type: 'none' },
    npmPackage: '@modelcontextprotocol/server-sequentialthinking',
    useCase: 'Enhances AI agents with structured problem-solving for complex analysis and planning.',
    documentation: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking'
  },
  {
    id: 'algolia',
    name: 'Algolia Search Server',
    description: 'Advanced search capabilities with natural language interface to Algolia indices',
    serverUri: 'npx -y @modelcontextprotocol/server-algolia',
    category: 'search',
    capabilities: ['search', 'indexing', 'natural-language-query', 'analytics'],
    authentication: {
      type: 'apikey',
      credentials: ''
    },
    npmPackage: '@modelcontextprotocol/server-algolia',
    configuration: {
      applicationId: '',
      adminApiKey: '',
      searchApiKey: ''
    },
    useCase: 'Powerful semantic search across all your content with advanced filtering and analytics.',
    documentation: 'https://github.com/modelcontextprotocol/servers/tree/main/src/algolia'
  },
  {
    id: 'dart',
    name: 'Dart Project Management',
    description: 'AI-native project management with task, document, and project data integration',
    serverUri: 'npx -y @modelcontextprotocol/server-dart',
    category: 'productivity',
    capabilities: ['task-management', 'project-data', 'document-management', 'collaboration'],
    authentication: {
      type: 'bearer',
      credentials: ''
    },
    npmPackage: '@modelcontextprotocol/server-dart',
    useCase: 'Integrates project management workflows directly into your AI agents.',
    documentation: 'https://github.com/modelcontextprotocol/servers/tree/main/src/dart'
  },
  {
    id: 'builtwith',
    name: 'BuiltWith Technology Scanner',
    description: 'Identify technology stacks and tools behind websites for competitive analysis',
    serverUri: 'npx -y @modelcontextprotocol/server-builtwith',
    category: 'data',
    capabilities: ['tech-stack-analysis', 'website-profiling', 'competitive-intelligence'],
    authentication: {
      type: 'apikey',
      credentials: ''
    },
    npmPackage: '@modelcontextprotocol/server-builtwith',
    useCase: 'Research technology trends and analyze competitor tech stacks for strategic insights.',
    documentation: 'https://github.com/modelcontextprotocol/servers/tree/main/src/builtwith'
  },
  {
    id: 'everything',
    name: 'Everything Server',
    description: 'Reference server with comprehensive prompts, resources, and testing tools',
    serverUri: 'npx -y @modelcontextprotocol/server-everything',
    category: 'ai',
    capabilities: ['prompts', 'resources', 'tools', 'testing', 'examples'],
    authentication: { type: 'none' },
    npmPackage: '@modelcontextprotocol/server-everything',
    useCase: 'Great for testing MCP integration and accessing reference implementations.',
    documentation: 'https://github.com/modelcontextprotocol/servers/tree/main/src/everything'
  },
  {
    id: 'devhub',
    name: 'DevHub CMS Server',
    description: 'Manage and utilize website content within the DevHub CMS platform',
    serverUri: 'npx -y @modelcontextprotocol/server-devhub',
    category: 'productivity',
    capabilities: ['cms-management', 'content-operations', 'website-management'],
    authentication: {
      type: 'bearer',
      credentials: ''
    },
    npmPackage: '@modelcontextprotocol/server-devhub',
    useCase: 'Streamline content management workflows and website operations.',
    documentation: 'https://github.com/modelcontextprotocol/servers/tree/main/src/devhub'
  },
  {
    id: 'firecrawl',
    name: 'Firecrawl Scraper',
    description: 'Advanced web scraping and crawling with AI-powered content extraction',
    serverUri: 'npx -y @mendable/firecrawl-mcp-server',
    category: 'data',
    capabilities: ['web-scraping', 'content-extraction', 'website-crawling', 'markdown-conversion', 'llm-extraction'],
    authentication: {
      type: 'apikey',
      credentials: ''
    },
    npmPackage: '@mendable/firecrawl-mcp-server',
    configuration: {
      apiKey: '',
      baseUrl: 'https://api.firecrawl.dev'
    },
    useCase: 'Perfect for extracting clean, structured content from websites for AI agents and data processing.',
    documentation: 'https://docs.firecrawl.dev/'
  }
];

export const MCP_CATEGORIES = {
  'productivity': {
    name: 'Productivity',
    description: 'Task management, project coordination, and workflow automation',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
  },
  'ai': {
    name: 'AI & Reasoning',
    description: 'Enhanced AI capabilities, memory, and intelligent processing',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
  },
  'data': {
    name: 'Data & Analytics',
    description: 'Data analysis, business intelligence, and competitive research',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
  },
  'files': {
    name: 'File Management',
    description: 'Document handling, file operations, and storage management',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
  },
  'search': {
    name: 'Search & Discovery',
    description: 'Advanced search, indexing, and content discovery capabilities',
    color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300'
  }
} as const;

export const getRecommendedMCPsForAgent = (agentType: string): MCPServerTemplate[] => {
  switch (agentType) {
    case 'crewai_news':
      return [
        SYNAPSE_MCP_SERVERS.find(s => s.id === 'firecrawl')!,
        SYNAPSE_MCP_SERVERS.find(s => s.id === 'memory')!,
        SYNAPSE_MCP_SERVERS.find(s => s.id === 'sequential-thinking')!,
        SYNAPSE_MCP_SERVERS.find(s => s.id === 'algolia')!,
        SYNAPSE_MCP_SERVERS.find(s => s.id === 'builtwith')!
      ];
    case 'news':
      return [
        SYNAPSE_MCP_SERVERS.find(s => s.id === 'firecrawl')!,
        SYNAPSE_MCP_SERVERS.find(s => s.id === 'filesystem')!,
        SYNAPSE_MCP_SERVERS.find(s => s.id === 'algolia')!,
        SYNAPSE_MCP_SERVERS.find(s => s.id === 'memory')!
      ];
    case 'custom':
      return [
        SYNAPSE_MCP_SERVERS.find(s => s.id === 'everything')!,
        SYNAPSE_MCP_SERVERS.find(s => s.id === 'filesystem')!,
        SYNAPSE_MCP_SERVERS.find(s => s.id === 'sequential-thinking')!,
        SYNAPSE_MCP_SERVERS.find(s => s.id === 'firecrawl')!
      ];
    default:
      return [
        SYNAPSE_MCP_SERVERS.find(s => s.id === 'memory')!,
        SYNAPSE_MCP_SERVERS.find(s => s.id === 'filesystem')!
      ];
  }
};

export const getMCPServerById = (id: string): MCPServerTemplate | undefined => {
  return SYNAPSE_MCP_SERVERS.find(server => server.id === id);
};

export const getMCPServersByCategory = (category: string): MCPServerTemplate[] => {
  return SYNAPSE_MCP_SERVERS.filter(server => server.category === category);
};