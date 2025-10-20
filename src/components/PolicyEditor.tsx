'use client';

import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';           // <-- named import
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { useCallback, useEffect } from 'react';

async function uploadFile(file: File, token: string): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', headers: { 'x-edit-token': token }, body: fd });
  if (!res.ok) throw new Error(await res.text());
  const { url } = await res.json();
  return url;
}

export default function PolicyEditor({
  value,
  onChange,
  token,
}: {
  value: string;
  onChange: (html: string) => void;
  token: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({}),
      Link.configure({ openOnClick: true, autolink: true }),
      Image.configure({}),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value || '<p></p>',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        const file = Array.from(items).find(i => i.kind === 'file')?.getAsFile();
        if (!file) return false;
        event.preventDefault();
        uploadFile(file, token).then(url => editor?.chain().focus().setImage({ src: url }).run());
        return true;
      },
      handleDrop: (_view, e) => {
        const event = e as DragEvent;
        const file = event.dataTransfer?.files?.[0];
        if (!file) return false;
        event.preventDefault();
        uploadFile(file, token).then(url => editor?.chain().focus().setImage({ src: url }).run());
        return true;
      },
      attributes: { 
        class: 'prose max-w-none p-3 border rounded prose-table:border prose-table:border-collapse prose-th:border prose-th:border-gray-300 prose-th:p-2 prose-th:bg-gray-100 prose-td:border prose-td:border-gray-300 prose-td:p-2' 
      },
    },
  });

  const insertTable = useCallback(() => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  const addLink = useCallback(() => {
    const url = window.prompt('URL:');
    if (!url) return;
    editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);


  const insertImageFromFile = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const url = await uploadFile(file, token);
        editor?.chain().focus().setImage({ src: url }).run();
      } catch (error) {
        alert('Image upload failed: ' + error);
      }
    };
    input.click();
  }, [editor, token]);

  // Update editor content when value prop changes
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '<p></p>');
    }
  }, [editor, value]);

  return (
    <div className="space-y-2 border rounded-lg p-4 bg-white" data-color-mode="light">
      <div className="flex gap-2 flex-wrap border-b pb-3">
        <button 
          type="button" 
          onClick={() => editor?.chain().focus().toggleBold().run()} 
          className={`px-3 py-1.5 rounded hover:bg-gray-100 font-bold ${editor?.isActive('bold') ? 'bg-gray-200' : 'bg-gray-50'}`}
          title="Bold"
        >
          B
        </button>
        <button 
          type="button" 
          onClick={() => editor?.chain().focus().toggleItalic().run()} 
          className={`px-3 py-1.5 rounded hover:bg-gray-100 italic ${editor?.isActive('italic') ? 'bg-gray-200' : 'bg-gray-50'}`}
          title="Italic"
        >
          I
        </button>
        <button 
          type="button" 
          onClick={() => editor?.chain().focus().toggleStrike().run()} 
          className={`px-3 py-1.5 rounded hover:bg-gray-100 line-through ${editor?.isActive('strike') ? 'bg-gray-200' : 'bg-gray-50'}`}
          title="Strikethrough"
        >
          S
        </button>
        
        <div className="w-px bg-gray-300"></div>
        
        <button 
          type="button" 
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} 
          className={`px-3 py-1.5 rounded hover:bg-gray-100 ${editor?.isActive('heading', { level: 1 }) ? 'bg-gray-200' : 'bg-gray-50'}`}
          title="Heading 1"
        >
          H1
        </button>
        <button 
          type="button" 
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} 
          className={`px-3 py-1.5 rounded hover:bg-gray-100 ${editor?.isActive('heading', { level: 2 }) ? 'bg-gray-200' : 'bg-gray-50'}`}
          title="Heading 2"
        >
          H2
        </button>
        <button 
          type="button" 
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} 
          className={`px-3 py-1.5 rounded hover:bg-gray-100 ${editor?.isActive('heading', { level: 3 }) ? 'bg-gray-200' : 'bg-gray-50'}`}
          title="Heading 3"
        >
          H3
        </button>
        
        <div className="w-px bg-gray-300"></div>
        
        <button 
          type="button" 
          onClick={() => editor?.chain().focus().toggleBulletList().run()} 
          className={`px-3 py-1.5 rounded hover:bg-gray-100 ${editor?.isActive('bulletList') ? 'bg-gray-200' : 'bg-gray-50'}`}
          title="Bullet List"
        >
          • List
        </button>
        <button 
          type="button" 
          onClick={() => editor?.chain().focus().toggleOrderedList().run()} 
          className={`px-3 py-1.5 rounded hover:bg-gray-100 ${editor?.isActive('orderedList') ? 'bg-gray-200' : 'bg-gray-50'}`}
          title="Numbered List"
        >
          1. List
        </button>
        
        <div className="w-px bg-gray-300"></div>
        
        <button 
          type="button" 
          onClick={addLink} 
          className={`px-3 py-1.5 rounded hover:bg-gray-100 ${editor?.isActive('link') ? 'bg-gray-200' : 'bg-gray-50'}`}
          title="Add Link"
        >
          🔗 Link
        </button>
        <button 
          type="button" 
          onClick={insertImageFromFile} 
          className="px-3 py-1.5 rounded hover:bg-gray-100 bg-gray-50"
          title="Upload Image"
        >
          🖼️ Image
        </button>
        <button 
          type="button" 
          onClick={insertTable} 
          className="px-3 py-1.5 rounded hover:bg-gray-100 bg-gray-50"
          title="Insert Table"
        >
          ⊞ Table
        </button>
        
        <div className="w-px bg-gray-300"></div>
        
        <button 
          type="button" 
          onClick={() => editor?.chain().focus().undo().run()} 
          disabled={!editor?.can().undo()}
          className="px-3 py-1.5 rounded hover:bg-gray-100 bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Undo"
        >
          ↶ Undo
        </button>
        <button 
          type="button" 
          onClick={() => editor?.chain().focus().redo().run()} 
          disabled={!editor?.can().redo()}
          className="px-3 py-1.5 rounded hover:bg-gray-100 bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Redo"
        >
          ↷ Redo
        </button>
      </div>

      <div className="min-h-[400px]">
        <EditorContent editor={editor} />
      </div>
      
      <div className="text-xs text-gray-500 border-t pt-2">
        💡 Tip: You can paste or drag & drop images directly into the editor
      </div>
    </div>
  );
}
