import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { PageTransition } from '@/components/animations';
import { 
  FileText, 
  Search, 
  Upload, 
  Plus, 
  Filter, 
  Settings, 
  MessageSquare, 
  Brain,
  Sparkles,
  Download,
  Share2,
  Trash2,
  Eye,
  Clock,
  Tag,
  Users,
  BarChart3,
  Loader2,
  FileIcon,
  FileCode,
  FileImage,
  FileVideo,
  Globe,
  BookOpen,
  Lightbulb,
  Network,
  Zap,
  ChevronRight,
  Star,
  TrendingUp,
  RefreshCw,
  Check,
  X,
  AlertCircle,
  Info
} from 'lucide-react';
import { documentService, type Document as DocumentType } from '@/services/documentService';

interface Document {
  _id: string;
  title: string;
  content: string;
  documentType: string;
  summary?: string;
  metadata: {
    category: string;
    tags: string[];
    processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
    fileSize?: number;
    originalFilename?: string;
    lastProcessedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string;
  estimatedTokens?: number;
  processingProgress?: number;
  chunks?: any[];
  graphNodes?: any[];
  embeddings?: {
    text: number[];
    semantic: number[];
  };
}

interface SearchResult {
  answer: string;
  sources: any[];
  confidence: number;
  qualityScore: number;
  iterationCount: number;
  searchStrategy: string;
  suggestions?: string[];
}

interface DocumentStats {
  totalDocuments: number;
  statusCounts: { _id: string; count: number }[];
  typeCounts: { _id: string; count: number }[];
  vectorDatabase: {
    totalDocuments: number;
    totalChunks: number;
    databaseType: string;
    indexStatus: string;
  };
}

const DocsPage: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatQuery, setChatQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [filters, setFilters] = useState({
    type: 'all',
    category: 'all',
    status: 'all',
    tags: [],
  });
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showChatDialog, setShowChatDialog] = useState(false);
  const [newDocument, setNewDocument] = useState({
    title: '',
    content: '',
    documentType: 'text',
    category: 'general',
    tags: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState('documents');
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // Fetch documents on component mount
  useEffect(() => {
    fetchDocuments();
    fetchStats();
    fetchHealthStatus();
  }, []);

  // Filter documents based on search and filters
  useEffect(() => {
    let filtered = documents;

    // Text search
    if (searchQuery) {
      filtered = filtered.filter(doc => 
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.metadata.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(doc => doc.documentType === filters.type);
    }

    // Category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(doc => doc.metadata.category === filters.category);
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(doc => doc.metadata.processingStatus === filters.status);
    }

    setFilteredDocuments(filtered);
  }, [documents, searchQuery, filters]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await documentService.getDocuments();
      setDocuments(response.documents);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch documents',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await documentService.getDocumentStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchHealthStatus = async () => {
    try {
      setHealthLoading(true);
      const health = await documentService.getHealthStatus();
      setSystemHealth(health);
    } catch (error) {
      console.error('Error fetching health status:', error);
    } finally {
      setHealthLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      setUploadProgress(0);
      const uploadedDocument = await documentService.uploadDocument(
        file,
        {
          title: file.name,
          category: 'general',
          chunkingStrategy: 'hybrid',
        },
        (progress) => setUploadProgress(progress)
      );

      setDocuments(prev => [uploadedDocument, ...prev]);
      setUploadProgress(100);
      
      toast({
        title: 'Success',
        description: 'Document uploaded successfully. Processing in background.',
      });
      
      // Reset state and close dialog
      setSelectedFile(null);
      setUploadProgress(0);
      setShowUploadDialog(false);
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to upload document',
        variant: 'destructive',
      });
    }
  };

  const handleCreateDocument = async () => {
    try {
      const createdDocument = await documentService.createDocument({
        ...newDocument,
        tags: newDocument.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      });

      setDocuments(prev => [createdDocument, ...prev]);
      
      toast({
        title: 'Success',
        description: 'Document created successfully. Processing in background.',
      });
      
      setShowCreateDialog(false);
      setNewDocument({
        title: '',
        content: '',
        documentType: 'text',
        category: 'general',
        tags: '',
      });
    } catch (error) {
      console.error('Error creating document:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create document',
        variant: 'destructive',
      });
    }
  };

  const handleSearch = async () => {
    if (!chatQuery.trim()) return;

    try {
      setSearchLoading(true);
      const result = await documentService.searchDocuments(chatQuery, {
        strategy: 'hybrid',
        includeDebugInfo: true,
      });
        
        setChatHistory(prev => [...prev, {
          id: Date.now(),
          type: 'user',
          content: chatQuery,
          timestamp: new Date(),
        }, {
          id: Date.now() + 1,
          type: 'assistant',
          content: result.response || result.answer || 'No response available',
          sources: result.sources || [],
          confidence: result.confidence || 0.7,
          qualityScore: result.qualityScore || 0.7,
          suggestions: result.suggestions || [],
          timestamp: new Date(),
        }]);
        
        setChatQuery('');
    } catch (error) {
      console.error('Error searching documents:', error);
      
      // Add error message to chat history
      setChatHistory(prev => [...prev, {
        id: Date.now(),
        type: 'user',
        content: chatQuery,
        timestamp: new Date(),
      }, {
        id: Date.now() + 1,
        type: 'assistant',
        content: `❌ Search failed: ${error instanceof Error ? error.message : 'Unable to search documents. Please check your connection and try again.'}`,
        sources: [],
        confidence: 0,
        qualityScore: 0,
        suggestions: ['Try a simpler query', 'Check if documents are uploaded', 'Refresh the page'],
        timestamp: new Date(),
      }]);
      
      toast({
        title: 'Search Error',
        description: error instanceof Error ? error.message : 'Failed to search documents. Please try again.',
        variant: 'destructive',
      });
      
      setChatQuery('');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleDownloadDocument = async (document: Document) => {
    try {
      await documentService.downloadDocument(document._id);
      toast({
        title: 'Success',
        description: 'Document downloaded successfully',
      });
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to download document',
        variant: 'destructive',
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-500" />;
      case 'code':
        return <FileCode className="w-5 h-5 text-blue-500" />;
      case 'image':
        return <FileImage className="w-5 h-5 text-green-500" />;
      case 'video':
        return <FileVideo className="w-5 h-5 text-purple-500" />;
      case 'webpage':
        return <Globe className="w-5 h-5 text-orange-500" />;
      default:
        return <FileIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-7xl">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-2">
                📚 Documentation Hub
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Intelligent document management with AI-powered search and organization
              </p>
            </div>
            <div className="flex items-center justify-center sm:justify-end space-x-2 sm:space-x-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowChatDialog(true)}
                className="flex-1 sm:flex-none"
              >
                <MessageSquare className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">AI Chat</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowCreateDialog(true)}
                className="flex-1 sm:flex-none"
              >
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Create</span>
              </Button>
              <Button 
                size="sm"
                onClick={() => setShowUploadDialog(true)}
                className="flex-1 sm:flex-none"
              >
                <Upload className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Upload</span>
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Documents</p>
                      <p className="text-lg sm:text-2xl font-bold">{stats.totalDocuments}</p>
                    </div>
                    <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 shrink-0" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">Vector Index</p>
                      <p className="text-lg sm:text-2xl font-bold">{stats.vectorDatabase.totalChunks}</p>
                      <p className="text-xs text-muted-foreground truncate">{stats.vectorDatabase.databaseType}</p>
                    </div>
                    <Network className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 shrink-0" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">Processing</p>
                      <p className="text-lg sm:text-2xl font-bold">
                        {stats.statusCounts.find(s => s._id === 'processing')?.count || 0}
                      </p>
                    </div>
                    <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 shrink-0" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">Completed</p>
                      <p className="text-lg sm:text-2xl font-bold">
                        {stats.statusCounts.find(s => s._id === 'completed')?.count || 0}
                      </p>
                    </div>
                    <Check className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="documents" className="text-xs sm:text-sm py-2">
              <span className="hidden sm:inline">Documents</span>
              <span className="sm:hidden">Docs</span>
            </TabsTrigger>
            <TabsTrigger value="search" className="text-xs sm:text-sm py-2">
              <span className="hidden sm:inline">AI Search</span>
              <span className="sm:hidden">Search</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs sm:text-sm py-2">
              <span className="hidden sm:inline">Analytics</span>
              <span className="sm:hidden">Stats</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="space-y-4">
            {/* Search and Filters */}
            <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:space-x-4 mb-4 sm:mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex items-center space-x-2 sm:space-x-4">
                <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger className="w-24 sm:w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="markdown">Markdown</SelectItem>
                    <SelectItem value="code">Code</SelectItem>
                    <SelectItem value="webpage">Web</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger className="w-24 sm:w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button variant="outline" size="sm" onClick={fetchDocuments} className="shrink-0">
                  <RefreshCw className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              </div>
            </div>

            {/* Document Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </CardContent>
                  </Card>
                ))
              ) : filteredDocuments.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No documents found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery ? 'Try a different search term' : 'Start by uploading your first document'}
                  </p>
                  <Button onClick={() => setShowUploadDialog(true)}>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Document
                  </Button>
                </div>
              ) : (
                filteredDocuments.map((doc) => (
                  <Card key={doc._id} className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader className="pb-2 sm:pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          {getDocumentIcon(doc.documentType)}
                          <CardTitle className="text-sm sm:text-lg line-clamp-1 min-w-0">{doc.title}</CardTitle>
                        </div>
                        <Badge className={`${getStatusColor(doc.metadata.processingStatus)} text-xs shrink-0`}>
                          <span className="hidden sm:inline">{doc.metadata.processingStatus}</span>
                          <span className="sm:hidden">
                            {doc.metadata.processingStatus === 'completed' ? '✓' : 
                             doc.metadata.processingStatus === 'processing' ? '⟳' : 
                             doc.metadata.processingStatus === 'pending' ? '⏳' : '✗'}
                          </span>
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 line-clamp-2">
                        {doc.summary || doc.content.substring(0, 80) + '...'}
                      </p>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 mb-2 sm:mb-3">
                        <span className="text-xs text-muted-foreground truncate">
                          {formatDate(doc.updatedAt)}
                        </span>
                        {doc.metadata.fileSize && (
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(doc.metadata.fileSize)}
                          </span>
                        )}
                      </div>
                      
                      {doc.metadata.processingStatus === 'processing' && doc.processingProgress && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">Processing</span>
                            <span className="text-xs text-muted-foreground">{doc.processingProgress}%</span>
                          </div>
                          <Progress value={doc.processingProgress} className="h-2" />
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-1 mb-2 sm:mb-3">
                        {doc.metadata.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag.length > 8 ? `${tag.substring(0, 8)}...` : tag}
                          </Badge>
                        ))}
                        {doc.metadata.tags.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{doc.metadata.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1 sm:space-x-2 min-w-0 flex-1">
                          {doc.chunks && doc.chunks.length > 0 && (
                            <div className="flex items-center space-x-1">
                              <Network className="w-3 h-3 text-green-500" />
                              <span className="text-xs text-muted-foreground hidden sm:inline">
                                {doc.chunks.length} chunks
                              </span>
                              <span className="text-xs text-muted-foreground sm:hidden">
                                {doc.chunks.length}
                              </span>
                            </div>
                          )}
                          {doc.graphNodes && doc.graphNodes.length > 0 && (
                            <div className="flex items-center space-x-1">
                              <Brain className="w-3 h-3 text-blue-500" />
                              <span className="text-xs text-muted-foreground hidden sm:inline">
                                {doc.graphNodes.length} entities
                              </span>
                              <span className="text-xs text-muted-foreground sm:hidden">
                                {doc.graphNodes.length}
                              </span>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedDocument(doc)}
                          className="shrink-0 p-2"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="search" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Brain className="w-5 h-5 mr-2" />
                    AI-Powered Document Search
                  </div>
                  {systemHealth && (
                    <div className="flex items-center space-x-2 text-sm">
                      <div className={`w-2 h-2 rounded-full ${
                        systemHealth.aiServices && systemHealth.vectorDatabase 
                          ? 'bg-green-500' 
                          : systemHealth.aiServices 
                          ? 'bg-yellow-500' 
                          : 'bg-red-500'
                      }`} />
                      <span className="text-muted-foreground hidden sm:inline">
                        {systemHealth.aiServices && systemHealth.vectorDatabase 
                          ? 'Online' 
                          : systemHealth.aiServices 
                          ? 'Limited' 
                          : 'Offline'}
                      </span>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2 sm:space-x-0 mb-4">
                  <Input
                    placeholder="Ask anything about your documents..."
                    value={chatQuery}
                    onChange={(e) => setChatQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="flex-1"
                  />
                  <Button onClick={handleSearch} disabled={searchLoading} className="shrink-0">
                    {searchLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin sm:mr-2" />
                    ) : (
                      <Search className="w-4 h-4 sm:mr-2" />
                    )}
                    <span className="hidden sm:inline">Search</span>
                  </Button>
                </div>
                
                <ScrollArea className="h-64 sm:h-96">
                  <div className="space-y-3 sm:space-y-4">
                    {chatHistory.length === 0 ? (
                      <div className="text-center py-6 sm:py-8">
                        <MessageSquare className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
                        <h3 className="text-base sm:text-lg font-semibold mb-2">Start a conversation</h3>
                        <p className="text-sm sm:text-base text-muted-foreground px-4">
                          Ask questions about your documents and get intelligent answers
                        </p>
                      </div>
                    ) : (
                      chatHistory.map((message) => (
                        <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] sm:max-w-[80%] p-2 sm:p-3 rounded-lg ${
                            message.type === 'user' 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-gray-100 text-gray-900'
                          }`}>
                            <p className="text-xs sm:text-sm break-words">{message.content}</p>
                            {message.type === 'assistant' && (
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <div className="flex items-center space-x-2 text-xs text-gray-600">
                                  <span>Confidence: {Math.round(message.confidence * 100)}%</span>
                                  <span>Quality: {Math.round(message.qualityScore * 100)}%</span>
                                </div>
                                {message.sources && message.sources.length > 0 && (
                                  <div className="mt-1">
                                    <p className="text-xs text-gray-600">Sources: {message.sources.length}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base sm:text-lg">Document Types</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {stats?.typeCounts.map((type) => (
                    <div key={type._id} className="flex items-center justify-between py-2">
                      <div className="flex items-center space-x-2 min-w-0">
                        {getDocumentIcon(type._id)}
                        <span className="capitalize text-sm sm:text-base truncate">{type._id}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0">{type.count}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base sm:text-lg">Processing Status</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {stats?.statusCounts.map((status) => (
                    <div key={status._id} className="flex items-center justify-between py-2">
                      <div className="flex items-center space-x-2 min-w-0">
                        {status._id === 'completed' && <Check className="w-4 h-4 text-green-500" />}
                        {status._id === 'processing' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                        {status._id === 'pending' && <Clock className="w-4 h-4 text-yellow-500" />}
                        {status._id === 'failed' && <X className="w-4 h-4 text-red-500" />}
                        <span className="capitalize text-sm sm:text-base truncate">{status._id}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0">{status.count}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Upload Dialog */}
        <Dialog 
          open={showUploadDialog} 
          onOpenChange={(open) => {
            setShowUploadDialog(open);
            if (!open) {
              // Reset state when dialog closes
              setSelectedFile(null);
              setUploadProgress(0);
            }
          }}
        >
          <DialogContent className="max-w-[95vw] w-full sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">Upload Document</DialogTitle>
            </DialogHeader>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">
                {selectedFile ? selectedFile.name : 'Drop your document here'}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Supports PDF, DOC, TXT, MD, and more
              </p>
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.md,.html,.json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setSelectedFile(file);
                  }
                }}
              />
              <div className="space-y-4">
                <Button 
                  variant="outline" 
                  disabled={uploadProgress > 0 && uploadProgress < 100}
                  onClick={() => document.getElementById('file-upload')?.click()}
                  type="button"
                >
                  <FileIcon className="w-4 h-4 mr-2" />
                  {selectedFile ? 'Change File' : 'Choose File'}
                </Button>
                
                {selectedFile && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>Selected: {selectedFile.name}</span>
                      <span>({Math.round(selectedFile.size / 1024)} KB)</span>
                    </div>
                    
                    <Button 
                      onClick={() => handleFileUpload(selectedFile)}
                      disabled={uploadProgress > 0 && uploadProgress < 100}
                      className="w-full"
                    >
                      {uploadProgress > 0 && uploadProgress < 100 ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading... {uploadProgress}%
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Document
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Document Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-[95vw] w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">Create New Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Title</label>
                <Input
                  value={newDocument.title}
                  onChange={(e) => setNewDocument(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Document title"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Content</label>
                <Textarea
                  value={newDocument.content}
                  onChange={(e) => setNewDocument(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Document content"
                  rows={10}
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Type</label>
                  <Select
                    value={newDocument.documentType}
                    onValueChange={(value) => setNewDocument(prev => ({ ...prev, documentType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="markdown">Markdown</SelectItem>
                      <SelectItem value="code">Code</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Category</label>
                  <Select
                    value={newDocument.category}
                    onValueChange={(value) => setNewDocument(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="personal">Personal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Tags</label>
                <Input
                  value={newDocument.tags}
                  onChange={(e) => setNewDocument(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="tag1, tag2, tag3"
                />
              </div>
              
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-0 sm:space-x-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="order-2 sm:order-1">
                  Cancel
                </Button>
                <Button onClick={handleCreateDocument} className="order-1 sm:order-2">
                  Create Document
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Document Viewer Dialog */}
        <Dialog 
          open={!!selectedDocument} 
          onOpenChange={(open) => {
            if (!open) {
              setSelectedDocument(null);
            }
          }}
        >
          <DialogContent className="max-w-[95vw] w-full sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2 text-sm sm:text-base">
                {selectedDocument && getDocumentIcon(selectedDocument.documentType)}
                <span className="truncate min-w-0 flex-1">{selectedDocument?.title}</span>
                <Badge className={`${getStatusColor(selectedDocument?.metadata.processingStatus || '')} text-xs shrink-0`}>
                  <span className="hidden sm:inline">{selectedDocument?.metadata.processingStatus}</span>
                  <span className="sm:hidden">
                    {selectedDocument?.metadata.processingStatus === 'completed' ? '✓' : 
                     selectedDocument?.metadata.processingStatus === 'processing' ? '⟳' : 
                     selectedDocument?.metadata.processingStatus === 'pending' ? '⏳' : '✗'}
                  </span>
                </Badge>
              </DialogTitle>
            </DialogHeader>
            
            {selectedDocument && (
              <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
                {/* Document Metadata */}
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-xs sm:text-sm text-gray-600">
                      Updated: {formatDate(selectedDocument.updatedAt)}
                    </span>
                  </div>
                  
                  {selectedDocument.metadata.fileSize && (
                    <div className="flex items-center space-x-2">
                      <FileIcon className="w-4 h-4 text-gray-500" />
                      <span className="text-xs sm:text-sm text-gray-600">
                        {formatFileSize(selectedDocument.metadata.fileSize)}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    <Tag className="w-4 h-4 text-gray-500" />
                    <span className="text-xs sm:text-sm text-gray-600">
                      {selectedDocument.metadata.category}
                    </span>
                  </div>
                  
                  {selectedDocument.chunks && selectedDocument.chunks.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <Network className="w-4 h-4 text-green-500" />
                      <span className="text-xs sm:text-sm text-gray-600">
                        {selectedDocument.chunks.length} chunks
                      </span>
                    </div>
                  )}
                  
                  {selectedDocument.graphNodes && selectedDocument.graphNodes.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <Brain className="w-4 h-4 text-blue-500" />
                      <span className="text-xs sm:text-sm text-gray-600">
                        {selectedDocument.graphNodes.length} entities
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Document Tags */}
                {selectedDocument.metadata.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedDocument.metadata.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                
                {/* Document Content */}
                <div className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full w-full">
                    <div className="p-4 bg-white border rounded-lg">
                      {selectedDocument.documentType === 'pdf' ? (
                        <div className="text-center py-8">
                          <FileText className="w-16 h-16 text-red-500 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">PDF Document</h3>
                          <p className="text-muted-foreground mb-4">
                            {selectedDocument.metadata.originalFilename}
                          </p>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">
                            {selectedDocument.content}
                          </p>
                        </div>
                      ) : selectedDocument.documentType === 'markdown' ? (
                        <div className="prose max-w-none">
                          <pre className="whitespace-pre-wrap font-mono text-sm">
                            {selectedDocument.content}
                          </pre>
                        </div>
                      ) : selectedDocument.documentType === 'code' ? (
                        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                          <pre className="text-sm">
                            <code>{selectedDocument.content}</code>
                          </pre>
                        </div>
                      ) : (
                        <div className="prose max-w-none">
                          <p className="text-sm whitespace-pre-wrap">
                            {selectedDocument.content}
                          </p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 pt-4 border-t">
                  <div className="flex items-center justify-center sm:justify-start space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownloadDocument(selectedDocument)}
                      className="flex-1 sm:flex-none"
                    >
                      <Download className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Download</span>
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                      <Share2 className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Share</span>
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-center sm:justify-end space-x-2">
                    <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                      <Settings className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Edit</span>
                    </Button>
                    <Button variant="destructive" size="sm" className="flex-1 sm:flex-none">
                      <Trash2 className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Delete</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
};

export default DocsPage;