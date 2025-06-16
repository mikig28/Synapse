import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  HelpCircle,
  BookOpen,
  Terminal,
  Container,
  Settings,
  ExternalLink,
  Copy,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  Code,
  Zap,
  Globe,
} from 'lucide-react';
import { MCPServerTemplate } from '../data/mcpServers';
import { useToast } from '@/hooks/use-toast';

interface MCPIntegrationGuideProps {
  mcpServer: MCPServerTemplate;
  children: React.ReactNode;
}

const MCPIntegrationGuide: React.FC<MCPIntegrationGuideProps> = ({
  mcpServer,
  children
}) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(label);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({
      title: 'Copied to clipboard',
      description: `${label} command copied`,
    });
  };

  const getSetupInstructions = () => {
    const instructions = {
      npm: `npm install -g ${mcpServer.npmPackage}`,
      npx: mcpServer.serverUri,
      docker: mcpServer.dockerImage 
        ? `docker run -d --name ${mcpServer.id}-server ${mcpServer.dockerImage}`
        : 'Docker image not available for this server'
    };

    return instructions;
  };

  const getConfigurationExample = () => {
    const config = {
      "mcpServers": {
        [mcpServer.id]: {
          "command": mcpServer.serverUri.includes('npx') ? 'npx' : 'node',
          "args": mcpServer.serverUri.includes('npx') 
            ? mcpServer.serverUri.split(' ').slice(1)
            : [mcpServer.serverUri],
          "env": mcpServer.configuration || {}
        }
      }
    };

    return JSON.stringify(config, null, 2);
  };

  const getEnvironmentVariables = () => {
    switch (mcpServer.id) {
      case 'algolia':
        return [
          { name: 'ALGOLIA_APPLICATION_ID', description: 'Your Algolia application ID', required: true },
          { name: 'ALGOLIA_API_KEY', description: 'Your Algolia admin API key', required: true },
          { name: 'ALGOLIA_SEARCH_KEY', description: 'Your Algolia search-only API key', required: false }
        ];
      case 'dart':
        return [
          { name: 'DART_API_TOKEN', description: 'Your Dart API access token', required: true },
          { name: 'DART_WORKSPACE_ID', description: 'Your Dart workspace identifier', required: true }
        ];
      case 'builtwith':
        return [
          { name: 'BUILTWITH_API_KEY', description: 'Your BuiltWith API key', required: true }
        ];
      case 'devhub':
        return [
          { name: 'DEVHUB_API_TOKEN', description: 'Your DevHub API token', required: true },
          { name: 'DEVHUB_BASE_URL', description: 'Your DevHub instance URL', required: true }
        ];
      case 'filesystem':
        return [
          { name: 'ALLOWED_PATHS', description: 'Comma-separated list of allowed directory paths', required: true },
          { name: 'READ_ONLY', description: 'Set to "true" for read-only access', required: false }
        ];
      case 'memory':
        return [
          { name: 'MEMORY_FILE_PATH', description: 'Path to store the knowledge graph data', required: false }
        ];
      default:
        return [];
    }
  };

  const getUsageExamples = () => {
    switch (mcpServer.id) {
      case 'memory':
        return [
          {
            title: 'Create Knowledge Entities',
            description: 'Store information about people, projects, or concepts',
            example: 'Create entity "John Doe" of type "person" with observation "Software engineer at TechCorp"'
          },
          {
            title: 'Link Related Information',
            description: 'Create relationships between different entities',
            example: 'Create relation "John Doe" "works_on" "Project Alpha"'
          },
          {
            title: 'Search Knowledge Graph',
            description: 'Find entities and their connections',
            example: 'Search for all entities related to "artificial intelligence"'
          }
        ];
      case 'filesystem':
        return [
          {
            title: 'Read Project Files',
            description: 'Access and analyze project documentation',
            example: 'Read the contents of "/workspace/README.md"'
          },
          {
            title: 'Search for Files',
            description: 'Find files matching specific patterns',
            example: 'Search for all ".py" files containing "import pandas"'
          },
          {
            title: 'Create Documentation',
            description: 'Generate and save new documents',
            example: 'Write a summary report to "/workspace/reports/analysis.md"'
          }
        ];
      case 'sequential-thinking':
        return [
          {
            title: 'Complex Problem Solving',
            description: 'Break down complex tasks into manageable steps',
            example: 'Plan a multi-phase product launch with dependencies and timeline'
          },
          {
            title: 'Iterative Analysis',
            description: 'Refine understanding through multiple thinking steps',
            example: 'Analyze market trends with revision and refinement of insights'
          },
          {
            title: 'Strategic Planning',
            description: 'Develop comprehensive strategies with contingencies',
            example: 'Create a business expansion plan with risk assessment and alternatives'
          }
        ];
      case 'algolia':
        return [
          {
            title: 'Semantic Search',
            description: 'Search across all your content with natural language',
            example: 'Find all documents related to "machine learning best practices"'
          },
          {
            title: 'Content Indexing',
            description: 'Automatically index new content for search',
            example: 'Index new blog posts and documentation for discovery'
          },
          {
            title: 'Search Analytics',
            description: 'Analyze search patterns and optimize content',
            example: 'Show popular search terms and content gaps'
          }
        ];
      default:
        return [
          {
            title: 'Basic Usage',
            description: 'Start using this MCP server with your agent',
            example: 'Configure the server and test the connection'
          }
        ];
    }
  };

  const instructions = getSetupInstructions();
  const envVars = getEnvironmentVariables();
  const examples = getUsageExamples();

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            {mcpServer.name} Integration Guide
          </DialogTitle>
          <DialogDescription>
            Complete setup and usage guide for integrating {mcpServer.name} with your Synapse agents.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="setup">Setup</TabsTrigger>
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="usage">Usage</TabsTrigger>
          </TabsList>

          <ScrollArea className="max-h-[60vh] mt-4">
            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    About {mcpServer.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">{mcpServer.description}</p>
                  
                  <div>
                    <h4 className="font-medium mb-2">Key Capabilities</h4>
                    <div className="flex flex-wrap gap-2">
                      {mcpServer.capabilities.map((cap) => (
                        <Badge key={cap} variant="secondary" className="text-xs">
                          {cap}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950/50 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900 dark:text-blue-100">Use Case</h4>
                        <p className="text-sm text-blue-700 dark:text-blue-200">{mcpServer.useCase}</p>
                      </div>
                    </div>
                  </div>

                  {mcpServer.documentation && (
                    <Button
                      variant="outline"
                      onClick={() => window.open(mcpServer.documentation, '_blank')}
                      className="w-full"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Official Documentation
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="setup" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Terminal className="w-5 h-5" />
                    Installation Methods
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {mcpServer.npmPackage && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Code className="w-4 h-4" />
                        NPX (Recommended)
                      </h4>
                      <div className="bg-muted p-3 rounded-md font-mono text-sm relative">
                        <code>{instructions.npx}</code>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute top-1 right-1 h-6 w-6 p-0"
                          onClick={() => copyToClipboard(instructions.npx, 'NPX')}
                        >
                          {copiedCode === 'NPX' ? (
                            <CheckCircle className="w-3 h-3 text-green-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        This will run the latest version without installing globally
                      </p>
                    </div>
                  )}

                  {mcpServer.npmPackage && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Code className="w-4 h-4" />
                        Global Installation
                      </h4>
                      <div className="bg-muted p-3 rounded-md font-mono text-sm relative">
                        <code>{instructions.npm}</code>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute top-1 right-1 h-6 w-6 p-0"
                          onClick={() => copyToClipboard(instructions.npm, 'NPM')}
                        >
                          {copiedCode === 'NPM' ? (
                            <CheckCircle className="w-3 h-3 text-green-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {mcpServer.dockerImage && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Container className="w-4 h-4" />
                        Docker
                      </h4>
                      <div className="bg-muted p-3 rounded-md font-mono text-sm relative">
                        <code>{instructions.docker}</code>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute top-1 right-1 h-6 w-6 p-0"
                          onClick={() => copyToClipboard(instructions.docker, 'Docker')}
                        >
                          {copiedCode === 'Docker' ? (
                            <CheckCircle className="w-3 h-3 text-green-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="config" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {envVars.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3">Environment Variables</h4>
                      <div className="space-y-3">
                        {envVars.map((envVar) => (
                          <div key={envVar.name} className="border rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                                {envVar.name}
                              </code>
                              {envVar.required && (
                                <Badge variant="destructive" className="text-xs">
                                  Required
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{envVar.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="font-medium mb-2">MCP Configuration Example</h4>
                    <div className="bg-muted p-3 rounded-md relative">
                      <pre className="text-xs overflow-x-auto">
                        <code>{getConfigurationExample()}</code>
                      </pre>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-1 right-1 h-6 w-6 p-0"
                        onClick={() => copyToClipboard(getConfigurationExample(), 'Config')}
                      >
                        {copiedCode === 'Config' ? (
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {mcpServer.authentication?.type !== 'none' && (
                    <div className="bg-yellow-50 dark:bg-yellow-950/50 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-yellow-900 dark:text-yellow-100">Authentication Required</h4>
                          <p className="text-sm text-yellow-700 dark:text-yellow-200">
                            This server requires {mcpServer.authentication.type} authentication. 
                            Make sure to configure your credentials in the agent settings.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="usage" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Usage Examples
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {examples.map((example, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <h4 className="font-medium mb-2">{example.title}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{example.description}</p>
                        <div className="bg-muted p-3 rounded-md">
                          <code className="text-sm">{example.example}</code>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default MCPIntegrationGuide;