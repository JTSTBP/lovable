
import { Plus, Trash2, Clock, Mail, Save, FileText, Eye, Upload, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SaveTemplateDialog } from '@/components/campaigns/SaveTemplateDialog';
import { LoadTemplateDialog } from '@/components/campaigns/LoadTemplateDialog';
import { EmailPreviewDialog } from '@/components/campaigns/EmailPreviewDialog';
import { ABTestEditor, ABVariant } from '@/components/campaigns/ABTestEditor';
import ReactQuill from 'react-quill';
const Quill = (ReactQuill as any).Quill;
import 'react-quill/dist/quill.snow.css';
import BlotFormatter from 'quill-blot-formatter';
import { toast } from 'sonner';

Quill.register('modules/blotFormatter', BlotFormatter);

export interface EmailStep {
  id: string;
  delayDays: number;
  subject: string;
  body: string;
  backgroundImage?: string;
  attachments?: any[];
  abTestEnabled?: boolean;
  abVariants?: ABVariant[];
}

interface SequencesStepProps {
  steps: EmailStep[];
  onStepsChange: (steps: EmailStep[]) => void;
  userId?: string;
}

// Removed static modules/formats definition to move inside component
import { useMemo, useRef } from 'react';

export function SequencesStep({ steps, onStepsChange, userId }: SequencesStepProps) {
  const quillRefs = useRef<Record<string, any>>({});
  const subjectRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

            const formData = new FormData();
            formData.append('file', file);

            try {
              const response = await fetch(`${import.meta.env.VITE_API_URL}/api/upload`, {
                method: 'POST',
                body: formData
              });
              if (!response.ok) throw new Error('Upload failed');

              const data = await response.json();
              const range = quill.getSelection();
              quill.insertEmbed(range.index, 'image', data.url);
            } catch (error) {
              console.error('Image upload failed', error);
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
  const addStep = () => {
    const newStep: EmailStep = {
      id: crypto.randomUUID(),
      delayDays: steps.length === 0 ? 0 : 3,
      subject: '',
      body: '',
      backgroundImage: '',
      attachments: [],
      abTestEnabled: false,
      abVariants: [],
    };
    onStepsChange([...steps, newStep]);
  };

  const updateStep = (id: string, updates: Partial<EmailStep>) => {
    onStepsChange(
      steps.map((step) => (step.id === id ? { ...step, ...updates } : step))
    );
  };

  const removeStep = (id: string) => {
    onStepsChange(steps.filter((step) => step.id !== id));
  };

  const insertVariable = (stepId: string, field: 'subject' | 'body', variable: string) => {
    const step = steps.find((s) => s.id === stepId);
    if (!step) return;

    if (field === 'body') {
      const quill = quillRefs.current[stepId]?.getEditor();
      if (quill) {
        const range = quill.getSelection(true);
        quill.insertText(range.index, `{{${variable}}}`);
        return;
      }
    } else {
      const input = subjectRefs.current[stepId];
      if (input) {
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const text = step.subject;
        const newSubject = text.substring(0, start) + `{{${variable}}}` + text.substring(end);
        updateStep(stepId, { subject: newSubject });

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

    const currentValue = step[field];
    updateStep(stepId, { [field]: currentValue + `{{${variable}}}` });
  };

  const handleLoadTemplate = (stepId: string, template: { subject: string; body: string; backgroundImage?: string; attachments?: any[] }) => {
    updateStep(stepId, {
      subject: template.subject,
      body: template.body,
      backgroundImage: template.backgroundImage || '',
      attachments: template.attachments || []
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, stepId: string, type: 'background' | 'attachment') => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();
      console.log('File uploaded successfully:', data);

      const step = steps.find(s => s.id === stepId);
      if (!step) return;

      if (type === 'background') {
        updateStep(stepId, { backgroundImage: data.url });
      } else {
        const newAttachment = {
          name: file.name,
          url: data.url,
          size: file.size
        };
        console.log('Adding attachment to step:', newAttachment);
        updateStep(stepId, { attachments: [...(step.attachments || []), newAttachment] });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
    }
  };

  const removeAttachment = (stepId: string, url: string) => {
    const step = steps.find(s => s.id === stepId);
    if (!step) return;
    updateStep(stepId, {
      attachments: (step.attachments || []).filter(a => a.url !== url)
    });
  };

  const handleABEnabledChange = (stepId: string, enabled: boolean) => {
    const step = steps.find((s) => s.id === stepId);
    if (!step) return;

    if (enabled && (!step.abVariants || step.abVariants.length === 0)) {
      // Auto-add first variant B when enabling
      updateStep(stepId, {
        abTestEnabled: true,
        abVariants: [{
          id: crypto.randomUUID(),
          variantName: 'B',
          subject: '',
          body: '',
        }],
      });
    } else {
      updateStep(stepId, { abTestEnabled: enabled });
    }
  };

  const handleABVariantsChange = (stepId: string, variants: ABVariant[]) => {
    updateStep(stepId, { abVariants: variants });
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Email Sequence</h2>
        <p className="text-muted-foreground mt-1">
          Create your email steps with personalization variables and A/B testing
        </p>
      </div>

      {/* Variables hint */}
      <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
        <p className="text-sm font-medium text-foreground mb-2">Available Variables</p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Lead Name', value: 'leadName' },
            { label: 'Full Name', value: 'fullName' },
            { label: 'Company', value: 'company' },
            { label: 'Industry', value: 'industry' },
            { label: 'LinkedIn', value: 'linkedinUrl' },
            { label: 'Email', value: 'email' },
            { label: 'Unsubscribe', value: 'unsubscribe' }
          ].map((v) => (
            <div key={v.value} className="flex flex-col">
              <span className="text-[10px] text-muted-foreground mb-0.5">{v.label}</span>
              <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md font-mono">
                {`{{${v.value}}}`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={step.id} className="relative">
            {/* Timeline connector */}
            {index > 0 && (
              <div className="absolute left-5 -top-4 w-0.5 h-4 bg-border" />
            )}

            <div className="email-step-card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">Step {index + 1}</p>
                      {step.abTestEnabled && (
                        <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded">
                          A/B TEST
                        </span>
                      )}
                    </div>
                    {index > 0 && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Wait {step.delayDays} days after previous step
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <EmailPreviewDialog
                    subject={step.subject}
                    body={step.body}
                    backgroundImage={step.backgroundImage}
                    trigger={
                      <Button variant="ghost" size="sm" className="h-8">
                        <Eye className="w-4 h-4 mr-1" />
                        Preview
                      </Button>
                    }
                  />
                  <LoadTemplateDialog
                    onSelect={(template) => handleLoadTemplate(step.id, template)}
                    trigger={
                      <Button variant="ghost" size="sm" className="h-8">
                        <FileText className="w-4 h-4 mr-1" />
                        Load
                      </Button>
                    }
                  />
                  <SaveTemplateDialog
                    subject={step.subject}
                    body={step.body}
                    backgroundImage={step.backgroundImage}
                    attachments={step.attachments}
                    userId={userId}
                    trigger={
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        disabled={!step.subject && !step.body}
                      >
                        <Save className="w-4 h-4 mr-1" />
                        Save
                      </Button>
                    }
                  />
                  {steps.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeStep(step.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Delay */}
              {index > 0 && (
                <div className="mb-4">
                  <Label>Days to wait</Label>
                  <Input
                    type="number"
                    min="1"
                    value={step.delayDays}
                    onChange={(e) =>
                      updateStep(step.id, { delayDays: parseInt(e.target.value) || 1 })
                    }
                    className="w-24 mt-1"
                  />
                </div>
              )}

              {/* Subject */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <Label>Subject Line {step.abTestEnabled && <span className="text-muted-foreground">(Variant A)</span>}</Label>
                  <div className="flex gap-1">
                    {[
                      { label: 'Lead Name', value: 'leadName' },
                      { label: 'Full Name', value: 'fullName' },
                      { label: 'Company', value: 'company' },
                      { label: 'Industry', value: 'industry' }
                    ].map((v) => (
                      <Button
                        key={v.value}
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => insertVariable(step.id, 'subject', v.value)}
                      >
                        +{v.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <Input
                  ref={(el) => subjectRefs.current[step.id] = el}
                  value={step.subject}
                  onChange={(e) => updateStep(step.id, { subject: e.target.value })}
                  placeholder="e.g., Quick question, {{firstName}}"
                />
              </div>

              {/* Body */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>Email Body {step.abTestEnabled && <span className="text-muted-foreground">(Variant A)</span>}</Label>
                  <div className="flex gap-1">
                    {[
                      { label: 'Lead Name', value: 'leadName' },
                      { label: 'Full Name', value: 'fullName' },
                      { label: 'Company', value: 'company' },
                      { label: 'Industry', value: 'industry' },
                      { label: 'Unsubscribe', value: 'unsubscribe' }
                    ].map((v) => (
                      <Button
                        key={v.value}
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => insertVariable(step.id, 'body', v.value)}
                      >
                        +{v.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="h-64 mb-12">
                  <ReactQuill
                    ref={(el) => { if (el) quillRefs.current[step.id] = el; }}
                    theme="snow"
                    value={step.body}
                    onChange={(value) => updateStep(step.id, { body: value })}
                    modules={modules}
                    formats={formats}
                    className="h-full"
                    placeholder={`Hi {{leadName}},\n\nI noticed that {{company}} is in the {{industry}} sector...`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6 pt-4 mb-6">
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
                            onChange={(e) => handleFileUpload(e, step.id, 'attachment')}
                          />
                        </Button>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                        {(step.attachments || []).map((att, i) => (
                          <div key={i} className="flex items-center justify-between p-2 pl-3 bg-muted/40 rounded-lg border text-sm group transition-colors hover:border-primary/50">
                            <span className="truncate flex-1 font-medium">{att.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground">{(att.size / 1024).toFixed(1)} KB</span>
                              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeAttachment(step.id, att.url)}>
                                <X className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        {(step.attachments || []).length === 0 && (
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
                          {step.backgroundImage ? (
                            <img src={step.backgroundImage} alt="Background" className="absolute inset-0 object-cover w-full h-full opacity-30" />
                          ) : null}
                          <Upload className="w-6 h-6 mb-2 text-muted-foreground relative z-10" />
                          <span className="text-xs text-muted-foreground relative z-10">Click to upload background</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer z-20"
                            onChange={(e) => handleFileUpload(e, step.id, 'background')}
                          />
                        </Button>
                      </div>
                      {step.backgroundImage && (
                        <div className="relative group rounded-lg border overflow-hidden bg-muted/40 p-1">
                          <div className="aspect-video relative rounded-md overflow-hidden">
                            <img src={step.backgroundImage} alt="Background Preview" className="object-cover w-full h-full" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Button variant="destructive" size="sm" onClick={() => updateStep(step.id, { backgroundImage: '' })}>
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

              {/* A/B Test Editor */}
              <ABTestEditor
                stepId={step.id}
                originalSubject={step.subject}
                originalBody={step.body}
                variants={step.abVariants || []}
                enabled={step.abTestEnabled || false}
                onEnabledChange={(enabled) => handleABEnabledChange(step.id, enabled)}
                onVariantsChange={(variants) => handleABVariantsChange(step.id, variants)}
              />
            </div>

            {/* Timeline dot for next step */}
            {index < steps.length - 1 && (
              <div className="flex justify-center py-2">
                <div className="w-0.5 h-8 bg-border" />
              </div>
            )}
          </div>
        ))}

        {/* Add Step Button */}
        <Button
          variant="outline"
          className="w-full border-dashed"
          onClick={addStep}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Email Step
        </Button>
      </div>
    </div>
  );
}