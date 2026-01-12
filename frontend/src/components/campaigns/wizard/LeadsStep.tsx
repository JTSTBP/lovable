import { useState, useCallback, useEffect } from 'react';
import { Upload, FileSpreadsheet, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

interface Lead {
  id?: string;
  email: string;
  leadName?: string;
  fullName?: string;
  company: string;
  linkedinUrl?: string;
  industry?: string;
  status?: string;
  campaign_id?: string;
  campaigns?: { name: string } | null;
}

interface ColumnMapping {
  email: string;
  leadName: string;
  fullName: string;
  company: string;
  linkedinUrl: string;
  industry: string;
}

interface LeadsStepProps {
  leads: Lead[];
  onLeadsChange: (leads: Lead[]) => void;
}

export function LeadsStep({ leads, onLeadsChange }: LeadsStepProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"csv" | "existing">("csv");

  // CSV State
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    email: '',
    leadName: '',
    fullName: '',
    company: '',
    linkedinUrl: '',
    industry: '',
  });
  const [fileName, setFileName] = useState<string>('');

  // Existing Leads State
  const [existingLeads, setExistingLeads] = useState<Lead[]>([]);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [nameQuery, setNameQuery] = useState('');
  const [industryQuery, setIndustryQuery] = useState('');
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());

  // Initialize selected lead IDs from props if they have IDs
  useEffect(() => {
    const ids = new Set<string>();
    leads.forEach(l => {
      if (l.id) ids.add(l.id);
    });
    setSelectedLeadIds(ids);
  }, []); // Run once on mount

  // Fetch existing leads when tab changes
  useEffect(() => {
    if (activeTab === 'existing' && existingLeads.length === 0) {
      fetchExistingLeads();
    }
  }, [activeTab]);

  const fetchExistingLeads = async () => {
    setIsLoadingExisting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/leads?userId=${user?.id || ''}`);
      if (!response.ok) throw new Error('Failed to fetch leads');
      const data = await response.json();

      // Map and set leads
      // Backend returns: firstName, lastName (camelCase) based on my reading of Leads.tsx
      const mappedLeads = data.map((lead: any) => ({
        id: lead.id,
        email: lead.email,
        leadName: lead.leadName,
        fullName: lead.fullName,
        company: lead.company,
        linkedinUrl: lead.linkedinUrl,
        industry: lead.industry,
        status: lead.status,
        campaign_id: lead.campaignId,
        campaigns: lead.campaigns
      }));
      setExistingLeads(mappedLeads);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error("Failed to load existing leads");
    } finally {
      setIsLoadingExisting(false);
    }
  };

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter((line) => line.trim());
      if (lines.length === 0) return;

      const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));
      const data = lines.slice(1).map((line) =>
        line.split(',').map((cell) => cell.trim().replace(/"/g, ''))
      );

      setCsvHeaders(headers);
      setCsvData(data);

      const autoMapping: ColumnMapping = {
        email: headers.find((h) => h.toLowerCase().includes('email')) || '',
        leadName: headers.find((h) => h.toLowerCase().includes('lead') && h.toLowerCase().includes('name')) || '',
        fullName: headers.find((h) =>
          (h.toLowerCase().includes('full') && h.toLowerCase().includes('name')) ||
          h.toLowerCase() === 'name'
        ) || '',
        company: headers.find((h) => h.toLowerCase().includes('company')) || '',
        linkedinUrl: headers.find((h) => h.toLowerCase().includes('linkedin')) || '',
        industry: headers.find((h) => h.toLowerCase().includes('industry')) || '',
      };
      setColumnMapping(autoMapping);
    };
    reader.readAsText(file);
  }, []);

  const applyMapping = useCallback(() => {
    const mappedLeads: Lead[] = csvData.map((row) => {
      const getValueByHeader = (header: string) => {
        const index = csvHeaders.indexOf(header);
        return index >= 0 ? row[index] || '' : '';
      };

      return {
        email: getValueByHeader(columnMapping.email),
        leadName: getValueByHeader(columnMapping.leadName),
        fullName: getValueByHeader(columnMapping.fullName),
        company: getValueByHeader(columnMapping.company),
        linkedinUrl: getValueByHeader(columnMapping.linkedinUrl),
        industry: getValueByHeader(columnMapping.industry),
      };
    }).filter((lead) => lead.email);

    // Append to existing selections
    const currentExistingSelections = leads.filter(l => l.id);
    onLeadsChange([...currentExistingSelections, ...mappedLeads]);

    toast.success(`Imported ${mappedLeads.length} leads from CSV`);
    setFileName('');
    setCsvHeaders([]);
    setCsvData([]);
    // Stay on CSV tab but reset
  }, [csvData, csvHeaders, columnMapping, onLeadsChange, leads]);

  const clearFile = useCallback(() => {
    setFileName('');
    setCsvHeaders([]);
    setCsvData([]);
    setColumnMapping({
      email: '',
      leadName: '',
      fullName: '',
      company: '',
      linkedinUrl: '',
      industry: ''
    });
  }, []);

  // Handle selection of existing leads
  const toggleLeadSelection = (leadId: string) => {
    const newSelected = new Set(selectedLeadIds);
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId);
    } else {
      newSelected.add(leadId);
    }
    setSelectedLeadIds(newSelected);

    // Update parent state
    const selectedLeadsList = existingLeads.filter(l => l.id && newSelected.has(l.id));
    // Keep CSV imported leads (leads without ID)
    const csvLeads = leads.filter(l => !l.id);

    onLeadsChange([...csvLeads, ...selectedLeadsList]);
  };

  const handleSelectAll = (checked: boolean) => {
    const newSelected = new Set(selectedLeadIds);
    if (checked) {
      filteredExistingLeads.forEach(lead => {
        if (lead.id) newSelected.add(lead.id);
      });
    } else {
      filteredExistingLeads.forEach(lead => {
        if (lead.id) newSelected.delete(lead.id);
      });
    }
    setSelectedLeadIds(newSelected);

    // Update parent state
    const selectedLeadsList = existingLeads.filter(l => l.id && newSelected.has(l.id));
    const csvLeads = leads.filter(l => !l.id);
    onLeadsChange([...csvLeads, ...selectedLeadsList]);
  };

  const filteredExistingLeads = existingLeads.filter(lead => {
    const hasNameQuery = !!nameQuery.trim();
    const hasIndustryQuery = !!industryQuery.trim();

    if (!hasNameQuery && !hasIndustryQuery) return true;

    const matchesName = hasNameQuery && (
      lead.email.toLowerCase().includes(nameQuery.toLowerCase()) ||
      lead.leadName?.toLowerCase().includes(nameQuery.toLowerCase()) ||
      lead.fullName?.toLowerCase().includes(nameQuery.toLowerCase())
    );

    const matchesIndustry = hasIndustryQuery && (
      lead.industry?.toLowerCase().includes(industryQuery.toLowerCase()) ||
      lead.company?.toLowerCase().includes(industryQuery.toLowerCase())
    );

    return matchesName || matchesIndustry;
  });

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Import Leads</h2>
        <p className="text-muted-foreground mt-1">
          Choose how you want to add leads to this campaign
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="csv">Upload CSV</TabsTrigger>
          <TabsTrigger value="existing">Select Existing Leads</TabsTrigger>
        </TabsList>

        <TabsContent value="csv" className="space-y-6 mt-6">
          {/* File Upload UI */}
          {!fileName ? (
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-xl cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex flex-col items-center">
                <Upload className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-foreground">Click to upload CSV</p>
                <p className="text-xs text-muted-foreground mt-1">or drag and drop</p>
              </div>
              <Input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          ) : (
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-8 h-8 text-primary" />
                <div>
                  <p className="font-medium text-foreground">{fileName}</p>
                  <p className="text-sm text-muted-foreground">{csvData.length} rows found</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={clearFile}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Column Mapping */}
          {csvHeaders.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium text-foreground">Map Columns</h3>
              <div className="grid grid-cols-2 gap-4">
                {(['email', 'leadName', 'fullName', 'company', 'linkedinUrl', 'industry'] as const).map((field) => (
                  <div key={field} className="space-y-2">
                    <Label className="capitalize text-xs font-semibold">
                      {field === 'leadName' ? 'Lead Name' :
                        field === 'fullName' ? 'Full Name' :
                          field === 'linkedinUrl' ? 'LinkedIn URL' : field}
                      {field === 'email' && <span className="text-destructive">*</span>}
                    </Label>
                    <Select
                      value={columnMapping[field]}
                      onValueChange={(value) =>
                        setColumnMapping((prev) => ({ ...prev, [field]: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {csvHeaders
                          .filter((header) => header.trim() !== '')
                          .map((header) => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <Button onClick={applyMapping} disabled={!columnMapping.email}>
                Add Leads from CSV
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="existing" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={nameQuery}
                onChange={(e) => setNameQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by industry or company..."
                value={industryQuery}
                onChange={(e) => setIndustryQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {isLoadingExisting ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={
                          filteredExistingLeads.length > 0 &&
                          filteredExistingLeads.every(l => selectedLeadIds.has(l.id!))
                        }
                        onCheckedChange={(checked) => handleSelectAll(!!checked)}
                      />
                    </TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Lead Name</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Current Campaign</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExistingLeads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No leads found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredExistingLeads.map((lead) => (
                      <TableRow key={lead.id} className="cursor-pointer" onClick={() => toggleLeadSelection(lead.id!)}>
                        <TableCell>
                          <Checkbox
                            checked={selectedLeadIds.has(lead.id!)}
                            onCheckedChange={() => toggleLeadSelection(lead.id!)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{lead.email}</TableCell>
                        <TableCell>{lead.leadName || '-'}</TableCell>
                        <TableCell>{lead.fullName || '-'}</TableCell>
                        <TableCell>{lead.industry || '-'}</TableCell>
                        <TableCell>
                          {lead.campaigns?.name ? (
                            <Badge variant="outline" className="text-xs">
                              {lead.campaigns.name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            {selectedLeadIds.size} leads selected from database
          </p>
        </TabsContent>
      </Tabs>

      {/* Summary of ALL selected leads (CSV + Existing) */}
      {leads.length > 0 && (
        <div className="pt-6 border-t border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-foreground">
              Total Selected Leads ({leads.length})
            </h3>
            <Button variant="ghost" size="sm" onClick={() => {
              onLeadsChange([]);
              setSelectedLeadIds(new Set());
              setFileName('');
              setCsvData([]);
            }} className="text-destructive hover:text-destructive">
              Clear All
            </Button>
          </div>

          <div className="bg-muted/30 rounded-xl p-4 border border-border max-h-[200px] overflow-y-auto">
            <div className="space-y-2">
              {leads.slice(0, 50).map((lead, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="truncate flex-1">{lead.email}</span>
                  <Badge variant="secondary" className="text-xs ml-2">
                    {lead.id ? "Existing" : "New (CSV)"}
                  </Badge>
                </div>
              ))}
              {leads.length > 50 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  ...and {leads.length - 50} more
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
