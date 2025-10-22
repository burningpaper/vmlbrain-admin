'use client';

import { EditorContent, useEditor, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Heading from '@tiptap/extension-heading';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import HardBreak from '@tiptap/extension-hard-break';
import { useCallback, useEffect, useState } from 'react';


async function uploadFile(file: File, token: string): Promise<string> {
  if (!token) throw new Error('Missing edit token');
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
  // Track selection changes to force React re-render so contextual toolbars update on existing articles too
  const [, setUiTick] = useState(0);

  const editor = useEditor({
    extensions: [
      // Disable built-ins we override explicitly
      StarterKit.configure({ heading: false, bulletList: false, orderedList: false, listItem: false, hardBreak: false }),
      Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
      BulletList,
      OrderedList,
      ListItem,
      Link.configure({ openOnClick: true, autolink: true }),
      Image.configure({}),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      HardBreak.configure({
        keepMarks: true,
      }),
    ],
    immediatelyRender: false,
    content: value || '<p></p>',
    onCreate: () => setUiTick((t) => t + 1),
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    onSelectionUpdate: () => setUiTick((t) => t + 1),
    editorProps: {
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        const file = Array.from(items).find(i => i.kind === 'file')?.getAsFile();
        if (!file) return false;
        if (!token) {
          alert('Please enter your EDIT_TOKEN in the Admin panel to upload images.');
          return true;
        }
        event.preventDefault();
        uploadFile(file, token).then(url => editor?.chain().focus().setImage({ src: url }).run());
        return true;
      },
      handleDrop: (_view, e) => {
        const event = e as DragEvent;
        const file = event.dataTransfer?.files?.[0];
        if (!file) return false;
        if (!token) {
          alert('Please enter your EDIT_TOKEN in the Admin panel to upload images.');
          return true;
        }
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

  // Robust toggles to ensure list/heading actions work from any block
  const toggleHeadingLevel = useCallback((level: 1 | 2 | 3 | 4 | 5 | 6) => {
    if (!editor) return;
    editor.chain().focus().toggleHeading({ level }).run();
  }, [editor]);

  const toggleBullet = useCallback(() => {
    if (!editor) return;
    const ch = editor.chain().focus();
    // If current block can't be wrapped (e.g., heading), normalize to paragraph first
    if (editor.isActive('heading') || editor.isActive('blockquote')) ch.setParagraph();
    ch.toggleBulletList().run();
  }, [editor]);

  const toggleOrdered = useCallback(() => {
    if (!editor) return;
    const ch = editor.chain().focus();
    if (editor.isActive('heading') || editor.isActive('blockquote')) ch.setParagraph();
    ch.toggleOrderedList().run();
  }, [editor]);

  // Table commands (must be defined before JSX uses them)
  const addRowBefore = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().addRowBefore().run();
  }, [editor]);

  const addRowAfter = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().addRowAfter().run();
  }, [editor]);

  const deleteRow = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().deleteRow().run();
  }, [editor]);

  const addColumnBefore = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().addColumnBefore().run();
  }, [editor]);

  const addColumnAfter = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().addColumnAfter().run();
  }, [editor]);

  const deleteColumn = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().deleteColumn().run();
  }, [editor]);

  const toggleHeaderRow = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().toggleHeaderRow().run();
  }, [editor]);

  const mergeCells = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().mergeCells().run();
  }, [editor]);

  const splitCell = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().splitCell().run();
  }, [editor]);

  const deleteTable = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().deleteTable().run();
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
      if (!token) {
        alert('Please enter your EDIT_TOKEN in the Admin panel to upload images.');
        return;
      }
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

  // Pre-compute command availability (enables/disables buttons)
  const canToggleBold = !!editor?.can().chain().focus().toggleBold().run();
  const canToggleItalic = !!editor?.can().chain().focus().toggleItalic().run();
  const canToggleStrike = !!editor?.can().chain().focus().toggleStrike().run();
  // Only gate undo/redo with can(); allow format buttons to run our robust handlers

  // Table command availability (always render toolbar; disable when not applicable)

  // Consider toolbar "enabled" when caret is anywhere in a table

  return (
    <div className="space-y-2 border rounded-lg p-4 bg-white" data-color-mode="light">
      <div className="flex gap-2 flex-wrap border-b pb-3">
        <button 
          type="button" 
          onClick={() => editor?.chain().focus().toggleBold().run()} 
          disabled={!canToggleBold}
          className={`px-3 py-1.5 rounded hover:bg-gray-100 font-bold ${editor?.isActive('bold') ? 'bg-gray-200' : 'bg-gray-50'} ${!canToggleBold ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Bold"
        >
          B
        </button>
        <button 
          type="button" 
          onClick={() => editor?.chain().focus().toggleItalic().run()} 
          disabled={!canToggleItalic}
          className={`px-3 py-1.5 rounded hover:bg-gray-100 italic ${editor?.isActive('italic') ? 'bg-gray-200' : 'bg-gray-50'} ${!canToggleItalic ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Italic"
        >
          I
        </button>
        <button 
          type="button" 
          onClick={() => editor?.chain().focus().toggleStrike().run()} 
          disabled={!canToggleStrike}
          className={`px-3 py-1.5 rounded hover:bg-gray-100 line-through ${editor?.isActive('strike') ? 'bg-gray-200' : 'bg-gray-50'} ${!canToggleStrike ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Strikethrough"
        >
          S
        </button>
        
        <div className="w-px bg-gray-300"></div>
        
        <button 
          type="button" 
          onClick={() => toggleHeadingLevel(1)} 
          className={`px-3 py-1.5 rounded hover:bg-gray-100 ${editor?.isActive('heading', { level: 1 }) ? 'bg-gray-200' : 'bg-gray-50'}`}
          title="Heading 1"
        >
          H1
        </button>
        <button 
          type="button" 
          onClick={() => toggleHeadingLevel(2)} 
          className={`px-3 py-1.5 rounded hover:bg-gray-100 ${editor?.isActive('heading', { level: 2 }) ? 'bg-gray-200' : 'bg-gray-50'}`}
          title="Heading 2"
        >
          H2
        </button>
        <button 
          type="button" 
          onClick={() => toggleHeadingLevel(3)} 
          className={`px-3 py-1.5 rounded hover:bg-gray-100 ${editor?.isActive('heading', { level: 3 }) ? 'bg-gray-200' : 'bg-gray-50'}`}
          title="Heading 3"
        >
          H3
        </button>
        
        <div className="w-px bg-gray-300"></div>
        
        <button 
          type="button" 
          onClick={toggleBullet} 
          className={`px-3 py-1.5 rounded hover:bg-gray-100 ${editor?.isActive('bulletList') ? 'bg-gray-200' : 'bg-gray-50'}`}
          title="Bullet List"
        >
          • List
        </button>
        <button 
          type="button" 
          onClick={toggleOrdered} 
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

        <div className="w-px bg-gray-300"></div>

</div>

      <BubbleMenu
        editor={editor}
        pluginKey="table-bubble-menu"
        tippyOptions={{ placement: 'top', duration: 150 }}
        shouldShow={({ editor }) =>
          editor.isActive('table') || editor.isActive('tableCell') || editor.isActive('tableHeader')
        }
      >
        <div className="flex flex-wrap gap-1 bg-white/95 border rounded shadow p-1">
          <button type="button" onClick={addRowBefore} className="px-2 py-0.5 text-xs rounded border">+ Row ↑</button>
          <button type="button" onClick={addRowAfter} className="px-2 py-0.5 text-xs rounded border">+ Row ↓</button>
          <button type="button" onClick={deleteRow} className="px-2 py-0.5 text-xs rounded border">Del Row</button>

          <div className="w-px bg-gray-300 mx-1" />

          <button type="button" onClick={addColumnBefore} className="px-2 py-0.5 text-xs rounded border">+ Col ←</button>
          <button type="button" onClick={addColumnAfter} className="px-2 py-0.5 text-xs rounded border">+ Col →</button>
          <button type="button" onClick={deleteColumn} className="px-2 py-0.5 text-xs rounded border">Del Col</button>

          <div className="w-px bg-gray-300 mx-1" />

          <button type="button" onClick={toggleHeaderRow} className="px-2 py-0.5 text-xs rounded border">Header</button>
          <button type="button" onClick={mergeCells} className="px-2 py-0.5 text-xs rounded border">Merge</button>
          <button type="button" onClick={splitCell} className="px-2 py-0.5 text-xs rounded border">Split</button>

          <div className="w-px bg-gray-300 mx-1" />

          <button type="button" onClick={deleteTable} className="px-2 py-0.5 text-xs rounded border text-red-700">Del Tbl</button>
        </div>
      </BubbleMenu>

      <div className="min-h-[400px]">
        <EditorContent editor={editor} />
      </div>
      
      <div className="text-xs text-gray-500 border-t pt-2">
        💡 Tip: You can paste or drag & drop images directly into the editor
      </div>
    </div>
  );
}
