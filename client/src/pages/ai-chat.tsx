import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Send, 
  Plus, 
  Trash2, 
  Loader2, 
  Sparkles, 
  User,
  MessageSquare,
  PanelLeftClose,
  PanelLeft,
  Copy,
  Check
} from "lucide-react";
import type { AiConversation, AiMessage } from "@shared/schema";

interface ConversationWithMessages extends AiConversation {
  messages: AiMessage[];
}

export default function AiChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: conversations, isLoading: conversationsLoading } = useQuery<ConversationWithMessages[]>({
    queryKey: ["/api/ai/conversations"],
    enabled: !!user,
  });

  const { data: currentConversation, isLoading: messagesLoading } = useQuery<ConversationWithMessages>({
    queryKey: ["/api/ai/conversations", selectedConversationId],
    enabled: !!selectedConversationId,
  });

  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/ai/conversations", { title: "New Conversation" });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/conversations"] });
      setSelectedConversationId(data.id);
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", `/api/ai/conversations/${selectedConversationId}/messages`, { content });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/conversations", selectedConversationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/conversations"] });
      setInput("");
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/ai/conversations/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/conversations"] });
      if (selectedConversationId) {
        setSelectedConversationId(null);
      }
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentConversation?.messages]);

  useEffect(() => {
    if (conversations && conversations.length > 0 && !selectedConversationId) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  const handleSend = () => {
    if (!input.trim() || sendMessageMutation.isPending) return;
    
    if (!selectedConversationId) {
      createConversationMutation.mutate();
      return;
    }
    
    sendMessageMutation.mutate(input.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderMessage = (message: AiMessage) => {
    const isUser = message.role === "user";
    return (
      <div
        key={message.id}
        className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
        data-testid={`message-${message.id}`}
      >
        <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${isUser ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
          {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        </div>
        <div className={`flex-1 max-w-[80%] ${isUser ? "text-right" : ""}`}>
          <div className={`inline-block p-3 rounded-lg ${isUser ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
            <pre className="whitespace-pre-wrap font-sans text-sm">{message.content}</pre>
          </div>
          {!isUser && (
            <Button
              variant="ghost"
              size="icon"
              className="mt-1 h-6 w-6"
              onClick={() => copyToClipboard(message.content, message.id)}
              data-testid={`button-copy-${message.id}`}
            >
              {copiedId === message.id ? (
                <Check className="h-3 w-3" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full">
      {showSidebar && (
        <div className="w-64 border-r flex flex-col bg-muted/30">
          <div className="p-3 border-b flex items-center justify-between gap-2">
            <span className="font-medium text-sm">Conversations</span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => createConversationMutation.mutate()}
              disabled={createConversationMutation.isPending}
              data-testid="button-new-conversation"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {conversationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : conversations && conversations.length > 0 ? (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`group flex items-center gap-2 p-2 rounded-md cursor-pointer hover-elevate ${
                      selectedConversationId === conv.id ? "bg-accent" : ""
                    }`}
                    onClick={() => setSelectedConversationId(conv.id)}
                    data-testid={`conversation-${conv.id}`}
                  >
                    <MessageSquare className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 text-sm truncate">{conv.title}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversationMutation.mutate(conv.id);
                      }}
                      data-testid={`button-delete-${conv.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No conversations yet</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      <div className="flex-1 flex flex-col">
        <div className="border-b p-3 flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowSidebar(!showSidebar)}
            data-testid="button-toggle-sidebar"
          >
            {showSidebar ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </Button>
          <h1 className="font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Assistant
          </h1>
          <span className="text-xs text-muted-foreground ml-auto">Powered by Groq</span>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="max-w-3xl mx-auto space-y-4">
            {!selectedConversationId ? (
              <div className="text-center py-12">
                <Sparkles className="h-16 w-16 mx-auto mb-4 text-primary opacity-50" />
                <h2 className="text-xl font-semibold mb-2">Welcome to AI Chat</h2>
                <p className="text-muted-foreground mb-4">
                  Start a conversation with our AI assistant. Ask questions, get help with code, or just chat!
                </p>
                <Button onClick={() => createConversationMutation.mutate()} data-testid="button-start-conversation">
                  <Plus className="h-4 w-4 mr-2" />
                  Start Conversation
                </Button>
              </div>
            ) : messagesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : currentConversation?.messages && currentConversation.messages.length > 0 ? (
              <>
                {currentConversation.messages.map(renderMessage)}
                {sendMessageMutation.isPending && (
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="bg-muted p-3 rounded-lg">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>Send a message to start chatting</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="border-t p-4">
          <div className="max-w-3xl mx-auto flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={selectedConversationId ? "Type your message..." : "Start a new conversation..."}
              disabled={sendMessageMutation.isPending || !selectedConversationId}
              data-testid="input-chat-message"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || sendMessageMutation.isPending || !selectedConversationId}
              data-testid="button-send-message"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
