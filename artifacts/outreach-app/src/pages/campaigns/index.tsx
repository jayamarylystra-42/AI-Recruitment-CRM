import { useState } from "react";
import { useListCampaigns, useCreateCampaign, useUpdateCampaignStatus, getListCampaignsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Megaphone, Plus, Play, Pause, Square, ChevronRight, Mail, Reply, Percent, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function Campaigns() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "" });
  
  const { data: campaigns, isLoading } = useListCampaigns();
  const createMutation = useCreateCampaign();
  const statusMutation = useUpdateCampaignStatus();
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ data: formData }, {
      onSuccess: () => {
        setIsAddOpen(false);
        setFormData({ name: "", description: "" });
        toast({ title: "Campaign created" });
        queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
      }
    });
  };

  const handleStatusUpdate = (id: number, status: string) => {
    statusMutation.mutate({ id, data: { status } }, {
      onSuccess: () => {
        toast({ title: `Campaign ${status}` });
        queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'active': return <Badge className="bg-emerald-500">Active</Badge>;
      case 'paused': return <Badge variant="warning">Paused</Badge>;
      case 'stopped': return <Badge variant="destructive">Stopped</Badge>;
      default: return <Badge variant="secondary">Draft</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground">Manage your outreach workflows and track performance.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-lg"><Plus size={16} /> New Campaign</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Campaign</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Campaign Name</label>
                <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Q3 CTO Outreach" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Targeting mid-size tech companies..." />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Campaign
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="h-64 animate-pulse">
              <CardHeader className="h-16 bg-muted/50"></CardHeader>
            </Card>
          ))}
        </div>
      ) : campaigns?.length === 0 ? (
        <div className="text-center py-20 border rounded-xl bg-card border-dashed">
          <Megaphone className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
          <h3 className="text-lg font-medium text-foreground">No campaigns yet</h3>
          <p className="text-muted-foreground mt-2 mb-6">Create your first campaign to start reaching out.</p>
          <Button onClick={() => setIsAddOpen(true)}>Create Campaign</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns?.map(campaign => (
            <Card key={campaign.id} className="flex flex-col group overflow-hidden border-border/50 hover:border-primary/50 transition-colors shadow-sm hover:shadow-md">
              <CardHeader className="pb-4 relative">
                <div className="absolute top-4 right-4">
                  {getStatusBadge(campaign.status)}
                </div>
                <CardTitle className="text-lg pr-20 truncate" title={campaign.name}>
                  {campaign.name}
                </CardTitle>
                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px] mt-2">
                  {campaign.description || 'No description provided.'}
                </p>
              </CardHeader>
              
              <CardContent className="flex-1 pb-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-muted/50 rounded-md p-3">
                    <div className="flex items-center text-muted-foreground mb-1 text-xs font-medium">
                      <Mail size={12} className="mr-1"/> Sent
                    </div>
                    <div className="text-xl font-bold">{campaign.emailsSent}</div>
                  </div>
                  <div className="bg-muted/50 rounded-md p-3">
                    <div className="flex items-center text-muted-foreground mb-1 text-xs font-medium">
                      <Reply size={12} className="mr-1"/> Replies
                    </div>
                    <div className="text-xl font-bold">{campaign.replies}</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-muted-foreground">Open Rate</span>
                      <span>{campaign.openRate}%</span>
                    </div>
                    <Progress value={campaign.openRate} className="h-1.5 bg-secondary" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-muted-foreground">Reply Rate</span>
                      <span>{campaign.replyRate}%</span>
                    </div>
                    <Progress value={campaign.replyRate} className="h-1.5 [&>div]:bg-emerald-500" />
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="pt-4 border-t bg-muted/20 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  {campaign.status === 'draft' || campaign.status === 'paused' || campaign.status === 'stopped' ? (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-950/50"
                      onClick={() => handleStatusUpdate(campaign.id, 'active')}
                      title="Start Campaign"
                    >
                      <Play size={16} />
                    </Button>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-950/50"
                      onClick={() => handleStatusUpdate(campaign.id, 'paused')}
                      title="Pause Campaign"
                    >
                      <Pause size={16} />
                    </Button>
                  )}
                  {campaign.status !== 'stopped' && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => handleStatusUpdate(campaign.id, 'stopped')}
                      title="Stop Campaign"
                    >
                      <Square size={16} />
                    </Button>
                  )}
                </div>
                <Link href={`/campaigns/${campaign.id}`}>
                  <Button variant="secondary" size="sm" className="gap-1 h-8">
                    View Details <ChevronRight size={14} />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}