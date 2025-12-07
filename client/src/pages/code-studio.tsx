import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  FileCode, 
  Sparkles, 
  Code2, 
  Bug, 
  Lightbulb, 
  RefreshCw,
  Copy,
  Check,
  Loader2,
  X,
  File,
  Zap
} from "lucide-react";

interface AnalysisResult {
  summary: string;
  suggestions: string[];
  bugs: string[];
  improvements: string[];
  codeQuality: number;
}

export default function CodeStudio() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [generatedCode, setGeneratedCode] = useState("");
  const [prompt, setPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyzeMutation = useMutation({
    mutationFn: async (codeToAnalyze: string) => {
      const response = await apiRequest("POST", "/api/ai/analyze", { code: codeToAnalyze });
      return response.json();
    },
    onSuccess: (data) => {
      setAnalysisResult(data);
    },
    onError: (error) => {
      toast({ title: "Analysis failed", description: error.message, variant: "destructive" });
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (userPrompt: string) => {
      const response = await apiRequest("POST", "/api/ai/generate", { prompt: userPrompt });
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedCode(data.code);
    },
    onError: (error) => {
      toast({ title: "Generation failed", description: error.message, variant: "destructive" });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      const text = await file.text();
      setCode(text);
    }
  };

  const handleAnalyze = () => {
    if (!code.trim()) {
      toast({ title: "No code", description: "Please enter or upload some code to analyze", variant: "destructive" });
      return;
    }
    analyzeMutation.mutate(code);
  };

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast({ title: "No prompt", description: "Please describe what code you want to generate", variant: "destructive" });
      return;
    }
    generateMutation.mutate(prompt);
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied!" });
  };

  const getQualityColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-code-studio-title">
          <Code2 className="h-8 w-8 text-primary" />
          AI Code Studio
        </h1>
        <p className="text-muted-foreground">Analyze, improve, and generate code with AI</p>
      </div>

      <Tabs defaultValue="analyze">
        <TabsList>
          <TabsTrigger value="analyze" data-testid="tab-analyze">
            <Bug className="h-4 w-4 mr-2" />
            Analyze Code
          </TabsTrigger>
          <TabsTrigger value="generate" data-testid="tab-generate">
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Code
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analyze" className="space-y-4 mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Input Code</CardTitle>
                <CardDescription>Paste your code or upload a file</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-upload-file"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload File
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.go,.rs,.rb,.php,.css,.html,.json"
                    onChange={handleFileUpload}
                  />
                  {uploadedFile && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <File className="h-3 w-3" />
                      {uploadedFile.name}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 ml-1"
                        onClick={() => {
                          setUploadedFile(null);
                          setCode("");
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  )}
                </div>
                <Textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="// Paste your code here..."
                  className="font-mono min-h-[300px]"
                  data-testid="textarea-code-input"
                />
                <Button
                  onClick={handleAnalyze}
                  disabled={analyzeMutation.isPending || !code.trim()}
                  className="w-full"
                  data-testid="button-analyze"
                >
                  {analyzeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  Analyze Code
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Analysis Results</CardTitle>
                <CardDescription>AI-powered code analysis</CardDescription>
              </CardHeader>
              <CardContent>
                {analyzeMutation.isPending ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">Analyzing your code...</p>
                  </div>
                ) : analysisResult ? (
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Code Quality Score</span>
                        <span className={`text-2xl font-bold ${getQualityColor(analysisResult.codeQuality)}`}>
                          {analysisResult.codeQuality}/100
                        </span>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <FileCode className="h-4 w-4" />
                          Summary
                        </h4>
                        <p className="text-sm text-muted-foreground">{analysisResult.summary}</p>
                      </div>

                      {analysisResult.bugs.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2 text-red-500">
                            <Bug className="h-4 w-4" />
                            Potential Bugs ({analysisResult.bugs.length})
                          </h4>
                          <ul className="space-y-1">
                            {analysisResult.bugs.map((bug, i) => (
                              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                <span className="text-red-500">-</span>
                                {bug}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {analysisResult.suggestions.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2 text-yellow-500">
                            <Lightbulb className="h-4 w-4" />
                            Suggestions ({analysisResult.suggestions.length})
                          </h4>
                          <ul className="space-y-1">
                            {analysisResult.suggestions.map((suggestion, i) => (
                              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                <span className="text-yellow-500">-</span>
                                {suggestion}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {analysisResult.improvements.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2 text-green-500">
                            <RefreshCw className="h-4 w-4" />
                            Improvements ({analysisResult.improvements.length})
                          </h4>
                          <ul className="space-y-1">
                            {analysisResult.improvements.map((improvement, i) => (
                              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                <span className="text-green-500">-</span>
                                {improvement}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Code2 className="h-12 w-12 mb-4 opacity-50" />
                    <p>Enter code and click Analyze to see results</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="generate" className="space-y-4 mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Describe Your Code</CardTitle>
                <CardDescription>Tell the AI what code you need</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe what code you want to generate...

Example:
- Create a React hook for managing form state with validation
- Write a Python function to merge two sorted arrays
- Generate a TypeScript class for a shopping cart"
                  className="min-h-[300px]"
                  data-testid="textarea-prompt-input"
                />
                <Button
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending || !prompt.trim()}
                  className="w-full"
                  data-testid="button-generate"
                >
                  {generateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Generate Code
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">Generated Code</CardTitle>
                  <CardDescription>AI-generated code output</CardDescription>
                </div>
                {generatedCode && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(generatedCode)}
                    data-testid="button-copy-generated"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 mr-2" />
                    ) : (
                      <Copy className="h-4 w-4 mr-2" />
                    )}
                    Copy
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {generateMutation.isPending ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">Generating code...</p>
                  </div>
                ) : generatedCode ? (
                  <ScrollArea className="h-[400px]">
                    <pre className="p-4 bg-muted rounded-lg font-mono text-sm whitespace-pre-wrap overflow-x-auto">
                      {generatedCode}
                    </pre>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Sparkles className="h-12 w-12 mb-4 opacity-50" />
                    <p>Describe what you need and click Generate</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
