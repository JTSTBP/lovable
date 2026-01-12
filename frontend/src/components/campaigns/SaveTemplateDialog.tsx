import { useState } from 'react';
import { Save } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface SaveTemplateDialogProps {
  subject: string;
  body: string;
  backgroundImage?: string;
  attachments?: any[];
  trigger?: React.ReactNode;
  userId?: string;
}

export function SaveTemplateDialog({ subject, body, backgroundImage, attachments, trigger, userId: propUserId }: SaveTemplateDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();

  const effectiveUserId = propUserId || user?.id; // Prefer prop, fallback to context

  const handleSave = async () => {
    if (!name.trim()) return;
    if (!effectiveUserId) {
      toast.error("You must be logged in to save a template");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name.trim(),
          subject,
          body,
          backgroundImage,
          attachments: attachments || [],
          userId: effectiveUserId
        })
      });

      if (!response.ok) throw new Error('Failed to save template');

      toast.success('Template saved successfully');
      setName('');
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Save className="w-4 h-4 mr-2" />
            Save as Template
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
          <DialogDescription>
            Save this email as a reusable template for future campaigns.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Follow-up Email"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Subject Preview</Label>
            <p className="text-sm bg-muted p-2 rounded-md">{subject || '(No subject)'}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
            {isSaving ? 'Saving...' : 'Save Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
