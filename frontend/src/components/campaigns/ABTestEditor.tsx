
import { Beaker, Plus, Trash2, Eye, Upload, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { EmailPreviewDialog } from '@/components/campaigns/EmailPreviewDialog';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useMemo, useRef } from 'react';

export interface ABVariant {
  id: string;
  variantName: string;
  subject: string;
  body: string;
  backgroundImage?: string;
  attachments?: any[];
}

interface ABTestEditorProps {
  stepId: string;
  originalSubject: string;
  originalBody: string;
  variants: ABVariant[];
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onVariantsChange: (variants: ABVariant[]) => void;
}

export function ABTestEditor({
  stepId,
  originalSubject,
  originalBody,
  variants,
  enabled,
  onEnabledChange,
  onVariantsChange,
}: ABTestEditorProps) {
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
            formData.append('image', file);

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
    }
  }), []);

  const formats = [
    'header',
    'bold', 'italic', 'underline',
    'list', 'bullet',
    'color',
    'link', 'image'
  ];
  const addVariant = () => {
    const variantLetter = String.fromCharCode(66 + variants.length); // B, C, D...
    const newVariant: ABVariant = {
      id: crypto.randomUUID(),
      variantName: variantLetter,
      subject: '',
      body: '',
      backgroundImage: '',
      attachments: [],
    };
    onVariantsChange([...variants, newVariant]);
  };

  const updateVariant = (id: string, updates: Partial<ABVariant>) => {
    onVariantsChange(
      variants.map((v) => (v.id === id ? { ...v, ...updates } : v))
    );
  };

  const removeVariant = (id: string) => {
    onVariantsChange(variants.filter((v) => v.id !== id));
  };

  const insertVariable = (variantId: string, field: 'subject' | 'body', variable: string) => {
    const variant = variants.find((v) => v.id === variantId);
    if (!variant) return;

    if (field === 'body') {
      const quill = quillRefs.current[variantId]?.getEditor();
      if (quill) {
        const range = quill.getSelection(true);
        quill.insertText(range.index, `{{${variable}}}`);
        return;
      }
    } else {
      const input = subjectRefs.current[variantId];
      if (input) {
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const text = variant.subject;
        const newSubject = text.substring(0, start) + `{{${variable}}}` + text.substring(end);
        updateVariant(variantId, { subject: newSubject });

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

    const currentValue = variant[field];
    updateVariant(variantId, { [field]: currentValue + `{{${variable}}}` });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, variantId: string, type: 'background' | 'attachment') => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append(type === 'background' ? 'image' : 'file', file);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();

      const variant = variants.find(v => v.id === variantId);
      if (!variant) return;

      if (type === 'background') {
        updateVariant(variantId, { backgroundImage: data.url });
      } else {
        const newAttachment = {
          name: file.name,
          url: data.url,
          size: file.size
        };
        updateVariant(variantId, { attachments: [...(variant.attachments || []), newAttachment] });
      }
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  const removeAttachment = (variantId: string, url: string) => {
    const variant = variants.find(v => v.id === variantId);
    if (!variant) return;
    updateVariant(variantId, {
      attachments: (variant.attachments || []).filter(a => a.url !== url)
    });
  };

  return (
    <div className="mt-4 p-4 border border-dashed border-primary/30 rounded-lg bg-primary/5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Beaker className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">A/B Testing</span>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor={`ab-toggle-${stepId}`} className="text-xs text-muted-foreground">
            {enabled ? 'Enabled' : 'Disabled'}
          </Label>
          <Switch
            id={`ab-toggle-${stepId}`}
            checked={enabled}
            onCheckedChange={onEnabledChange}
          />
        </div>
      </div>

      {enabled && (
        <div className="space-y-4">
          {/* Original variant (A) info */}
          <div className="p-3 bg-background/50 rounded-md border border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">
                  A
                </span>
                <span className="text-sm font-medium">Original (50%)</span>
              </div>
              <span className="text-xs text-muted-foreground">Uses main subject & body above</span>
            </div>
          </div>

          {/* B variants */}
          {variants.map((variant, index) => (
            <div key={variant.id} className="p-3 bg-background/50 rounded-md border border-border/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-secondary/20 text-secondary-foreground text-xs font-bold flex items-center justify-center">
                    {variant.variantName}
                  </span>
                  <span className="text-sm font-medium">Variant {variant.variantName} ({Math.round(50 / (variants.length + 1))}%)</span>
                </div>
                <div className="flex items-center gap-1">
                  <EmailPreviewDialog
                    subject={variant.subject || originalSubject}
                    body={variant.body || originalBody}
                    backgroundImage={variant.backgroundImage}
                    trigger={
                      <Button variant="ghost" size="sm" className="h-7 px-2">
                        <Eye className="w-3 h-3" />
                      </Button>
                    }
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-destructive hover:text-destructive"
                    onClick={() => removeVariant(variant.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Subject */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs">Subject Line</Label>
                  <div className="flex gap-1">
                    {['firstName', 'company'].map((v) => (
                      <Button
                        key={v}
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1 text-[10px]"
                        onClick={() => insertVariable(variant.id, 'subject', v)}
                      >
                        +{v}
                      </Button>
                    ))}
                  </div>
                </div>
                <Input
                  ref={(el) => subjectRefs.current[variant.id] = el}
                  value={variant.subject}
                  onChange={(e) => updateVariant(variant.id, { subject: e.target.value })}
                  placeholder={originalSubject || "Different subject line..."}
                  className="h-8 text-sm"
                />
              </div>

              {/* Body */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs">Email Body</Label>
                  <div className="flex gap-1">
                    {['firstName', 'company'].map((v) => (
                      <Button
                        key={v}
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1 text-[10px]"
                        onClick={() => insertVariable(variant.id, 'body', v)}
                      >
                        +{v}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="h-56 mb-12">
                  <ReactQuill
                    ref={(el) => { if (el) quillRefs.current[variant.id] = el; }}
                    theme="snow"
                    value={variant.body}
                    onChange={(value) => updateVariant(variant.id, { body: value })}
                    modules={modules}
                    formats={formats}
                    className="h-full bg-background"
                    placeholder={originalBody || "Different email content..."}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                      <Paperclip className="w-3 h-3" /> Attachments
                    </Label>
                    <div className="flex flex-col gap-2">
                      <div className="relative h-10 border border-dashed rounded flex items-center justify-center hover:bg-muted/50 cursor-pointer">
                        <Upload className="w-3 h-3 mr-1 text-muted-foreground" />
                        <span className="text-[10px]">Upload</span>
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, variant.id, 'attachment')} />
                      </div>
                      <div className="flex flex-col gap-1 max-h-20 overflow-y-auto pr-1">
                        {(variant.attachments || []).map((att, i) => (
                          <div key={i} className="flex items-center justify-between p-1 bg-muted/40 rounded text-[10px] group border">
                            <span className="truncate flex-1">{att.name}</span>
                            <Button variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover:opacity-100" onClick={() => removeAttachment(variant.id, att.url)}>
                              <X className="w-2.5 h-2.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                      <Upload className="w-3 h-3" /> BG Image
                    </Label>
                    <div className="relative h-10 border border-dashed rounded flex items-center justify-center hover:bg-muted/50 cursor-pointer overflow-hidden">
                      {variant.backgroundImage ? (
                        <img src={variant.backgroundImage} className="absolute inset-0 object-cover w-full h-full opacity-20" />
                      ) : null}
                      <Upload className="w-3 h-3 mr-1 text-muted-foreground relative z-10" />
                      <span className="text-[10px] relative z-10">{variant.backgroundImage ? 'Change' : 'Upload'}</span>
                      <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-20" onChange={(e) => handleFileUpload(e, variant.id, 'background')} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Add variant button */}
          {variants.length < 3 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full border-dashed"
              onClick={addVariant}
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Variant {String.fromCharCode(66 + variants.length)}
            </Button>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Leads will be randomly split 50/50 between variants. Leave fields empty to use original content.
          </p>
        </div>
      )}
    </div>
  );
}

