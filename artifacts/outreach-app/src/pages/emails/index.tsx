import { useState, useEffect } from "react";
import { useListEmails, useSendEmail, getListEmailsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link } from "wouter";
import { Mail, Send, Eye, PenLine, ChevronRight, Loader2, FileText, MoreHorizontal, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getGmailStatus, createEmailDraft, type GmailStatus } from "@/lib/gmail-api";

export default function Emails() {
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [draftPendingId, setDraftPendingId] = useState<number | null>(null);

  const { data, isLoading } = useListEmails({ limit: 100 });
  const emails = data || [];

  const sendMutation = useSendEmail();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [gmailStatus, setGmailStatus] = useState<GmailStatus | null>(null);

  useEffect(() => {
    getGmailStatus()
      .then(setGmailStatus)
      .catch(() => setGmailStatus({ connected: false, email: null }));
  }, []);

  const handleSend = (id: number) => {
    sendMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Email sent via Gmail!", className: "bg-emerald-500 text-white" });
        queryClient.invalidateQueries({ queryKey: getListEmailsQueryKey() });
        setSelectedEmail(null);
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.error ?? err?.message ?? "Failed to send email";
        if (msg.includes("GMAIL_NOT_CONNECTED") || msg.toLowerCase().includes("gmail not connected")) {
          toast({ title: "Gmail not connected", description: "Go to Settings to connect your Gmail account.", variant: "destructive" });
        } else {
          toast({ title: "Failed to send email", description: msg, variant: "destructive" });
        }
      }
    });
  };

  const handleCreateDraft = async (id: number) => {
    setDraftPendingId(id);
    try {
      await createEmailDraft(id);
      toast({ title: "Gmail draft created!", description: "Check your Gmail Drafts folder.", className: "bg-emerald-500 text-white" });
      setSelectedEmail(null);
    } catch (err: any) {
      toast({ title: "Failed to create draft", description: err.message, variant: "destructive" });
    } finally {
      setDraftPendingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'sent') return <Badge className="bg-emerald-500">Sent</Badge>;
    if (status === 'failed') return <Badge variant="destructive">Failed</Badge>;
    return <Badge variant="secondary">Draft</Badge>;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Emails</h1>
          <p className="text-muted-foreground">Manage your drafts and sent outreach.</p>
        </div>
        <Link href="/emails/compose">
          <Button className="gap-2 shadow-lg"><PenLine size={16} /> Compose Email</Button>
        </Link>
      </div>

      {/* Gmail connection banner */}
      {gmailStatus !== null && !gmailStatus.connected && (
        <Alert className="border-amber-500/30 bg-amber-500/5">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-sm">
            Gmail not connected — emails cannot be sent yet.{" "}
            <Link href="/settings" className="underline font-medium">Connect in Settings →</Link>
          </AlertDescription>
        </Alert>
      )}
      {gmailStatus?.connected && (
        <Alert className="border-emerald-500/30 bg-emerald-500/5">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <AlertDescription className="text-sm">
            Sending as <span className="font-medium">{gmailStatus.email}</span>
          </AlertDescription>
        </Alert>
      )}

      <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Company</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Type & Tone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Loading emails...
                </TableCell>
              </TableRow>
            ) : emails.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No emails found.
                </TableCell>
              </TableRow>
            ) : (
              emails.map((email: any) => (
                <TableRow key={email.id} className="group cursor-pointer hover:bg-muted/30" onClick={() => setSelectedEmail(email)}>
                  <TableCell className="font-medium">
                    {email.company?.name ?? `Company #${email.companyId}`}
                  </TableCell>
                  <TableCell className="max-w-[240px] truncate text-muted-foreground">
                    {email.subject}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-medium">{email.templateType || '—'}</span>
                      <span className="text-xs text-muted-foreground">{email.tone || '—'}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(email.status)}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedEmail(email)}>
                          <Eye size={14} className="mr-2" /> View
                        </DropdownMenuItem>
                        {email.status !== 'sent' && gmailStatus?.connected && (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleSend(email.id)}
                              disabled={sendMutation.isPending}
                            >
                              <Send size={14} className="mr-2" /> Send via Gmail
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleCreateDraft(email.id)}
                              disabled={draftPendingId === email.id}
                            >
                              <FileText size={14} className="mr-2" /> Create Gmail Draft
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Email detail dialog */}
      <Dialog open={!!selectedEmail} onOpenChange={(open) => !open && setSelectedEmail(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedEmail && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-6">{selectedEmail.subject}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="text-muted-foreground">To:</span>
                  <span className="font-medium">
                    {selectedEmail.company?.name ?? `Company #${selectedEmail.companyId}`}
                    {selectedEmail.company?.email && (
                      <span className="text-muted-foreground ml-1">({selectedEmail.company.email})</span>
                    )}
                  </span>
                </div>
                <div className="flex gap-2">
                  {getStatusBadge(selectedEmail.status)}
                  {selectedEmail.sentAt && (
                    <span className="text-xs text-muted-foreground self-center">
                      Sent {new Date(selectedEmail.sentAt).toLocaleString()}
                    </span>
                  )}
                </div>
                {!selectedEmail.company?.email && selectedEmail.status !== 'sent' && (
                  <Alert className="border-amber-500/30 bg-amber-500/5">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <AlertDescription className="text-xs">
                      This company has no email address — add one in the Companies page before sending.
                    </AlertDescription>
                  </Alert>
                )}
                <div className="rounded-lg bg-muted/30 p-4 text-sm whitespace-pre-wrap font-mono leading-relaxed border">
                  {selectedEmail.body}
                  {selectedEmail.signature && (
                    <span className="text-muted-foreground">{'\n\n--\n'}{selectedEmail.signature}</span>
                  )}
                </div>
              </div>
              {selectedEmail.status !== 'sent' && (
                <DialogFooter className="gap-2 flex-wrap">
                  {gmailStatus?.connected ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => handleCreateDraft(selectedEmail.id)}
                        disabled={draftPendingId === selectedEmail.id}
                        className="gap-2"
                      >
                        {draftPendingId === selectedEmail.id ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                        Create Gmail Draft
                      </Button>
                      <Button
                        onClick={() => handleSend(selectedEmail.id)}
                        disabled={sendMutation.isPending || !selectedEmail.company?.email}
                        className="gap-2"
                      >
                        {sendMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        Send via Gmail
                      </Button>
                    </>
                  ) : (
                    <Link href="/settings">
                      <Button variant="outline" className="gap-2">
                        <Mail size={14} /> Connect Gmail to Send
                      </Button>
                    </Link>
                  )}
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
