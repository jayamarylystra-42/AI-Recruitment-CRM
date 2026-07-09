import { Link } from "wouter";
import { ArrowRight, Bot, Target, Zap, BarChart3, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <header className="py-6 px-8 max-w-7xl mx-auto w-full flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
            <Bot size={20} />
          </div>
          <span className="font-bold text-xl tracking-tight">Outreach<span className="text-primary">AI</span></span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/sign-in">
            <Button variant="ghost" className="font-medium text-muted-foreground hover:text-foreground">Log in</Button>
          </Link>
          <Link href="/sign-up">
            <Button className="font-medium">Get Started</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center">
        {/* Hero Section */}
        <section className="w-full relative px-6 py-24 md:py-32 flex flex-col items-center text-center overflow-hidden">
          <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background"></div>
          
          <div className="z-10 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              <Zap size={14} className="mr-2" />
              Gemini AI-Powered Outreach
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-foreground">
              Command your outreach with <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">precision intelligence.</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Find the right companies, analyze hiring signals instantly, and generate hyper-personalized outreach at scale. Built for ambitious sales and recruitment teams.
            </p>
            
            <div className="flex items-center justify-center gap-4 pt-4">
              <Link href="/sign-up">
                <Button size="lg" className="h-14 px-8 text-base font-semibold group">
                  Start Sourcing Now
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="h-14 px-8 text-base font-medium">
                Book Demo
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="w-full px-6 py-24 bg-muted/30 border-y border-border">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Target size={24} />
              </div>
              <h3 className="text-2xl font-bold">Deep AI Analysis</h3>
              <p className="text-muted-foreground leading-relaxed">
                Gemini AI analyzes companies to detect hiring signals, generate lead scores, and recommend the exact strategy to convert them.
              </p>
            </div>
            <div className="space-y-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Bot size={24} />
              </div>
              <h3 className="text-2xl font-bold">Smart Generation</h3>
              <p className="text-muted-foreground leading-relaxed">
                Never send a generic template again. Generate highly personalized emails with custom tones based on specific company intelligence.
              </p>
            </div>
            <div className="space-y-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <BarChart3 size={24} />
              </div>
              <h3 className="text-2xl font-bold">Command Center</h3>
              <p className="text-muted-foreground leading-relaxed">
                Track open rates, replies, and campaign health in real-time. Manage your entire pipeline from a single, dark-themed dashboard.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 px-6 text-center text-muted-foreground text-sm border-t border-border">
        <p>&copy; {new Date().getFullYear()} OutreachAI. All rights reserved.</p>
      </footer>
    </div>
  );
}