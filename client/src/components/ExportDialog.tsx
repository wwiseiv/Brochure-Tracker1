import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Download, FileSpreadsheet, FileText, Loader2, Building2, Users, User } from "lucide-react";

type ExportFormat = "csv" | "xlsx";
type ExportScope = "my" | "company" | "rm" | "agent";

interface TeamMember {
  id: number;
  userId: string;
  role: string;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
}

interface ExportDialogProps {
  title: string;
  description: string;
  exportEndpoint: string;
  buttonLabel?: string;
  buttonVariant?: "default" | "outline" | "ghost" | "secondary";
  buttonSize?: "default" | "sm" | "lg" | "icon";
  showScopeFunnel?: boolean;
  isAdmin?: boolean;
}

export function ExportDialog({
  title,
  description,
  exportEndpoint,
  buttonLabel = "Export",
  buttonVariant = "outline",
  buttonSize = "sm",
  showScopeFunnel = false,
  isAdmin = false,
}: ExportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [scope, setScope] = useState<ExportScope>("my");
  const [selectedRmId, setSelectedRmId] = useState<string>("");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const { data: teamMembers = [] } = useQuery<TeamMember[]>({
    queryKey: ["/api/admin/team"],
    enabled: isOpen && isAdmin && showScopeFunnel,
  });

  const relationshipManagers = teamMembers.filter(
    (m) => m.role === "relationship_manager" || m.role === "master_admin"
  );

  const agents = teamMembers.filter((m) => m.role === "agent");

  useEffect(() => {
    if (!isOpen) {
      setScope("my");
      setSelectedRmId("");
      setSelectedAgentId("");
    }
  }, [isOpen]);

  const getMemberDisplayName = (member: TeamMember) => {
    if (member.user?.firstName || member.user?.lastName) {
      return `${member.user.firstName || ""} ${member.user.lastName || ""}`.trim();
    }
    return member.user?.email || `User ${member.userId.slice(0, 8)}`;
  };

  const canExport = () => {
    if (!isAdmin || !showScopeFunnel) return true;
    if (scope === "my" || scope === "company") return true;
    if (scope === "rm" && selectedRmId) return true;
    if (scope === "agent" && selectedAgentId) return true;
    return false;
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      let url = `${exportEndpoint}?format=${format}`;
      
      if (isAdmin && showScopeFunnel && scope !== "my") {
        url += `&scope=${scope}`;
        if (scope === "rm" && selectedRmId) {
          url += `&rmId=${selectedRmId}`;
        } else if (scope === "agent" && selectedAgentId) {
          url += `&agentId=${selectedAgentId}`;
        }
      }
      
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
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {isAdmin && showScopeFunnel && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Export Scope</Label>
              <RadioGroup
                value={scope}
                onValueChange={(value) => {
                  setScope(value as ExportScope);
                  setSelectedRmId("");
                  setSelectedAgentId("");
                }}
                className="space-y-3"
              >
                <div className="flex items-center space-x-3 p-3 border rounded-md hover-elevate cursor-pointer">
                  <RadioGroupItem value="my" id="scope-my" data-testid="radio-scope-my" />
                  <Label htmlFor="scope-my" className="flex items-center gap-2 cursor-pointer flex-1">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">My Data Only</p>
                      <p className="text-xs text-muted-foreground">Export only your own records</p>
                    </div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-3 p-3 border rounded-md hover-elevate cursor-pointer">
                  <RadioGroupItem value="company" id="scope-company" data-testid="radio-scope-company" />
                  <Label htmlFor="scope-company" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">All Company</p>
                      <p className="text-xs text-muted-foreground">Export entire organization's data</p>
                    </div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-3 p-3 border rounded-md hover-elevate cursor-pointer">
                  <RadioGroupItem value="rm" id="scope-rm" data-testid="radio-scope-rm" />
                  <Label htmlFor="scope-rm" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">By Relationship Manager</p>
                      <p className="text-xs text-muted-foreground">Export RM and their team's data</p>
                    </div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-3 p-3 border rounded-md hover-elevate cursor-pointer">
                  <RadioGroupItem value="agent" id="scope-agent" data-testid="radio-scope-agent" />
                  <Label htmlFor="scope-agent" className="flex items-center gap-2 cursor-pointer flex-1">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">By Agent</p>
                      <p className="text-xs text-muted-foreground">Export specific agent's data</p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
              
              {scope === "rm" && (
                <div className="space-y-2 pt-2">
                  <Label>Select Relationship Manager</Label>
                  <Select value={selectedRmId} onValueChange={setSelectedRmId}>
                    <SelectTrigger className="min-h-touch" data-testid="select-rm">
                      <SelectValue placeholder="Choose an RM..." />
                    </SelectTrigger>
                    <SelectContent>
                      {relationshipManagers.map((rm) => (
                        <SelectItem key={rm.userId} value={rm.userId}>
                          {getMemberDisplayName(rm)}
                          <span className="text-muted-foreground ml-2">
                            ({rm.role === "master_admin" ? "Admin" : "RM"})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {scope === "agent" && (
                <div className="space-y-2 pt-2">
                  <Label>Select Agent</Label>
                  <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                    <SelectTrigger className="min-h-touch" data-testid="select-agent">
                      <SelectValue placeholder="Choose an agent..." />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((agent) => (
                        <SelectItem key={agent.userId} value={agent.userId}>
                          {getMemberDisplayName(agent)}
                        </SelectItem>
                      ))}
                      {agents.length === 0 && (
                        <SelectItem value="_none" disabled>
                          No agents found
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          
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
            disabled={isExporting || !canExport()}
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
