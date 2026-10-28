import { useEffect, useRef, useState } from 'react';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link2,
  Heading2,
  Quote,
  Eraser,
  Image as ImageIcon,
  Upload,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { compressImage } from '../lib/image-compress';
import { triggerHaptic } from '../lib/haptics';

export interface RichTextEditorProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onImageUpload?: (url: string) => void;
  allowImageUpload?: boolean;
  minHeight?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  onImageUpload,
  allowImageUpload = true,
  minHeight = '140px',
}: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || '';
    }
  }, [value]);

  const exec = (cmd: string, arg?: string) => {
    triggerHaptic('tap');
    document.execCommand(cmd, false, arg);
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const handleUploadImageFile = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    setUploading(true);
    triggerHaptic('medium');

    try {
      // 1. Client-side compression
      const compressedDataUrl = await compressImage(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.85,
      });

      let finalUrl = compressedDataUrl;

      // 2. Upload to backend if available
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            dataUrl: compressedDataUrl,
            filename: file.name,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.url) {
            finalUrl = data.url;
          }
        }
      } catch (uploadErr) {
        console.warn('Backend upload skipped, using inline data URL:', uploadErr);
      }

      // 3. Insert into editor
      if (ref.current) {
        ref.current.focus();
        const imgHtml = `<p><img src="${finalUrl}" alt="${file.name.replace(
          /\.[^/.]+$/,
          ''
        )}" class="rounded-2xl max-w-full my-2 shadow-sm border border-forest/15 object-cover" /></p><p></p>`;
        document.execCommand('insertHTML', false, imgHtml);
        onChange(ref.current.innerHTML);
      }

      // 4. Notify parent callback
      if (onImageUpload) {
        onImageUpload(finalUrl);
      }

      triggerHaptic('success');
    } catch (err) {
      console.warn('Failed to process uploaded image:', err);
      triggerHaptic('error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUploadImageFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!allowImageUpload) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadImageFile(e.dataTransfer.files[0]);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (!allowImageUpload) return;
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleUploadImageFile(file);
          break;
        }
      }
    }
  };

  const btn = (label: string, onClick: () => void, Icon: any, active = false) => (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`h-8 w-8 sm:h-9 sm:w-9 rounded-lg flex items-center justify-center transition active:scale-95 ${
        active
          ? 'bg-forest text-cream shadow-xs'
          : 'text-forest hover:bg-forest/10 hover:text-forest-dark'
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );

  return (
    <div
      className={`rounded-2xl border-2 transition-all bg-cream-soft overflow-hidden ${
        isDragOver ? 'border-honey ring-2 ring-honey/40 bg-honey/5' : 'border-forest/15'
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Editor Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1 border-b border-forest/10 bg-cream/80 px-2 py-1 backdrop-blur-xs">
        <div className="flex flex-wrap items-center gap-0.5 sm:gap-1">
          {btn('Bold (ตัวหนา)', () => exec('bold'), Bold)}
          {btn('Italic (ตัวเอียง)', () => exec('italic'), Italic)}
          {btn('Heading (หัวข้อ)', () => exec('formatBlock', 'H3'), Heading2)}
          {btn('Quote (คำอ้างอิง)', () => exec('formatBlock', 'BLOCKQUOTE'), Quote)}
          {btn('Bullet list (รายการจุด)', () => exec('insertUnorderedList'), List)}
          {btn('Numbered list (ลำดับตัวเลข)', () => exec('insertOrderedList'), ListOrdered)}
          {btn(
            'Link (แทรกลิงก์)',
            () => {
              const url = prompt('Enter URL (ใส่ที่อยู่ลิงก์):');
              if (url) exec('createLink', url);
            },
            Link2
          )}
          {btn('Clear formatting (ล้างการจัดหน้า)', () => exec('removeFormat'), Eraser)}
        </div>

        {/* Upload Image Feature */}
        {allowImageUpload && (
          <div className="flex items-center gap-1">
            <input
              type="file"
              ref={fileInputRef}
              onChange={onFileInputChange}
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
            />

            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              title="Upload & Insert Image (อัปโหลดรูปภาพเข้าเนื้อหา)"
              className="h-8 px-2.5 rounded-lg bg-forest/10 hover:bg-forest hover:text-cream text-forest text-xs font-bold flex items-center gap-1.5 transition active:scale-95 border border-forest/15 shadow-2xs group"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-forest group-hover:text-cream" />
              ) : (
                <ImageIcon className="h-3.5 w-3.5 text-forest group-hover:text-cream" />
              )}
              <span className="hidden xs:inline">
                {uploading ? 'กำลังอัปโหลด...' : 'แทรกรูปภาพ (Upload Image)'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Editor Content Area */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onPaste={handlePaste}
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
        data-placeholder={placeholder || ''}
        style={{ minHeight }}
        className="rte-content px-4 py-3 focus:outline-none text-ink text-sm leading-relaxed empty:before:content-[attr(data-placeholder)] empty:before:text-ink-muted/50 font-thai overflow-y-auto"
      />

      {/* Upload Drag Overlay Helper */}
      {isDragOver && (
        <div className="bg-honey/15 p-2 text-center text-xs font-bold text-amber-900 border-t border-honey/30 flex items-center justify-center gap-2">
          <Upload className="h-4 w-4 animate-bounce" />
          <span>วางไฟล์รูปภาพเพื่ออัปโหลดลงในเนื้อหาทันที (Drop image to upload)</span>
        </div>
      )}
    </div>
  );
}
