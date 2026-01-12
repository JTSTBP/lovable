import { useState } from 'react';
import { Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

interface EmailPreviewDialogProps {
  subject: string;
  body: string;
  backgroundImage?: string;
  trigger?: React.ReactNode;
}

interface SampleData {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
}

export function EmailPreviewDialog({ subject, body, backgroundImage, trigger }: EmailPreviewDialogProps) {
  const [open, setOpen] = useState(false);
  const [sampleData, setSampleData] = useState<SampleData>({
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@example.com',
    company: 'Acme Corp',
  });

  const replaceVariables = (text: string): string => {
    return text
      .replace(/\{\{firstName\}\}/gi, sampleData.firstName)
      .replace(/\{\{lastName\}\}/gi, sampleData.lastName)
      .replace(/\{\{leadName\}\}/gi, sampleData.firstName)
      .replace(/\{\{fullName\}\}/gi, `${sampleData.firstName} ${sampleData.lastName}`)
      .replace(/\{\{email\}\}/gi, sampleData.email)
      .replace(/\{\{company\}\}/gi, sampleData.company)
      .replace(/\{\{industry\}\}/gi, 'Software')
      .replace(/\{\{unsubscribe\}\}/gi, '<a href="#">Unsubscribe</a>');
  };

  const previewSubject = replaceVariables(subject);
  const previewBody = replaceVariables(body);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Email Preview</DialogTitle>
          <DialogDescription>
            See how your email will look with variables replaced
          </DialogDescription>
        </DialogHeader>

        {/* Sample Data Editor */}
        <div className="space-y-4 py-4">
          <div>
            <h4 className="text-sm font-medium mb-3">Sample Lead Data</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="preview-firstName" className="text-xs">
                  {"{{firstName}} / {{leadName}}"}
                </Label>
                <Input
                  id="preview-firstName"
                  value={sampleData.firstName}
                  onChange={(e) =>
                    setSampleData({ ...sampleData, firstName: e.target.value })
                  }
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="preview-lastName" className="text-xs">
                  {"{{lastName}}"}
                </Label>
                <Input
                  id="preview-lastName"
                  value={sampleData.lastName}
                  onChange={(e) =>
                    setSampleData({ ...sampleData, lastName: e.target.value })
                  }
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="preview-email" className="text-xs">
                  {"{{email}}"}
                </Label>
                <Input
                  id="preview-email"
                  value={sampleData.email}
                  onChange={(e) =>
                    setSampleData({ ...sampleData, email: e.target.value })
                  }
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="preview-company" className="text-xs">
                  {"{{company}}"}
                </Label>
                <Input
                  id="preview-company"
                  value={sampleData.company}
                  onChange={(e) =>
                    setSampleData({ ...sampleData, company: e.target.value })
                  }
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Email Preview */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Preview</h4>

            {/* Email Container */}
            <div className="border border-border rounded-lg overflow-hidden bg-background">
              {/* Email Header */}
              <div className="bg-muted/50 px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">To:</span>
                  <span className="font-medium">{sampleData.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm mt-1">
                  <span className="text-muted-foreground">Subject:</span>
                  <span className="font-medium">
                    {previewSubject || '(No subject)'}
                  </span>
                </div>
              </div>

              {/* Email Body */}
              <div
                className="p-6 min-h-[300px]"
                style={backgroundImage ? {
                  backgroundImage: `url(${backgroundImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                } : {}}
              >
                <div
                  className={backgroundImage ? "bg-white/90 p-6 rounded-lg shadow-sm" : ""}
                >
                  {previewBody ? (
                    <div
                      className="preview-content ql-editor max-w-none"
                      dangerouslySetInnerHTML={{ __html: previewBody }}
                    />
                  ) : (
                    <p className="text-muted-foreground text-sm italic">
                      (No content)
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Variable Highlight */}
            {(subject.includes('{{') || body.includes('{{')) && (
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3">
                <strong>Variables used:</strong>{' '}
                {[...new Set([
                  ...subject.match(/\{\{[^}]+\}\}/g) || [],
                  ...body.match(/\{\{[^}]+\}\}/g) || [],
                ])].join(', ') || 'None'}
              </div>
            )}

            {/* Unsubscribe Link Tip */}
            <div className="text-xs text-muted-foreground bg-primary/5 border border-primary/10 rounded-md p-3">
              <strong>Tip:</strong> Add {"{{unsubscribeLink}}"} to your email body to include an unsubscribe link.
              Leads who click it will be automatically marked as unsubscribed.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
