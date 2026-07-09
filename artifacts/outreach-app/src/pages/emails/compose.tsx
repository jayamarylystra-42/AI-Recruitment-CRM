import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useListCompanies, useListCampaigns, useGenerateEmail, useCreateEmail, useSendEmail, getListEmailsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bot, Save, Send, Loader2, Sparkles, ArrowLeft, FileText, Mail, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { getGmailStatus, createEmailDraft, type GmailStatus } from "@/lib/gmail-api";

export default function ComposeEmail() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialCompanyId = searchParams.get("companyId");

  const [companyId, setCompanyId] = useState(initialCompanyId || "");
  const [campaignId, setCampaignId] = useState("");
  const [templateType, setTemplateType] = useState("Cold Email");
  const [tone, setTone] = useState("Professional");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [signature, setSignature] = useState("Best regards,\n[Your Name]");

  const [gmailStatus, setGmailStatus] = useState<GmailStatus | null>(null);
  const [gmailChecked, setGmailChecked] = useState(false);
  const [draftPending, setDraftPending] = useState(false);

  const { data: companiesData } = useListCompanies({ limit: 100 });
  const companies = companiesData?.companies || [];

  const { data: campaigns } = useListCampaigns();

  const generateMutation = useGenerateEmail();
  const createMutation = useCreateEmail();
  const sendMutation = useSendEmail();

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Check Gmail connection on mount
  useEffect(() => {
    getGmailStatus()
      .then(setGmailStatus)
      .catch(() => setGmailStatus({ connected: false, email: null }))
      .finally(() => setGmailChecked(true));
  }, []);

  const handleGenerate = () => {
    if (!companyId) {
      toast({ title: "Please select a company first", variant: "destructive" });
      return;
    }
    toast({ title: "Generating email via AI…" });
    generateMutation.mutate(
      { data: { companyId: parseInt(companyId, 10), templateType, tone } },
      {
        onSuccess: (data) => {
          setSubject(data.subject);
          setBody(data.body);
          if (data.signature) setSignature(data.signature);
          toast({ title: "Email generated successfully", className: "bg-emerald-500 text-white" });
        },
        onError: () => toast({ title: "Generation failed", variant: "destructive" }),
      },
    );
  };

  const handleSaveDraft = async () => {
    if (!companyId || !subject || !body) {
      toast({ title: "Company, subject, and body are required", variant: "destructive" });
      return;
    }
    createMutation.mutate(
      {
        data: {
          companyId: parseInt(companyId, 10),
          campaignId: campaignId && campaignId !== "none" ? parseInt(campaignId, 10) : undefined,
          subject,
          body,
          signature,
          templateType,
          tone,
          status: "draft",
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Draft saved" });
          queryClient.invalidateQueries({ queryKey: getListEmailsQueryKey() });
          setLocation("/emails");
        },
        onError: () => toast({ title: "Failed to save draft", variant: "destructive" }),
      },
    );
  };

  /** Save to DB first, then push to Gmail as a draft */
  const handleCreateGmailDraft = async () => {
    if (!companyId || !subject || !body) {
      toast({ title: "Company, subject, and body are required", variant: "destructive" });
      return;
    }
    createMutation.mutate(
      {
        data: {
          companyId: parseInt(companyId, 10),
          campaignId: campaignId && campaignId !== "none" ? parseInt(campaignId, 10) : undefined,
          subject,
          body,
          signature,
          templateType,
          tone,
          status: "draft",
        },
      },
      {
        onSuccess: async (email) => {
          setDraftPending(true);
          try {
            await createEmailDraft(email.id);
            toast({ title: "Gmail draft created!", description: "Check your Gmail Drafts folder.", className: "bg-emerald-500 text-white" });
            queryClient.invalidateQueries({ queryKey: getListEmailsQueryKey() });
            setLocation("/emails");
          } catch (err: any) {
            toast({ title: "Failed to create Gmail draft", description: err.message, variant: "destructive" });
          } finally {
            setDraftPending(false);
          }
        },
        onError: () => toast({ title: "Failed to save email", variant: "destructive" }),
      },
    );
  };

  /** Save to DB, then send immediately via Gmail */
  const handleSend = async () => {
    if (!companyId || !subject || !body) {
      toast({ title: "Company, subject, and body are required", variant: "destructive" });
      return;
    }
    createMutation.mutate(
      {
        data: {
          companyId: parseInt(companyId, 10),
          campaignId: campaignId && campaignId !== "none" ? parseInt(campaignId, 10) : undefined,
          subject,
          body,
          signature,
          templateType,
          tone,
          status: "draft",
        },
      },
      {
        onSuccess: (email) => {
          sendMutation.mutate(
            { id: email.id },
            {
              onSuccess: () => {
                toast({ title: "Email sent via Gmail!", className: "bg-emerald-500 text-white" });
                queryClient.invalidateQueries({ queryKey: getListEmailsQueryKey() });
                setLocation("/emails");
              },
              onError: (err: any) => {
                const msg = err?.response?.data?.error ?? err?.message ?? "Failed to send email";
                if (msg.includes("GMAIL_NOT_CONNECTED") || msg.toLowerCase().includes("gmail not connected")) {
                  toast({ title: "Gmail not connected", description: "Go to Settings to connect your Gmail account.", variant: "destructive" });
                } else {
                  toast({ title: "Failed to send email", description: msg, variant: "destructive" });
                }
              },
            },
          );
        },
        onError: () => toast({ title: "Failed to create email", variant: "destructive" }),
      },
    );
  };

  const isBusy = createMutation.isPending || sendMutation.isPending || draftPending;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <Link href="/emails">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft size={18} />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compose Email</h1>
          <p className="text-muted-foreground mt-1">Generate AI-personalized outreach.</p>
        </div>
      </div>

      {/* Gmail connection banner */}
      {gmailChecked && (
        gmailStatus?.connected ? (
          <Alert className="border-emerald-500/30 bg-emerald-500/5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <AlertDescription className="text-sm">
              Sending as <span className="font-medium">{gmailStatus.email}</span>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-amber-500/30 bg-amber-500/5">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-sm">
              Gmail not connected.{" "}
              <Link href="/settings" className="underline font-medium">
                Connect in Settings
              </Link>{" "}
              to send emails and create drafts.
            </AlertDescription>
          </Alert>
        )
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* AI Settings panel */}
        <Card className="md:col-span-1 h-fit bg-muted/10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bot className="text-primary" size={18} /> AI Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Target Company *</label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Campaign (Optional)</label>
              <Select value={campaignId} onValueChange={setCampaignId}>
                <SelectTrigger>
                  <SelectValue placeholder="No campaign" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No campaign</SelectItem>
                  {campaigns?.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Template Type</label>
              <Select value={templateType} onValueChange={setTemplateType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cold Email">Cold Email</SelectItem>
                  <SelectItem value="HR Proposal">HR Proposal</SelectItem>
                  <SelectItem value="Internship Proposal">Internship Proposal</SelectItem>
                  <SelectItem value="Recruitment Proposal">Recruitment Proposal</SelectItem>
                  <SelectItem value="Business Proposal">Business Proposal</SelectItem>
                  <SelectItem value="Corporate Partnership">Corporate Partnership</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tone</label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Professional">Professional</SelectItem>
                  <SelectItem value="Friendly">Friendly</SelectItem>
                  <SelectItem value="Formal">Formal</SelectItem>
                  <SelectItem value="Executive">Executive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full mt-4 gap-2 shadow-md relative overflow-hidden group"
              onClick={handleGenerate}
              disabled={generateMutation.isPending || !companyId}
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
              {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles size={16} />}
              Generate Draft
            </Button>
          </CardContent>
        </Card>

        {/* Email editor */}
        <Card className="md:col-span-2 shadow-md">
          <CardHeader className="pb-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subject Line</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Write a compelling subject..."
                className="font-medium text-lg h-12"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email Body</label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Hi there,&#10;&#10;I noticed..."
                className="min-h-[250px] font-sans leading-relaxed resize-y"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Signature</label>
              <Textarea
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </CardContent>
          <CardFooter className="bg-muted/20 border-t pt-6 flex-col gap-3">
            <div className="flex w-full justify-end gap-3 flex-wrap">
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isBusy}
                className="gap-2"
              >
                <Save size={16} /> Save Draft
              </Button>
              <Button
                variant="outline"
                onClick={handleCreateGmailDraft}
                disabled={isBusy || !gmailStatus?.connected}
                className="gap-2"
                title={!gmailStatus?.connected ? "Connect Gmail in Settings first" : undefined}
              >
                {createMutation.isPending && draftPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText size={16} />
                )}
                Create Gmail Draft
              </Button>
              <Button
                onClick={handleSend}
                disabled={isBusy || !gmailStatus?.connected}
                className="gap-2 px-8"
                title={!gmailStatus?.connected ? "Connect Gmail in Settings first" : undefined}
              >
                {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send size={16} />}
                Send via Gmail
              </Button>
            </div>
            {gmailChecked && !gmailStatus?.connected && (
              <p className="text-xs text-muted-foreground w-full text-right">
                <Link href="/settings" className="underline">Connect Gmail</Link> to enable sending and drafts.
              </p>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
