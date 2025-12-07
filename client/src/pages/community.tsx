import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Send, 
  Users, 
  Pin, 
  Trash2, 
  Loader2,
  MessageSquare,
  AtSign,
  Circle
} from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { VerificationBadge } from "@/components/verification-badge";
import type { ChatMessage, User } from "@shared/schema";

interface ChatMessageWithUser extends ChatMessage {
  user: User;
}

interface OnlineUser {
  id: string;
  username: string;
  isVerified: boolean;
  isAdmin: boolean;
  profileImage?: string;
}

export default function Community() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: messages, isLoading } = useQuery<ChatMessageWithUser[]>({
    queryKey: ["/api/chat/messages"],
    refetchInterval: 3000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", "/api/chat/messages", { content });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      setMessage("");
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const pinMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const response = await apiRequest("POST", `/api/chat/messages/${messageId}/pin`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      await apiRequest("DELETE", `/api/chat/messages/${messageId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const fetchOnlineUsers = async () => {
      try {
        const response = await fetch("/api/chat/online", { credentials: "include" });
        if (response.ok) {
          const users = await response.json();
          setOnlineUsers(users);
        }
      } catch {
      }
    };
    
    fetchOnlineUsers();
    const interval = setInterval(fetchOnlineUsers, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSend = () => {
    if (!message.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(message.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const pinnedMessages = messages?.filter((m) => m.isPinned) || [];

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col">
        <div className="border-b p-4">
          <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-community-title">
            <Users className="h-5 w-5 text-primary" />
            Community Chat
          </h1>
          <p className="text-sm text-muted-foreground">Chat with other developers</p>
        </div>

        {pinnedMessages.length > 0 && (
          <div className="border-b p-2 bg-muted/50">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Pin className="h-3 w-3" />
              Pinned Messages
            </div>
            {pinnedMessages.map((msg) => (
              <div key={msg.id} className="text-sm p-1 rounded bg-background" data-testid={`pinned-${msg.id}`}>
                <span className="font-medium">{msg.user.username}: </span>
                <span className="text-muted-foreground">{msg.content}</span>
              </div>
            ))}
          </div>
        )}

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : messages && messages.length > 0 ? (
              messages.filter((m) => !m.isDeleted).map((msg) => (
                <div 
                  key={msg.id} 
                  className={`group flex gap-3 ${msg.isPinned ? "bg-muted/30 p-2 rounded-lg" : ""}`}
                  data-testid={`message-${msg.id}`}
                >
                  <UserAvatar
                    username={msg.user.username}
                    profileImage={msg.user.profileImage}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{msg.user.displayName || msg.user.username}</span>
                      <VerificationBadge isVerified={msg.user.isVerified} isAdmin={msg.user.isAdmin} size="sm" />
                      <span className="text-xs text-muted-foreground">{formatTime(msg.createdAt as unknown as string)}</span>
                      {msg.isPinned && (
                        <Badge variant="secondary" className="text-xs">
                          <Pin className="h-2 w-2 mr-1" />
                          Pinned
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm mt-1 break-words">{msg.content}</p>
                    {(user?.isAdmin || msg.userId === user?.id) && (
                      <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {user?.isAdmin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-xs"
                            onClick={() => pinMessageMutation.mutate(msg.id)}
                            data-testid={`button-pin-${msg.id}`}
                          >
                            <Pin className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs text-destructive"
                          onClick={() => deleteMessageMutation.mutate(msg.id)}
                          data-testid={`button-delete-${msg.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No messages yet. Start the conversation!</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message... (use @username to mention)"
              disabled={sendMessageMutation.isPending || !user}
              data-testid="input-chat-message"
            />
            <Button
              onClick={handleSend}
              disabled={!message.trim() || sendMessageMutation.isPending || !user}
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

      <div className="w-56 border-l bg-muted/30 hidden md:block">
        <div className="p-3 border-b">
          <h3 className="font-medium text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Online ({onlineUsers.length})
          </h3>
        </div>
        <ScrollArea className="h-[calc(100%-48px)]">
          <div className="p-2 space-y-1">
            {onlineUsers.length > 0 ? (
              onlineUsers.map((onlineUser) => (
                <div
                  key={onlineUser.id}
                  className="flex items-center gap-2 p-2 rounded-lg"
                  data-testid={`online-user-${onlineUser.id}`}
                >
                  <div className="relative">
                    <UserAvatar
                      username={onlineUser.username}
                      profileImage={onlineUser.profileImage}
                      size="sm"
                    />
                    <Circle className="absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-green-500 text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-sm truncate">{onlineUser.username}</span>
                      <VerificationBadge isVerified={onlineUser.isVerified} isAdmin={onlineUser.isAdmin} size="sm" />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">No users online</p>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
