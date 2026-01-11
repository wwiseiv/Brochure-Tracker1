import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";

type ExportFormat = "csv" | "xlsx";

interface ExportDialogProps {
  title: string;
  description: string;
  exportEndpoint: string;
  buttonLabel?: string;
  buttonVariant?: "default" | "outline" | "ghost" | "secondary";
  buttonSize?: "default" | "sm" | "lg" | "icon";
}

export function ExportDialog({
  title,
  description,
  exportEndpoint,
  buttonLabel = "Export",
  buttonVariant = "outline",
  buttonSize = "sm",
}: ExportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const url = `${exportEndpoint}?format=${format}`;
      const response = await fetch(url, {
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Export failed");
      }
      
      const blob = await response.blob();
      const extension = format === "csv" ? "csv" : "xlsx";
      const filename = `export_${new Date().toISOString().split("T")[0]}.${extension}`;
      
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
      
      toast({
        title: "Export complete",
        description: `Your data has been exported as ${format.toUpperCase()}.`,
      });
      
      setIsOpen(false);
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message || "Could not export data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={buttonVariant} 
          size={buttonSize}
          data-testid="button-export"
        >
          <Download className="w-4 h-4 mr-2" />
          {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label className="text-base font-medium">Export Format</Label>
            <RadioGroup
              value={format}
              onValueChange={(value) => setFormat(value as ExportFormat)}
              className="grid grid-cols-2 gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" data-testid="radio-csv" />
                <Label 
                  htmlFor="csv" 
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-green-600" />
                  <div>
                    <p className="font-medium">CSV</p>
                    <p className="text-xs text-muted-foreground">Comma-separated</p>
                  </div>
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="xlsx" id="xlsx" data-testid="radio-xlsx" />
                <Label 
                  htmlFor="xlsx" 
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <div>
                    <p className="font-medium">Excel</p>
                    <p className="text-xs text-muted-foreground">XLSX format</p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>
          
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full min-h-touch"
            data-testid="button-confirm-export"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Download {format.toUpperCase()}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
