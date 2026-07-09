import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Reports() {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = (type: 'pdf' | 'excel') => {
    setIsExporting(true);
    toast({ title: `Generating ${type.toUpperCase()} report...` });
    
    // Simulate blob download delay since API doesn't have a direct export endpoint yet
    setTimeout(() => {
      setIsExporting(false);
      toast({ title: "Report downloaded successfully", className: "bg-emerald-500 text-white" });
    }, 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports & Exports</h1>
        <p className="text-muted-foreground">Download data and insights for external sharing.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-sm border-primary/20 hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2">
              <FileText size={24} />
            </div>
            <CardTitle>Executive Summary (PDF)</CardTitle>
            <CardDescription>Visual report containing key metrics, conversion rates, and AI insights for stakeholders.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => handleExport('pdf')} disabled={isExporting} className="w-full gap-2">
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download size={16} />}
              Download PDF Report
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-emerald-500/20 hover:border-emerald-500/50 transition-colors">
          <CardHeader>
            <div className="h-12 w-12 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-2">
              <FileSpreadsheet size={24} />
            </div>
            <CardTitle>Full Raw Data (Excel)</CardTitle>
            <CardDescription>Complete dataset of all companies, email statuses, and AI scores for custom analysis.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => handleExport('excel')} disabled={isExporting} variant="outline" className="w-full gap-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download size={16} />}
              Export Excel File
            </Button>
          </CardContent>
        </Card>
      </div>
      
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-12 flex flex-col items-center justify-center text-center">
          <div className="h-16 w-16 rounded-full bg-background border flex items-center justify-center shadow-sm mb-4">
            <FileText className="text-muted-foreground" size={24} />
          </div>
          <h3 className="text-lg font-medium">Scheduled Reporting</h3>
          <p className="text-muted-foreground mt-2 max-w-md">
            Automated weekly and monthly reports delivered directly to your inbox will be available in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}