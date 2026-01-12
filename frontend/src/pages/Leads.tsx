import { useEffect, useState } from 'react';
import { Search, Users, Filter, Plus, Edit2, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface Lead {
  id: string;
  email: string;
  leadName: string | null;
  fullName: string | null;
  company: string | null;
  linkedinUrl: string | null;
  industry: string | null;
  status: 'pending' | 'sent' | 'opened' | 'replied' | 'bounced' | 'unsubscribed';
  campaign_id: string | null;
  created_at: string;
  campaigns?: { name: string } | null;
}

const statusConfig: Record<Lead['status'], { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-muted text-muted-foreground' },
  sent: { label: 'Sent', className: 'bg-primary/10 text-primary' },
  opened: { label: 'Opened', className: 'bg-success/10 text-success' },
  replied: { label: 'Replied', className: 'bg-warning/10 text-warning' },
  bounced: { label: 'Bounced', className: 'bg-destructive/10 text-destructive' },
  unsubscribed: { label: 'Unsubscribed', className: 'bg-destructive/10 text-destructive' },
};

export default function Leads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [industryFilter, setIndustryFilter] = useState<string>('all');
  const [nameFilter, setNameFilter] = useState<string>('');

  // Manual Lead Entry State
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newLead, setNewLead] = useState({
    email: '',
    leadName: '',
    fullName: '',
    company: '',
    linkedinUrl: '',
    industry: ''
  });
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchLeads();
  }, [user]);

  async function handleAddLead(e: React.FormEvent) {
    e.preventDefault();
    if (!newLead.email) {
      toast.error("Email is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingLead
        ? `${import.meta.env.VITE_API_URL}/api/leads/${editingLead.id}`
        : `${import.meta.env.VITE_API_URL}/api/leads`;

      const method = editingLead ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newLead, userId: user?.id })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${editingLead ? 'update' : 'create'} lead`);
      }

      toast.success(`Lead ${editingLead ? 'updated' : 'added'} successfully`);
      setIsAddLeadOpen(false);
      setEditingLead(null);
      setNewLead({ email: '', leadName: '', fullName: '', company: '', linkedinUrl: '', industry: '' });
      fetchLeads(); // Refresh list
    } catch (error: any) {
      console.error(`Error ${editingLead ? 'updating' : 'adding'} lead:`, error);
      toast.error(error.message || `Failed to ${editingLead ? 'update' : 'add'} lead`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteLead(id: string) {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/leads/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete lead');

      toast.success("Lead deleted successfully");
      fetchLeads();
    } catch (error: any) {
      console.error('Error deleting lead:', error);
      toast.error(error.message || "Failed to delete lead");
    } finally {
      setIsDeletingId(null);
    }
  }

  function handleEditClick(lead: Lead) {
    setEditingLead(lead);
    setNewLead({
      email: lead.email,
      leadName: lead.leadName || '',
      fullName: lead.fullName || '',
      company: lead.company || '',
      linkedinUrl: lead.linkedinUrl || '',
      industry: lead.industry || ''
    });
    setIsAddLeadOpen(true);
  }


  async function fetchLeads() {
    // Note: User check removed for now as backend doesn't validate auth yet
    // if (!user) return; 

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/leads?userId=${user?.id || ''}`);
      if (!response.ok) throw new Error('Failed to fetch leads');

      const data = await response.json();

      // Map Prisma data to frontend matching shape if needed (usually Prisma default mapping is close enough, 
      // but we need to handle snake_case vs camelCase if present. 
      // Prisma defaults to properties as defined in schema. 
      // Schema.prisma has: email, firstName, lastName, company.
      // Frontend interface 'Lead' expects: email, first_name, last_name, company.
      // We need to map this!

      const mappedLeads = data.map((lead: any) => ({
        ...lead,
        created_at: lead.createdAt,
        campaign_id: lead.campaignId,
        // Ensure status matches types
        status: lead.status || 'pending'
      }));

      setLeads(mappedLeads);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error("Failed to load leads");
    } finally {
      setIsLoading(false);
    }
  }

  const uniqueIndustries = Array.from(new Set(leads.map(l => l.industry).filter(Boolean)));

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.leadName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.industry?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || lead.status === statusFilter;

    const matchesIndustry =
      industryFilter === 'all' || lead.industry === industryFilter;

    const matchesName =
      !nameFilter ||
      lead.fullName?.toLowerCase().includes(nameFilter.toLowerCase()) ||
      lead.leadName?.toLowerCase().includes(nameFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesIndustry && matchesName;
  });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Leads</h1>
              <p className="text-muted-foreground mt-1">
                View and manage all your contacts
              </p>
            </div>

            <Dialog open={isAddLeadOpen} onOpenChange={(open) => {
              setIsAddLeadOpen(open);
              if (!open) {
                setEditingLead(null);
                setNewLead({ email: '', leadName: '', fullName: '', company: '', linkedinUrl: '', industry: '' });
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Manual Lead
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>{editingLead ? 'Edit Lead' : 'Add New Lead'}</DialogTitle>
                  <DialogDescription>
                    {editingLead ? 'Update the details of the lead.' : 'Enter the details of the lead you want to add manually.'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddLead} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={newLead.email}
                      onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="leadName">Lead Name</Label>
                      <Input
                        id="leadName"
                        placeholder="John Doe"
                        value={newLead.leadName}
                        onChange={(e) => setNewLead({ ...newLead, leadName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        placeholder="John Doe"
                        value={newLead.fullName}
                        onChange={(e) => setNewLead({ ...newLead, fullName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company">Company</Label>
                      <Input
                        id="company"
                        placeholder="Acme Inc"
                        value={newLead.company}
                        onChange={(e) => setNewLead({ ...newLead, company: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="industry">Industry</Label>
                      <Input
                        id="industry"
                        placeholder="Technology"
                        value={newLead.industry}
                        onChange={(e) => setNewLead({ ...newLead, industry: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                    <Input
                      id="linkedinUrl"
                      placeholder="https://linkedin.com/in/johndoe"
                      value={newLead.linkedinUrl}
                      onChange={(e) => setNewLead({ ...newLead, linkedinUrl: e.target.value })}
                    />
                  </div>
                  <DialogFooter className="pt-4">
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : editingLead ? 'Update Lead' : 'Save Lead'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="w-[180px]">
            <Input
              placeholder="Filter by Name"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
            />
          </div>

          <Select value={industryFilter} onValueChange={setIndustryFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Industry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Industries</SelectItem>
              {uniqueIndustries.map(industry => (
                <SelectItem key={industry} value={industry!}>{industry}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="opened">Opened</SelectItem>
              <SelectItem value="replied">Replied</SelectItem>
              <SelectItem value="bounced">Bounced</SelectItem>
              <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Leads Table */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-16 bg-card rounded-lg border border-border animate-pulse"
              />
            ))}
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">
              {searchQuery || statusFilter !== 'all'
                ? 'No leads found'
                : 'No leads yet'}
            </h3>
            <p className="text-muted-foreground">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Import leads by creating a new campaign'}
            </p>
          </div>
        ) : (
          <div className="border rounded-xl overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Lead Name</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => {
                  const config = statusConfig[lead.status];
                  return (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.email}</TableCell>
                      <TableCell>{lead.leadName || '—'}</TableCell>
                      <TableCell>{lead.fullName || '—'}</TableCell>
                      <TableCell>{lead.company || '—'}</TableCell>
                      <TableCell>{lead.industry || '—'}</TableCell>
                      <TableCell>
                        {lead.campaigns?.name || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn('text-xs', config.className)}
                        >
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditClick(lead)}>
                              <Edit2 className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setIsDeletingId(lead.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <AlertDialog open={!!isDeletingId} onOpenChange={(open) => !open && setIsDeletingId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the lead.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => isDeletingId && handleDeleteLead(isDeletingId)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Stats */}
        {filteredLeads.length > 0 && (
          <p className="text-sm text-muted-foreground text-center">
            Showing {filteredLeads.length} of {leads.length} leads
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
