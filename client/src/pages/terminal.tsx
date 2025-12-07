import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  X, 
  Terminal as TerminalIcon,
  Maximize2,
  Minimize2,
  HelpCircle
} from "lucide-react";

interface TerminalLine {
  type: "input" | "output" | "error" | "system";
  content: string;
  timestamp: Date;
}

interface TerminalTab {
  id: string;
  name: string;
  lines: TerminalLine[];
  history: string[];
  historyIndex: number;
}

const WELCOME_MESSAGE = `Welcome to LordDevine Terminal v1.0.0
Type 'help' for available commands.
`;

export default function TerminalPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tabs, setTabs] = useState<TerminalTab[]>([
    { id: "1", name: "Terminal 1", lines: [{ type: "system", content: WELCOME_MESSAGE, timestamp: new Date() }], history: [], historyIndex: -1 }
  ]);
  const [activeTabId, setActiveTabId] = useState("1");
  const [input, setInput] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId)!;

  useEffect(() => {
    outputRef.current?.scrollTo(0, outputRef.current.scrollHeight);
  }, [activeTab.lines]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeTabId]);

  const addLine = useCallback((type: TerminalLine["type"], content: string) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeTabId
          ? { ...tab, lines: [...tab.lines, { type, content, timestamp: new Date() }] }
          : tab
      )
    );
  }, [activeTabId]);

  const executeCommand = async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    addLine("input", `${user?.username || "user"}@lorddevine:~$ ${trimmed}`);

    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeTabId
          ? { ...tab, history: [...tab.history, trimmed], historyIndex: -1 }
          : tab
      )
    );

    const [command, ...args] = trimmed.split(" ");

    switch (command.toLowerCase()) {
      case "help":
        addLine("output", `
Available Commands:
  help              - Show this help message
  clear             - Clear terminal output
  whoami            - Display current user
  balance           - Show your balance
  date              - Display current date and time
  echo [text]       - Echo text back
  ls                - List available features
  cat [file]        - Read a file (about, readme, changelog)
  version           - Show terminal version
  stats             - Show your account stats
  fortune           - Get a random developer fortune
  cowsay [text]     - Make a cow say something
  matrix            - Display matrix effect (brief)
  neofetch          - Display system info
  ping [host]       - Ping simulation
  joke              - Get a programming joke
  exit              - Close terminal tab
`);
        break;

      case "clear":
        setTabs((prev) =>
          prev.map((tab) =>
            tab.id === activeTabId ? { ...tab, lines: [] } : tab
          )
        );
        break;

      case "whoami":
        addLine("output", user?.username || "anonymous");
        break;

      case "balance":
        if (user?.hasInfiniteBalance) {
          addLine("output", "Balance: UNLIMITED");
        } else {
          addLine("output", `Balance: $${parseFloat(user?.balance || "0").toLocaleString()}`);
        }
        break;

      case "date":
        addLine("output", new Date().toString());
        break;

      case "echo":
        addLine("output", args.join(" ") || "");
        break;

      case "ls":
        addLine("output", `
drwxr-xr-x  marketplace/
drwxr-xr-x  code-studio/
drwxr-xr-x  ai-chat/
drwxr-xr-x  community/
-rw-r--r--  readme.txt
-rw-r--r--  about.txt
-rw-r--r--  changelog.txt
`);
        break;

      case "cat":
        if (args[0] === "readme" || args[0] === "readme.txt") {
          addLine("output", `
LordDevine Developer Empire
===========================
A comprehensive platform for developers featuring:
- Marketplace for buying and selling code
- AI-powered code analysis and generation
- Community chat with real-time messaging
- Virtual balance system

Created by Lord Devine & Axel Codex
`);
        } else if (args[0] === "about" || args[0] === "about.txt") {
          addLine("output", `
About LordDevine
================
Version: 1.0.0
License: Proprietary
Website: lorddevine.dev

Creators:
- Lord Devine (Visionary & Founder)
- Axel Codex (AI Specialist)
`);
        } else if (args[0] === "changelog" || args[0] === "changelog.txt") {
          addLine("output", `
Changelog
=========
v1.0.0 (2025-01-15)
- Initial release
- Marketplace functionality
- AI Code Studio
- Community chat
- Terminal emulator
`);
        } else {
          addLine("error", `cat: ${args[0] || "?"}: No such file or directory`);
        }
        break;

      case "version":
        addLine("output", "LordDevine Terminal v1.0.0");
        break;

      case "stats":
        try {
          const response = await apiRequest("GET", "/api/users/me/stats", {});
          const stats = await response.json();
          addLine("output", `
User Statistics
===============
Username: ${user?.username}
Verified: ${user?.isVerified ? "Yes" : "No"}
Admin: ${user?.isAdmin ? "Yes" : "No"}
Balance: $${parseFloat(user?.balance || "0").toLocaleString()}
Total Earnings: $${parseFloat(stats.totalEarnings || "0").toLocaleString()}
Listings: ${stats.totalListings || 0}
Purchases: ${stats.totalPurchases || 0}
`);
        } catch {
          addLine("output", `Username: ${user?.username}\nBalance: $${parseFloat(user?.balance || "0").toLocaleString()}`);
        }
        break;

      case "fortune":
        const fortunes = [
          "There are only 10 types of people: those who understand binary and those who don't.",
          "A good programmer looks both ways before crossing a one-way street.",
          "Real programmers count from 0.",
          "It works on my machine.",
          "Weeks of coding can save you hours of planning.",
          "The code is documentation enough.",
          "Copy and paste is not inheritance.",
          "Debugging is like being a detective in a crime movie where you are also the murderer.",
        ];
        addLine("output", fortunes[Math.floor(Math.random() * fortunes.length)]);
        break;

      case "cowsay":
        const text = args.join(" ") || "Moo!";
        const padding = " ".repeat(text.length);
        addLine("output", `
 ${"_".repeat(text.length + 2)}
< ${text} >
 ${"-".repeat(text.length + 2)}
        \\   ^__^
         \\  (oo)\\_______
            (__)\\       )\\/\\
                ||----w |
                ||     ||
`);
        break;

      case "matrix":
        addLine("system", "Entering the Matrix...");
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$#@";
        let matrixLines = "";
        for (let i = 0; i < 5; i++) {
          let line = "";
          for (let j = 0; j < 40; j++) {
            line += chars[Math.floor(Math.random() * chars.length)];
          }
          matrixLines += line + "\n";
        }
        addLine("output", matrixLines);
        break;

      case "neofetch":
        addLine("output", `
       /\\         ${user?.username}@lorddevine
      /  \\        ----------------------
     /    \\       OS: LordDevine Platform
    /      \\      Host: Cloud Infrastructure
   /   __   \\     Kernel: Node.js Runtime
  /   |__|   \\    Uptime: Always Online
 /_____||_____\\   Shell: LordDevine Terminal
                  Resolution: Responsive
                  Theme: ${user?.theme || "dark"}
                  Terminal: v1.0.0
`);
        break;

      case "ping":
        const host = args[0] || "lorddevine.dev";
        addLine("output", `PING ${host}: 64 bytes, seq=1, time=23ms`);
        addLine("output", `PING ${host}: 64 bytes, seq=2, time=21ms`);
        addLine("output", `PING ${host}: 64 bytes, seq=3, time=22ms`);
        addLine("output", `--- ${host} ping statistics ---`);
        addLine("output", `3 packets transmitted, 3 received, 0% packet loss`);
        break;

      case "joke":
        const jokes = [
          "Why do programmers prefer dark mode? Because light attracts bugs!",
          "Why was the JavaScript developer sad? Because he didn't Node how to Express himself.",
          "There are only 10 types of people in the world: those who understand binary, and those who don't.",
          "A SQL query walks into a bar, walks up to two tables and asks, 'Can I join you?'",
          "What's a programmer's favorite hangout place? Foo Bar.",
        ];
        addLine("output", jokes[Math.floor(Math.random() * jokes.length)]);
        break;

      case "exit":
        if (tabs.length > 1) {
          setTabs((prev) => prev.filter((t) => t.id !== activeTabId));
          setActiveTabId(tabs[0].id === activeTabId ? tabs[1].id : tabs[0].id);
        } else {
          addLine("system", "Cannot close last terminal tab");
        }
        break;

      default:
        addLine("error", `Command not found: ${command}. Type 'help' for available commands.`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      executeCommand(input);
      setInput("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (activeTab.history.length > 0) {
        const newIndex = activeTab.historyIndex < activeTab.history.length - 1 
          ? activeTab.historyIndex + 1 
          : activeTab.historyIndex;
        setTabs((prev) =>
          prev.map((tab) =>
            tab.id === activeTabId ? { ...tab, historyIndex: newIndex } : tab
          )
        );
        setInput(activeTab.history[activeTab.history.length - 1 - newIndex] || "");
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (activeTab.historyIndex > 0) {
        const newIndex = activeTab.historyIndex - 1;
        setTabs((prev) =>
          prev.map((tab) =>
            tab.id === activeTabId ? { ...tab, historyIndex: newIndex } : tab
          )
        );
        setInput(activeTab.history[activeTab.history.length - 1 - newIndex] || "");
      } else if (activeTab.historyIndex === 0) {
        setTabs((prev) =>
          prev.map((tab) =>
            tab.id === activeTabId ? { ...tab, historyIndex: -1 } : tab
          )
        );
        setInput("");
      }
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === activeTabId ? { ...tab, lines: [] } : tab
        )
      );
    }
  };

  const addTab = () => {
    const newId = Date.now().toString();
    setTabs((prev) => [
      ...prev,
      { id: newId, name: `Terminal ${prev.length + 1}`, lines: [{ type: "system", content: WELCOME_MESSAGE, timestamp: new Date() }], history: [], historyIndex: -1 }
    ]);
    setActiveTabId(newId);
  };

  const closeTab = (id: string) => {
    if (tabs.length === 1) return;
    setTabs((prev) => prev.filter((t) => t.id !== id));
    if (activeTabId === id) {
      setActiveTabId(tabs[0].id === id ? tabs[1].id : tabs[0].id);
    }
  };

  const getLineColor = (type: TerminalLine["type"]) => {
    switch (type) {
      case "input": return "text-green-400";
      case "output": return "text-foreground";
      case "error": return "text-red-400";
      case "system": return "text-blue-400";
      default: return "text-foreground";
    }
  };

  return (
    <div className={`flex flex-col ${isFullscreen ? "fixed inset-0 z-50" : "h-full"} bg-background`}>
      <div className="flex items-center gap-2 border-b p-2 bg-muted/50">
        <div className="flex-1 flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`flex items-center gap-1 px-3 py-1 rounded-t-md cursor-pointer text-sm ${
                tab.id === activeTabId ? "bg-background" : "bg-muted hover-elevate"
              }`}
              onClick={() => setActiveTabId(tab.id)}
              data-testid={`tab-${tab.id}`}
            >
              <TerminalIcon className="h-3 w-3" />
              <span>{tab.name}</span>
              {tabs.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 ml-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  data-testid={`button-close-tab-${tab.id}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={addTab}
            data-testid="button-new-tab"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => toast({ title: "Terminal Help", description: "Type 'help' for commands. Use arrow keys for history. Ctrl+L to clear." })}
            data-testid="button-help"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(!isFullscreen)}
            data-testid="button-fullscreen"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div
        ref={outputRef}
        className="flex-1 p-4 overflow-auto bg-black font-mono text-sm"
        onClick={() => inputRef.current?.focus()}
        data-testid="terminal-output"
      >
        {activeTab.lines.map((line, i) => (
          <div key={i} className={`${getLineColor(line.type)} whitespace-pre-wrap`}>
            {line.content}
          </div>
        ))}
        <div className="flex items-center text-green-400">
          <span>{user?.username || "user"}@lorddevine:~$ </span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none border-none text-foreground"
            spellCheck={false}
            autoComplete="off"
            data-testid="input-terminal"
          />
        </div>
      </div>
    </div>
  );
}
