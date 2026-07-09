import { useParams, Link } from "wouter";
import { useGetCompany, useAnalyzeCompany, getGetCompanyQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BrainCircuit, ArrowLeft, Building2, MapPin, Globe, Mail, Users, Target, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CompanyDetail() {
  const { id } = useParams();
  const companyId = parseInt(id || "0", 10);
  const { data: company, isLoading } = useGetCompany(companyId, { query: { enabled: !!companyId, queryKey: getGetCompanyQueryKey(companyId) } });
  
  const analyzeMutation = useAnalyzeCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleAnalyze = () => {
    toast({ title: "Starting AI Analysis..." });
    analyzeMutation.mutate({ id: companyId }, {
      onSuccess: () => {
        toast({ title: "Analysis complete", className: "bg-emerald-500 text-white" });
        queryClient.invalidateQueries({ queryKey: getGetCompanyQueryKey(companyId) });
      },
      onError: () => toast({ title: "Analysis failed", variant: "destructive" })
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!company) {
    return <div>Company not found</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex items-center gap-4">
        <Link href="/companies">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft size={18} />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{company.name}</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            {company.industry && <span className="flex items-center gap-1"><Building2 size={14}/> {company.industry}</span>}
            {company.city && <span className="flex items-center gap-1"><MapPin size={14}/> {company.city}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {company.priority && (
            <Badge variant={company.priority === 'high' ? 'destructive' : company.priority === 'medium' ? 'warning' : 'success'} className="uppercase px-3 py-1">
              {company.priority} Priority
            </Badge>
          )}
          <Button onClick={handleAnalyze} disabled={analyzeMutation.isPending} className="gap-2 shadow-lg hover:shadow-primary/20 transition-all">
            <BrainCircuit size={16} className={analyzeMutation.isPending ? "animate-pulse" : ""} />
            {analyzeMutation.isPending ? "Analyzing..." : "Re-Analyze with AI"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 shadow-sm h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {company.website && (
              <div className="flex items-center gap-3 text-sm">
                <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground"><Globe size={16} /></div>
                <div className="flex-1 overflow-hidden">
                  <div className="text-xs text-muted-foreground mb-0.5">Website</div>
                  <a href={company.website} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate block">
                    {company.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              </div>
            )}
            {company.email && (
              <div className="flex items-center gap-3 text-sm">
                <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground"><Mail size={16} /></div>
                <div className="flex-1 overflow-hidden">
                  <div className="text-xs text-muted-foreground mb-0.5">Contact Email</div>
                  <a href={`mailto:${company.email}`} className="text-foreground hover:underline truncate block">{company.email}</a>
                </div>
              </div>
            )}
            {company.employees && (
              <div className="flex items-center gap-3 text-sm">
                <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground"><Users size={16} /></div>
                <div className="flex-1 overflow-hidden">
                  <div className="text-xs text-muted-foreground mb-0.5">Employees</div>
                  <div className="text-foreground">{company.employees}</div>
                </div>
              </div>
            )}
            <div className="pt-4 mt-4 border-t">
              <div className="text-xs text-muted-foreground mb-2">System Status</div>
              <div className="flex flex-wrap gap-2">
                {company.hiringNow && <Badge className="bg-emerald-500">Hiring Now</Badge>}
                {company.potentialClient && <Badge variant="secondary">Potential Client</Badge>}
                <Badge variant="outline" className="capitalize">{company.status || 'Discovered'}</Badge>
              </div>
            </div>
            <Link href={`/emails/compose?companyId=${company.id}`}>
              <Button className="w-full mt-2 gap-2"><Mail size={16}/> Compose Email</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-primary/20 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 p-30 opacity-5 pointer-events-none">
            <BrainCircuit size={200} />
          </div>
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <CardTitle className="text-lg flex items-center gap-2">
              <BrainCircuit className="text-primary" size={20} />
              AI Intelligence
              {company.aiAnalyzedAt && (
                <span className="text-xs font-normal text-muted-foreground ml-auto">
                  Last analyzed: {new Date(company.aiAnalyzedAt).toLocaleDateString()}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {!company.aiSummary && !company.aiLeadScore ? (
              <div className="text-center py-10">
                <BrainCircuit size={48} className="mx-auto text-muted-foreground opacity-20 mb-4" />
                <p className="text-muted-foreground">This company hasn't been fully analyzed yet.</p>
                <Button onClick={handleAnalyze} variant="outline" className="mt-4">Run Analysis Now</Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-card border rounded-lg p-4 text-center shadow-sm">
                    <div className="text-sm font-medium text-muted-foreground mb-1">Lead Score</div>
                    <div className={`text-3xl font-bold ${company.aiLeadScore! > 70 ? 'text-emerald-500' : company.aiLeadScore! > 40 ? 'text-amber-500' : 'text-destructive'}`}>
                      {company.aiLeadScore || 0}
                    </div>
                  </div>
                  <div className="bg-card border rounded-lg p-4 text-center shadow-sm">
                    <div className="text-sm font-medium text-muted-foreground mb-1">Priority Score</div>
                    <div className={`text-3xl font-bold ${company.aiPriorityScore! > 70 ? 'text-emerald-500' : company.aiPriorityScore! > 40 ? 'text-amber-500' : 'text-destructive'}`}>
                      {company.aiPriorityScore || 0}
                    </div>
                  </div>
                  <div className="bg-card border rounded-lg p-4 text-center shadow-sm">
                    <div className="text-sm font-medium text-muted-foreground mb-1">Hiring Probability</div>
                    <div className={`text-3xl font-bold ${company.aiHiringProbability! > 70 ? 'text-emerald-500' : company.aiHiringProbability! > 40 ? 'text-amber-500' : 'text-destructive'}`}>
                      {company.aiHiringProbability || 0}%
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="flex items-center gap-2 font-semibold text-foreground mb-2">
                      <Target size={16} className="text-primary"/> Executive Summary
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed bg-muted/30 p-4 rounded-lg border border-border/50">
                      {company.aiSummary || "No summary available."}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="flex items-center gap-2 font-semibold text-foreground mb-2">
                        <Activity size={16} className="text-primary"/> Recommended Strategy
                      </h4>
                      <div className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg border border-border/50 h-full">
                        {company.aiRecommendation || "No recommendation available."}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-1">Suggested Email Tone</h4>
                        <Badge variant="outline" className="text-sm px-3 py-1 font-mono bg-background">
                          {company.aiEmailTone || "Professional"}
                        </Badge>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-1">Next Best Action</h4>
                        <div className="text-sm font-medium text-primary bg-primary/10 p-3 rounded-lg border border-primary/20">
                          {company.aiNextAction || "No action defined."}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}