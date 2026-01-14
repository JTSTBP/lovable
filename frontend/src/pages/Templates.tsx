import { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2, Edit2, FileText, Eye, Upload, Paperclip, X, Mail } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { EmailPreviewDialog } from '@/components/campaigns/EmailPreviewDialog';

interface Attachment {
  name: string;
  url: string;
  size: number;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  backgroundImage?: string;
  attachments?: Attachment[];
  updatedAt: string;
}

const VAR_OPTIONS = [
  { label: 'Lead Name', value: 'leadName' },
  { label: 'Full Name', value: 'fullName' },
  { label: 'Company', value: 'company' },
  { label: 'Industry', value: 'industry' },
  { label: 'Unsubscribe', value: 'unsubscribe' },
];

export default function Templates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<EmailTemplate | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body: '',
    backgroundImage: '',
    attachments: [] as Attachment[]
  });
  const [isSaving, setIsSaving] = useState(false);
  const quillRef = useRef<any>(null);
  const subjectRef = useRef<HTMLInputElement>(null);

  // Quill Configuration
  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, false] }],
        ['bold', 'italic', 'underline'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'color': [] }],
        ['link', 'image']
      ],
      handlers: {
        image: function () {
          const quill = (this as any).quill;
          const input = document.createElement('input');
          input.setAttribute('type', 'file');
          input.setAttribute('accept', 'image/*');
          input.click();

          input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;

            const uploadFormData = new FormData();
            uploadFormData.append('file', file);

            try {
              const response = await fetch(`${import.meta.env.VITE_API_URL}/api/upload`, {
                method: 'POST',
                body: uploadFormData
              });
              if (!response.ok) throw new Error('Upload failed');

              const data = await response.json();
              const range = quill.getSelection();
              quill.insertEmbed(range.index, 'image', data.url);
            } catch (error) {
              console.error('Image upload failed', error);
              toast.error("Failed to upload image");
            }
          };
        }
      }
    },
    blotFormatter: {}
  }), []);

  const formats = [
    'header',
    'bold', 'italic', 'underline',
    'list', 'bullet',
    'color',
    'link', 'image'
  ];

  useEffect(() => {
    if (user) {
      fetchTemplates();
    }
  }, [user]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/templates?userId=${user?.id || ''}`);
      if (!response.ok) throw new Error('Failed to fetch templates');
      const data = await response.json();
      setTemplates(data || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) return;
    if (!user) {
      toast.error('You must be logged in to create a template');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, userId: user.id })
      });

      if (!response.ok) throw new Error('Failed to create template');

      toast.success('Template created successfully');
      resetForm();
      setIsCreateOpen(false);
      fetchTemplates();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingTemplate) return;

    setIsSaving(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to update template');

      toast.success('Template updated successfully');
      setEditingTemplate(null);
      resetForm();
      fetchTemplates();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTemplate) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/templates/${deletingTemplate.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete template');

      toast.success('Template deleted successfully');
      setDeletingTemplate(null);
      fetchTemplates();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete template');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      subject: '',
      body: '',
      backgroundImage: '',
      attachments: []
    });
  };

  const insertVariable = (field: 'subject' | 'body', variable: string) => {
    if (field === 'body') {
      const quill = quillRef.current?.getEditor();
      if (quill) {
        const range = quill.getSelection(true);
        quill.insertText(range.index, `{{${variable}}}`);
        return;
      }
    } else {
      const input = subjectRef.current;
      if (input) {
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const text = formData.subject;
        const newSubject = text.substring(0, start) + `{{${variable}}}` + text.substring(end);
        setFormData({ ...formData, subject: newSubject });

        setTimeout(() => {
          if (input) {
            input.focus();
            const newCursorPos = start + `{{${variable}}}`.length;
            input.setSelectionRange(newCursorPos, newCursorPos);
          }
        }, 0);
        return;
      }
    }
    const currentValue = formData[field as 'subject' | 'body'];
    setFormData({ ...formData, [field]: currentValue + `{{${variable}}}` });
  };

  const openEditDialog = (template: EmailTemplate) => {
    setFormData({
      name: template.name,
      subject: template.subject || '',
      body: template.body || '',
      backgroundImage: template.backgroundImage || '',
      attachments: template.attachments || []
    });
    setEditingTemplate(template);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'background' | 'attachment') => {
    const file = event.target.files?.[0];
    if (!file) return;

    const uploadFormData = new FormData();
    uploadFormData.append('file', file); // Backend expects 'file' field name

    try {
      toast.loading(`Uploading ${type}...`);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/upload`, {
        method: 'POST',
        body: uploadFormData
      });
      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      toast.dismiss();

      if (type === 'background') {
        setFormData(prev => ({ ...prev, backgroundImage: data.url }));
        toast.success("Background image updated");
      } else {
        const newAttachment: Attachment = {
          name: file.name,
          url: data.url,
          size: file.size
        };
        setFormData(prev => ({
          ...prev,
          attachments: [...prev.attachments, newAttachment]
        }));
        toast.success("Attachment added");
      }
    } catch (error) {
      toast.dismiss();
      console.error('Upload failed', error);
      toast.error("Failed to upload file");
    }
  };

  const removeAttachment = (url: string) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter(a => a.url !== url)
    }));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
            <p className="text-muted-foreground">
              Manage your reusable email templates with rich text and attachments
            </p>
          </div>
          <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            New Template
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-5 bg-muted rounded w-1/2" />
                  <div className="h-4 bg-muted rounded w-3/4 mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="h-16 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : templates.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No templates yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first rich email template to speed up your campaigns.
              </p>
              <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Create Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id} className="group">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription className="line-clamp-1">
                        {template.subject || '(No subject)'}
                      </CardDescription>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <EmailPreviewDialog
                        subject={template.subject}
                        body={template.body}
                        trigger={
                          <Button variant="ghost" size="icon">
                            <Eye className="w-4 h-4" />
                          </Button>
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(template)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingTemplate(template)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div
                    className="text-sm text-muted-foreground line-clamp-3 overflow-hidden h-12"
                    dangerouslySetInnerHTML={{ __html: template.body || '(No content)' }}
                  />
                  <div className="flex items-center gap-2 mt-3">
                    {template.attachments && template.attachments.length > 0 && (
                      <Badge variant="secondary" className="text-[10px]">
                        <Paperclip className="w-3 h-3 mr-1" />
                        {template.attachments.length} attachments
                      </Badge>
                    )}
                    {template.backgroundImage && (
                      <Badge variant="secondary" className="text-[10px]">
                        BG Image
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Updated {new Date(template.updatedAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateOpen || !!editingTemplate}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingTemplate(null);
          }
        }}
      >
        <DialogContent className="max-w-[95vw] w-[1400px] max-h-[96vh] p-0 gap-0 overflow-hidden border-none shadow-2xl">
          <div className="flex h-full max-h-[96vh]">
            {/* Left Side: Editor Form */}
            <div className="flex-1 flex flex-col min-w-0 bg-background border-r">
              <div className="p-6 border-b">
                <DialogTitle className="text-2xl">{editingTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle>
                <DialogDescription>
                  {editingTemplate ? 'Update your template details.' : 'Create a new rich text email template.'}
                </DialogDescription>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Template Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Follow-up Email"
                      className="bg-muted/30 focus-visible:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="subject" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Subject Line</Label>
                      <div className="flex gap-1">
                        {VAR_OPTIONS.slice(0, 3).map((v) => (
                          <Button
                            key={v.value}
                            variant="ghost"
                            size="sm"
                            className="h-5 px-1.5 text-[10px] bg-muted/50 hover:bg-primary/10 hover:text-primary transition-colors"
                            onClick={() => insertVariable('subject', v.value)}
                          >
                            +{v.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <Input
                      id="subject"
                      ref={subjectRef}
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="e.g., Quick follow-up for {{leadName}}"
                      className="bg-muted/30 focus-visible:ring-primary"
                    />
                  </div>
                </div>

                <div className="space-y-2 flex flex-col h-[500px]">
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Email Body</Label>
                    <div className="flex gap-1 flex-wrap justify-end">
                      {VAR_OPTIONS.map((v) => (
                        <Button
                          key={v.value}
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px] bg-muted/50 hover:bg-primary/10 hover:text-primary transition-colors border border-transparent hover:border-primary/20"
                          onClick={() => insertVariable('body', v.value)}
                        >
                          +{v.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 bg-muted/10 rounded-md overflow-hidden border border-input focus-within:ring-1 focus-within:ring-ring">
                    <RichTextEditor
                      ref={quillRef}
                      value={formData.body}
                      onChange={(val) => setFormData({ ...formData, body: val })}
                      modules={modules}
                      formats={formats}
                      className="h-full quill-editor-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-4">
                  <div className="space-y-4">
                    <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Paperclip className="w-4 h-4" />
                      Attachments
                    </Label>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="relative cursor-pointer hover:bg-muted/50 border-dashed w-full h-20 flex flex-col">
                          <Upload className="w-6 h-6 mb-2 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Click to upload files</span>
                          <input
                            type="file"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) => handleFileUpload(e, 'attachment')}
                          />
                        </Button>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                        {formData.attachments.map((att, i) => (
                          <div key={i} className="flex items-center justify-between p-2 pl-3 bg-muted/40 rounded-lg border text-sm group transition-colors hover:border-primary/50">
                            <span className="truncate flex-1 font-medium">{att.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground">{(att.size / 1024).toFixed(1)} KB</span>
                              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeAttachment(att.url)}>
                                <X className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        {formData.attachments.length === 0 && (
                          <div className="text-center py-4 text-xs text-muted-foreground italic bg-muted/20 rounded-lg border border-dashed">
                            No attachments added
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Background Image
                    </Label>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="relative cursor-pointer hover:bg-muted/50 border-dashed w-full h-20 flex flex-col overflow-hidden">
                          {formData.backgroundImage ? (
                            <img src={formData.backgroundImage} alt="Background" className="absolute inset-0 object-cover w-full h-full opacity-30" />
                          ) : null}
                          <Upload className="w-6 h-6 mb-2 text-muted-foreground relative z-10" />
                          <span className="text-xs text-muted-foreground relative z-10">Click to upload background</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer z-20"
                            onChange={(e) => handleFileUpload(e, 'background')}
                          />
                        </Button>
                      </div>
                      {formData.backgroundImage && (
                        <div className="relative group rounded-lg border overflow-hidden bg-muted/40 p-1">
                          <div className="aspect-video relative rounded-md overflow-hidden">
                            <img src={formData.backgroundImage} alt="Background Preview" className="object-cover w-full h-full" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Button variant="destructive" size="sm" onClick={() => setFormData(prev => ({ ...prev, backgroundImage: '' }))}>
                                Remove Photo
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t bg-muted/10">
                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => { setIsCreateOpen(false); setEditingTemplate(null); }}>
                    Discard
                  </Button>
                  <Button onClick={editingTemplate ? handleUpdate : handleCreate} disabled={!formData.name.trim() || isSaving} className="px-8 bg-primary hover:bg-primary/90">
                    {isSaving ? (editingTemplate ? 'Saving Changes...' : 'Creating Template...') : (editingTemplate ? 'Save Changes' : 'Create Template')}
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Side: Real-time Email Preview */}
            <div className="hidden lg:flex flex-1 flex-col bg-muted/30 p-8 min-w-0">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Real-time Preview</h3>
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-destructive/50" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
                </div>
              </div>

              <EmailClientPreview subject={formData.subject} body={formData.body} backgroundImage={formData.backgroundImage} />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingTemplate} onOpenChange={() => setDeletingTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingTemplate?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

// Helper component for badges
function Badge({ children, variant = "default", className = "" }: { children: React.ReactNode, variant?: "default" | "secondary" | "outline", className?: string }) {
  const variants = {
    default: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    outline: "border text-foreground border-input"
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

// Email Client Preview Component
function EmailClientPreview({ subject, body, backgroundImage }: { subject: string, body: string, backgroundImage?: string }) {
  return (
    <div className="flex-1 flex flex-col bg-white rounded-xl shadow-2xl overflow-hidden border border-border/50 animate-in fade-in zoom-in duration-500">
      {/* Email Header/Chrome */}
      <div className="bg-[#f2f6fc] px-6 py-4 border-b text-left">
        <div className="flex items-center gap-4 py-2 border-b border-gray-200">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            JD
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-900 truncate">John Doe <span className="text-gray-500 font-normal">&lt;john@example.com&gt;</span></span>
              <span className="text-xs text-gray-500">Just now</span>
            </div>
            <div className="text-sm text-gray-600 truncate">to me</div>
          </div>
        </div>

        <div className="pt-4">
          <h2 className="text-xl font-semibold text-gray-900 leading-tight">
            {subject || '(No Subject)'}
          </h2>
        </div>
      </div>

      {/* Email Content Space */}
      <div className="flex-1 overflow-y-auto bg-white p-8 relative">
        {/* Background Overlay */}
        {backgroundImage && (
          <div
            className="absolute inset-0 z-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: `url(${backgroundImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
        )}

        {/* Actual Content Area */}
        <div className="relative z-10 max-w-2xl mx-auto text-left">
          {body ? (
            <div
              className="ql-editor p-0 min-h-[300px] text-gray-800 leading-relaxed custom-preview"
              dangerouslySetInnerHTML={{ __html: body }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-muted-foreground italic border-2 border-dashed border-muted/50 rounded-xl bg-muted/5 p-8 text-center">
              <Mail className="w-12 h-12 mb-4 opacity-20" />
              <p>Your email content will appear here in real-time as you type.</p>
            </div>
          )}

          <div className="mt-12 pt-8 border-t border-gray-100 italic text-gray-400 text-sm">
            Sent via Bluebird Campaigner
          </div>
        </div>
      </div>

      {/* Reply Toolbar (Visual only) */}
      <div className="px-8 py-4 border-t bg-gray-50/50 flex gap-4">
        <div className="px-4 py-2 rounded-full border border-gray-300 text-gray-600 text-sm font-medium flex items-center gap-2 cursor-not-allowed">
          Reply
        </div>
        <div className="px-4 py-2 rounded-full border border-gray-300 text-gray-600 text-sm font-medium flex items-center gap-2 cursor-not-allowed">
          Forward
        </div>
      </div>
    </div>
  );
}
