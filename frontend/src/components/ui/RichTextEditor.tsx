
import { lazy, Suspense, useMemo, forwardRef } from 'react';
import 'react-quill/dist/quill.snow.css';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load ReactQuill to avoid build/runtime issues with "Super expression" errors
const ReactQuill = lazy(async () => {
    const { default: RQ } = await import('react-quill');
    // Dynamic import for blot formatter to ensure Quill is loaded first
    try {
        const { default: BlotFormatter } = await import('quill-blot-formatter');
        const Quill = (RQ as any).Quill;
        if (Quill && !Quill.imports['modules/blotFormatter']) {
            Quill.register('modules/blotFormatter', BlotFormatter);
        }
    } catch (e) {
        console.warn('Failed to register extra modules for Quill', e);
    }
    return { default: RQ };
});

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    modules?: any;
    formats?: string[];
    forwardedRef?: any;
}

export const RichTextEditor = forwardRef<any, RichTextEditorProps>((props, ref) => {
    // Default modules if not provided
    const defaultModules = useMemo(() => ({
        toolbar: {
            container: [
                [{ 'header': [1, 2, false] }],
                ['bold', 'italic', 'underline'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                [{ 'color': [] }],
                ['link', 'image']
            ]
        },
        blotFormatter: {}
    }), []);

    return (
        <Suspense fallback={<div className="h-64 w-full bg-muted/10 animate-pulse rounded-md" />}>
            <ReactQuill
                ref={ref || props.forwardedRef}
                theme="snow"
                value={props.value}
                onChange={props.onChange}
                modules={props.modules || defaultModules}
                formats={props.formats}
                className={props.className}
                placeholder={props.placeholder}
            />
        </Suspense>
    );
});

RichTextEditor.displayName = 'RichTextEditor';
