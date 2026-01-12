import { useState, useEffect } from 'react';
import { FileText, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  backgroundImage?: string;
  attachments?: any[];
  createdAt: string;
}

interface LoadTemplateDialogProps {
  onSelect: (template: { subject: string; body: string; backgroundImage?: string; attachments?: any[] }) => void;
  trigger?: React.ReactNode;
}

export function LoadTemplateDialog({ onSelect, trigger }: LoadTemplateDialogProps) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (open && user) {
      fetchTemplates();
    }
  }, [open, user]);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/templates?userId=${user?.id}`);
      if (!response.ok) throw new Error('Failed to load templates');
      const data = await response.json();
      setTemplates(data || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (template: EmailTemplate) => {
    onSelect({
      subject: template.subject,
      body: template.body,
      backgroundImage: template.backgroundImage,
      attachments: template.attachments
    });
    setOpen(false);
    toast.success(`Template "${template.name}" loaded`);
  };

  const handleDelete = async (e: React.MouseEvent, templateId: string) => {
    e.stopPropagation();

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/templates/${templateId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete template');

      toast.success('Template deleted');
      fetchTemplates();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete template');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <FileText className="w-4 h-4 mr-2" />
            Load Template
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Load Template</DialogTitle>
          <DialogDescription>
            Select a saved template to use in your email step.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 bg-muted animate-pulse rounded-lg"
                />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No templates saved yet</p>
              <p className="text-sm">Save an email step as a template to reuse it later</p>
            </div>
          ) : (
            <div className="space-y-2 p-2">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors group"
                  onClick={() => handleSelect(template)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {template.name}
                      </p>
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {template.subject || '(No subject)'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {template.body}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive"
                      onClick={(e) => handleDelete(e, template.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
