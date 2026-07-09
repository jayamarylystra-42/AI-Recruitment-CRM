import { useState } from "react";
import { useListCompanies, useCreateCompany, useDeleteCompany, useAnalyzeCompany, getListCompaniesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { BrainCircuit, Search, Plus, Trash2, ChevronRight, Upload, Loader2, Building2 } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function Companies() {
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useListCompanies({ search, limit: 100 });
  const companies = data?.companies || [];

  const createMutation = useCreateCompany();
  const deleteMutation = useDeleteCompany();
  const analyzeMutation = useAnalyzeCompany();

  const [formData, setFormData] = useState({ name: "", email: "", industry: "", website: "" });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ data: formData }, {
      onSuccess: () => {
        setIsAddOpen(false);
        setFormData({ name: "", email: "", industry: "", website: "" });
        toast({ title: "Company added successfully" });
        queryClient.invalidateQueries({ queryKey: getListCompaniesQueryKey() });
      },
      onError: () => toast({ title: "Error adding company", variant: "destructive" })
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this company?")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Company deleted" });
          queryClient.invalidateQueries({ queryKey: getListCompaniesQueryKey() });
        }
      });
    }
  };

  const handleAnalyze = (id: number) => {
    toast({ title: "Starting AI Analysis..." });
    analyzeMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Analysis complete", className: "bg-emerald-500 text-white" });
        queryClient.invalidateQueries({ queryKey: getListCompaniesQueryKey() });
      },
      onError: () => toast({ title: "Analysis failed", variant: "destructive" })
    });
  };

  const getPriorityColor = (p?: string | null) => {
    if (p === 'high') return 'destructive';
    if (p === 'medium') return 'warning';
    if (p === 'low') return 'success';
    return 'secondary';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
          <p className="text-muted-foreground">Manage and analyze your target accounts.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Upload size={16} /> Import
          </Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus size={16} /> Add Company</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Company</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Company Name</label>
                  <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Industry</label>
                  <Input value={formData.industry} onChange={e => setFormData({ ...formData, industry: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Website</label>
                  <Input type="url" placeholder="https://" value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Company
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-card border rounded-lg p-2 max-w-sm">
        <Search size={18} className="text-muted-foreground ml-2" />
        <Input 
          placeholder="Search companies..." 
          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 bg-transparent h-8"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Company</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>AI Score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Loading companies...
                </TableCell>
              </TableRow>
            ) : companies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No companies found. Try adjusting your search or add a new one.
                </TableCell>
              </TableRow>
            ) : (
              companies.map(company => (
                <TableRow key={company.id} className="group">
                  <TableCell className="font-medium">
                    <Link href={`/companies/${company.id}`} className="hover:text-primary transition-colors hover:underline">
                      {company.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{company.industry || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={getPriorityColor(company.priority)} className="capitalize">
                      {company.priority || 'None'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {company.aiLeadScore ? (
                      <span className={`font-semibold ${company.aiLeadScore > 70 ? 'text-emerald-500' : company.aiLeadScore > 40 ? 'text-amber-500' : 'text-destructive'}`}>
                        {company.aiLeadScore}/100
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {company.hiringNow ? (
                      <Badge variant="success" className="bg-emerald-500">Hiring</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">Not specified</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleAnalyze(company.id)}
                        disabled={analyzeMutation.isPending && analyzeMutation.variables?.id === company.id}
                      >
                        {analyzeMutation.isPending && analyzeMutation.variables?.id === company.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <BrainCircuit className="h-3 w-3 text-primary" />
                        )}
                        Analyze
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(company.id)}>
                        <Trash2 size={16} />
                      </Button>
                      <Link href={`/companies/${company.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ChevronRight size={16} />
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}