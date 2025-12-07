import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Code2, 
  Sparkles, 
  Crown, 
  Cpu, 
  Globe, 
  Users,
  Shield,
  Zap
} from "lucide-react";

const creators = [
  {
    name: "Lord Devine",
    title: "Visionary & Founder",
    initials: "LD",
    bio: "The mastermind behind LordDevine Developer Empire. With a vision to create the ultimate platform for developers, Lord Devine combines entrepreneurial spirit with deep technical expertise. Passionate about building tools that empower developers worldwide.",
    skills: ["Vision", "Leadership", "Strategy", "Innovation"],
    gradient: "from-purple-500 to-blue-500",
  },
  {
    name: "Axel Codex",
    title: "AI Specialist & Co-Creator",
    initials: "AC",
    bio: "The technical genius powering the AI features of the platform. Axel Codex specializes in machine learning, natural language processing, and building intelligent systems that help developers write better code faster.",
    skills: ["AI/ML", "Backend", "Algorithms", "Architecture"],
    gradient: "from-blue-500 to-cyan-500",
  },
];

const features = [
  {
    icon: Code2,
    title: "AI Code Studio",
    description: "Analyze and generate code with powerful AI assistance",
  },
  {
    icon: Users,
    title: "Community",
    description: "Connect with developers from around the world",
  },
  {
    icon: Shield,
    title: "Secure Marketplace",
    description: "Buy and sell code with confidence",
  },
  {
    icon: Zap,
    title: "Instant Delivery",
    description: "Download purchases immediately",
  },
];

export default function About() {
  return (
    <div className="min-h-full">
      <div className="relative py-16 px-6">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <div className="h-20 w-20 rounded-2xl bg-primary flex items-center justify-center">
              <Code2 className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4" data-testid="text-about-title">
            LordDevine Developer Empire
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            The ultimate platform for developers to create, share, and monetize their code. 
            Powered by cutting-edge AI and built by developers, for developers.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12 space-y-16">
        <section>
          <div className="text-center mb-8">
            <Badge className="mb-4">
              <Crown className="h-3 w-3 mr-1" />
              Meet the Creators
            </Badge>
            <h2 className="text-3xl font-bold">The Minds Behind the Platform</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {creators.map((creator) => (
              <Card key={creator.name} className="overflow-hidden" data-testid={`card-creator-${creator.name.toLowerCase().replace(" ", "-")}`}>
                <div className={`h-2 bg-gradient-to-r ${creator.gradient}`} />
                <CardContent className="pt-8 pb-6">
                  <div className="flex flex-col items-center text-center">
                    <Avatar className="h-24 w-24 mb-4">
                      <AvatarFallback className={`text-2xl font-bold bg-gradient-to-br ${creator.gradient} text-white`}>
                        {creator.initials}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="text-xl font-bold">{creator.name}</h3>
                    <p className="text-muted-foreground mb-4">{creator.title}</p>
                    <p className="text-sm text-muted-foreground mb-4">{creator.bio}</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {creator.skills.map((skill) => (
                        <Badge key={skill} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <div className="text-center mb-8">
            <Badge variant="secondary" className="mb-4">
              <Sparkles className="h-3 w-3 mr-1" />
              Platform Features
            </Badge>
            <h2 className="text-3xl font-bold">What We Offer</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="text-center hover-elevate" data-testid={`card-feature-${feature.title.toLowerCase().replace(" ", "-")}`}>
                <CardContent className="pt-6">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="text-center">
          <Card className="bg-muted/50">
            <CardContent className="py-12">
              <Globe className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                To democratize software development by providing a platform where developers of all skill levels 
                can learn, share, and earn from their code. We believe in the power of community and AI to 
                accelerate innovation and make coding accessible to everyone.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="text-center pb-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Platform Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <div className="text-3xl font-bold text-primary">10K+</div>
                <div className="text-sm text-muted-foreground">Developers</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">50K+</div>
                <div className="text-sm text-muted-foreground">Code Files</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">1M+</div>
                <div className="text-sm text-muted-foreground">Downloads</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">$500K+</div>
                <div className="text-sm text-muted-foreground">Paid to Creators</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
    }
