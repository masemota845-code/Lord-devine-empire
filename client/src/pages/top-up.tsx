import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  MessageCircle, 
  Copy, 
  Check,
  Shield,
  Zap,
  Star
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const TELEGRAM_BOT_USERNAME = "LordDevineBot";
const TELEGRAM_INSTRUCTIONS = [
  "Open Telegram and search for @" + TELEGRAM_BOT_USERNAME,
  "Start a conversation with the bot",
  "Send the /topup command",
  "Follow the instructions to complete your payment",
  "Your balance will be updated within minutes",
];

const PACKAGES = [
  { amount: 100, bonus: 0, popular: false },
  { amount: 500, bonus: 50, popular: false },
  { amount: 1000, bonus: 150, popular: true },
  { amount: 2500, bonus: 500, popular: false },
  { amount: 5000, bonus: 1250, popular: false },
  { amount: 10000, bonus: 3000, popular: false },
];

export default function TopUp() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copyBotUsername = async () => {
    await navigator.clipboard.writeText("@" + TELEGRAM_BOT_USERNAME);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard!" });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-topup-title">
          <CreditCard className="h-8 w-8" />
          Add Money
        </h1>
        <p className="text-muted-foreground">
          Top up your balance to purchase items from the marketplace
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle>Current Balance</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold" data-testid="text-current-balance">
            {user?.hasInfiniteBalance ? (
              <span className="text-primary">Unlimited</span>
            ) : (
              `$${parseFloat(user?.balance || "0").toLocaleString()}`
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-blue-500" />
              <CardTitle>Top Up via Telegram</CardTitle>
            </div>
            <CardDescription>
              Fast and secure payments through our Telegram bot
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <span className="font-mono text-lg">@{TELEGRAM_BOT_USERNAME}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={copyBotUsername}
                data-testid="button-copy-bot"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">How to top up:</h4>
              <ol className="space-y-2">
                {TELEGRAM_INSTRUCTIONS.map((instruction, index) => (
                  <li key={index} className="flex gap-3 text-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                      {index + 1}
                    </span>
                    <span className="text-muted-foreground">{instruction}</span>
                  </li>
                ))}
              </ol>
            </div>

            <Button className="w-full" size="lg" data-testid="button-open-telegram">
              <MessageCircle className="h-4 w-4 mr-2" />
              Open Telegram Bot
            </Button>

            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              <Shield className="h-4 w-4 text-green-500" />
              <span>All transactions are secure and encrypted</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              <CardTitle>Quick Packages</CardTitle>
            </div>
            <CardDescription>
              Choose a package to get started quickly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {PACKAGES.map((pkg) => (
                <div
                  key={pkg.amount}
                  className={`flex items-center justify-between p-4 rounded-lg border hover-elevate cursor-pointer ${
                    pkg.popular ? "border-primary bg-primary/5" : ""
                  }`}
                  data-testid={`package-${pkg.amount}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-lg font-bold">${pkg.amount.toLocaleString()}</div>
                    {pkg.bonus > 0 && (
                      <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                        +${pkg.bonus} bonus
                      </Badge>
                    )}
                    {pkg.popular && (
                      <Badge className="bg-primary">
                        <Star className="h-3 w-3 mr-1" />
                        Popular
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">You get</div>
                    <div className="font-bold text-primary">
                      ${(pkg.amount + pkg.bonus).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground mt-4 text-center">
              Select a package and use the Telegram bot to complete your purchase
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment Methods Accepted</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-muted-foreground">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              <span>Credit/Debit Cards</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">₿</span>
              <span>Bitcoin</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">Ξ</span>
              <span>Ethereum</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">₮</span>
              <span>USDT</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
