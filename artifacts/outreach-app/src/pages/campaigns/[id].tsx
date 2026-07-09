import { useParams, Link } from "wouter";
import { useGetCampaign, useListEmails, getGetCampaignQueryKey, getListEmailsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Mail, Play, Pause, Square, Percent, Reply, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function CampaignDetail() {
  const { id } = useParams();
  const campaignId = parseInt(id || "0", 10);
  
  const { data: campaign, isLoading: isCampaignLoading } = useGetCampaign(campaignId, { 
    query: { enabled: !!campaignId, queryKey: getGetCampaignQueryKey(campaignId) } 
  });
  
  const { data: emailsData, isLoading: isEmailsLoading } = useListEmails(
    { campaignId, limit: 50 },
    { query: { enabled: !!campaignId, queryKey: getListEmailsQueryKey({ campaignId, limit: 50 }) } }
  );
  const emails = emailsData || [];

  if (isCampaignLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!campaign) return <div>Campaign not found</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex items-center gap-4">
        <Link href="/campaigns">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft size={18} />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{campaign.name}</h1>
          <p className="text-muted-foreground mt-1">{campaign.description || 'No description'}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="px-3 py-1 text-sm capitalize" variant={campaign.status === 'active' ? 'default' : campaign.status === 'stopped' ? 'destructive' : 'secondary'}>
            {campaign.status}
          </Badge>
          <Link href={`/emails/compose?campaignId=${campaign.id}`}>
            <Button className="gap-2 shadow-lg"><Mail size={16}/> Compose New</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-2">
              <div className="text-sm font-medium text-muted-foreground">Emails Sent</div>
              <Mail size={16} className="text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold">{campaign.emailsSent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-2">
              <div className="text-sm font-medium text-muted-foreground">Drafts</div>
              <AlertCircle size={16} className="text-amber-500" />
            </div>
            <div className="text-3xl font-bold">{campaign.emailsDraft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-2">
              <div className="text-sm font-medium text-muted-foreground">Open Rate</div>
              <Percent size={16} className="text-primary" />
            </div>
            <div className="text-3xl font-bold">{campaign.openRate}%</div>
            <Progress value={campaign.openRate} className="h-1.5 mt-3" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-2">
              <div className="text-sm font-medium text-muted-foreground">Reply Rate</div>
              <Reply size={16} className="text-emerald-500" />
            </div>
            <div className="text-3xl font-bold">{campaign.replyRate}%</div>
            <Progress value={campaign.replyRate} className="h-1.5 mt-3 [&>div]:bg-emerald-500" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Emails</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Tone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isEmailsLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Loading emails...</TableCell>
                </TableRow>
              ) : emails.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No emails in this campaign yet.</TableCell>
                </TableRow>
              ) : (
                emails.map((email: any) => (
                  <TableRow key={email.id}>
                    <TableCell className="font-medium">
                      {email.company?.name || `ID: ${email.companyId}`}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{email.subject}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-xs">{email.tone || 'standard'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={email.status === 'sent' ? 'success' : email.status === 'failed' ? 'destructive' : 'secondary'} className="capitalize">
                        {email.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(email.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}