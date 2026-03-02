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
import { uploadFile as smartUpload } from '@/lib/uploadLargeFile';

// Wrapper for the smart upload function that returns just the URL or throws
async function uploadFile(file: File, token: string, onProgress?: (percent: number) => void): Promise<string> {
  if (!token) throw new Error('Missing edit token');
  const result = await smartUpload(file, token, onProgress);
  if (result.error) throw new Error(result.error);
  return result.url;
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
        class: 'prose max-w-none p-4 border border-gray-200 rounded-lg focus:outline-none prose-headings:text-[#1a1a1a] prose-p:text-[#4a4a4a] prose-a:text-[#667eea] hover:prose-a:text-[#764ba2] prose-table:border prose-table:border-collapse prose-th:border prose-th:border-gray-300 prose-th:p-2 prose-th:bg-gray-100 prose-td:border prose-td:border-gray-300 prose-td:p-2'
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

  const insertVideo = useCallback(() => {
    if (!editor) return;
    const input = window.prompt('Paste a YouTube/Vimeo/MP4 URL:');
    if (!input) return;
    const url = input.trim();
    try {
      // Ensure it's a valid URL
      const u = new URL(url);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('Invalid protocol');
      const safe = url.replace(/"/g, '"');
      editor.chain().focus().insertContent(`<p><a href="${safe}">${safe}</a></p>`).run();
    } catch {
      alert('Please enter a valid URL starting with https://');
    }
  }, [editor]);

  const insertVideoFromFile = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/mp4,video/webm,video/ogg,video/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (!token) {
        alert('Please enter your EDIT_TOKEN in the Admin panel to upload videos.');
        return;
      }

      // Show progress for large files
      const isLargeFile = file.size > 4 * 1024 * 1024; // 4MB
      let progressDiv: HTMLDivElement | null = null;

      if (isLargeFile) {
        progressDiv = document.createElement('div');
        progressDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#1a1a1a;color:#fff;padding:24px 32px;border-radius:12px;z-index:9999;text-align:center;min-width:200px;';
        progressDiv.innerHTML = '<div style="margin-bottom:8px;font-weight:600;">Uploading video...</div><div id="upload-progress">0%</div>';
        document.body.appendChild(progressDiv);
      }

      try {
        const url = await uploadFile(file, token, (percent) => {
          if (progressDiv) {
            const progressEl = progressDiv.querySelector('#upload-progress');
            if (progressEl) progressEl.textContent = `${percent}%`;
          }
        });
        const safe = url.replace(/"/g, '"');
        editor?.chain().focus().insertContent(`<p><a href="${safe}">${safe}</a></p>`).run();
      } catch (error) {
        alert('Video upload failed: ' + error);
      } finally {
        if (progressDiv) {
          document.body.removeChild(progressDiv);
        }
      }
    };
    input.click();
  }, [editor, token]);


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

  const insertFileFromUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.pptx,.ppt,.doc,.docx,.xls,.xlsx';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (!token) {
        alert('Please enter your EDIT_TOKEN in the Admin panel to upload files.');
        return;
      }

      // Get file extension for the shortcode
      const ext = file.name.split('.').pop()?.toLowerCase() || 'file';

      // Show progress for large files
      const isLargeFile = file.size > 4 * 1024 * 1024; // 4MB
      let progressDiv: HTMLDivElement | null = null;

      if (isLargeFile) {
        progressDiv = document.createElement('div');
        progressDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#1a1a1a;color:#fff;padding:24px 32px;border-radius:12px;z-index:9999;text-align:center;min-width:200px;';
        progressDiv.innerHTML = `<div style="margin-bottom:8px;font-weight:600;">Uploading ${file.name}...</div><div id="upload-progress">0%</div>`;
        document.body.appendChild(progressDiv);
      }

      try {
        const url = await uploadFile(file, token, (percent) => {
          if (progressDiv) {
            const progressEl = progressDiv.querySelector('#upload-progress');
            if (progressEl) progressEl.textContent = `${percent}%`;
          }
        });
        // Insert file shortcode
        editor?.chain().focus().insertContent(`<p>{{file:${url}|${ext}}}</p>`).run();
      } catch (error) {
        alert('File upload failed: ' + error);
      } finally {
        if (progressDiv) {
          document.body.removeChild(progressDiv);
        }
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
    <div className="space-y-2 border border-gray-200 rounded-xl p-4 bg-white" data-color-mode="light">
      <div className="flex gap-2 flex-wrap border-b border-gray-200 pb-3">
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          disabled={!canToggleBold}
          className={`px-3 py-1.5 rounded-lg hover:bg-gray-100 font-bold text-sm transition-colors ${editor?.isActive('bold') ? 'bg-[#667eea] bg-opacity-10 text-[#667eea]' : 'bg-gray-50 text-[#4a4a4a]'} ${!canToggleBold ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          disabled={!canToggleItalic}
          className={`px-3 py-1.5 rounded-lg hover:bg-gray-100 italic text-sm transition-colors ${editor?.isActive('italic') ? 'bg-[#667eea] bg-opacity-10 text-[#667eea]' : 'bg-gray-50 text-[#4a4a4a]'} ${!canToggleItalic ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Italic"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleStrike().run()}
          disabled={!canToggleStrike}
          className={`px-3 py-1.5 rounded-lg hover:bg-gray-100 line-through text-sm transition-colors ${editor?.isActive('strike') ? 'bg-[#667eea] bg-opacity-10 text-[#667eea]' : 'bg-gray-50 text-[#4a4a4a]'} ${!canToggleStrike ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Strikethrough"
        >
          S
        </button>
        
        <div className="w-px bg-gray-300"></div>
        
        <button
          type="button"
          onClick={() => toggleHeadingLevel(1)}
          className={`px-3 py-1.5 rounded-lg hover:bg-gray-100 text-sm transition-colors ${editor?.isActive('heading', { level: 1 }) ? 'bg-[#667eea] bg-opacity-10 text-[#667eea]' : 'bg-gray-50 text-[#4a4a4a]'}`}
          title="Heading 1"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => toggleHeadingLevel(2)}
          className={`px-3 py-1.5 rounded-lg hover:bg-gray-100 text-sm transition-colors ${editor?.isActive('heading', { level: 2 }) ? 'bg-[#667eea] bg-opacity-10 text-[#667eea]' : 'bg-gray-50 text-[#4a4a4a]'}`}
          title="Heading 2"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => toggleHeadingLevel(3)}
          className={`px-3 py-1.5 rounded-lg hover:bg-gray-100 text-sm transition-colors ${editor?.isActive('heading', { level: 3 }) ? 'bg-[#667eea] bg-opacity-10 text-[#667eea]' : 'bg-gray-50 text-[#4a4a4a]'}`}
          title="Heading 3"
        >
          H3
        </button>
        
        <div className="w-px bg-gray-300"></div>
        
        <button
          type="button"
          onClick={toggleBullet}
          className={`px-3 py-1.5 rounded-lg hover:bg-gray-100 text-sm transition-colors ${editor?.isActive('bulletList') ? 'bg-[#667eea] bg-opacity-10 text-[#667eea]' : 'bg-gray-50 text-[#4a4a4a]'}`}
          title="Bullet List"
        >
          • List
        </button>
        <button
          type="button"
          onClick={toggleOrdered}
          className={`px-3 py-1.5 rounded-lg hover:bg-gray-100 text-sm transition-colors ${editor?.isActive('orderedList') ? 'bg-[#667eea] bg-opacity-10 text-[#667eea]' : 'bg-gray-50 text-[#4a4a4a]'}`}
          title="Numbered List"
        >
          1. List
        </button>
        
        <div className="w-px bg-gray-300"></div>
        
        <button
          type="button"
          onClick={addLink}
          className={`px-3 py-1.5 rounded-lg hover:bg-gray-100 text-sm transition-colors ${editor?.isActive('link') ? 'bg-[#667eea] bg-opacity-10 text-[#667eea]' : 'bg-gray-50 text-[#4a4a4a]'}`}
          title="Add Link"
        >
          Link
        </button>
        <button
          type="button"
          onClick={insertVideo}
          className="px-3 py-1.5 rounded-lg hover:bg-gray-100 bg-gray-50 text-[#4a4a4a] text-sm transition-colors"
          title="Insert Video (YouTube/Vimeo/MP4)"
        >
          Video
        </button>
        <button
          type="button"
          onClick={insertVideoFromFile}
          className="px-3 py-1.5 rounded-lg hover:bg-gray-100 bg-gray-50 text-[#4a4a4a] text-sm transition-colors"
          title="Upload Video (MP4/WEBM/OGG)"
        >
          Upload Video
        </button>
        <button
          type="button"
          onClick={insertImageFromFile}
          className="px-3 py-1.5 rounded-lg hover:bg-gray-100 bg-gray-50 text-[#4a4a4a] text-sm transition-colors"
          title="Upload Image"
        >
          Image
        </button>
        <button
          type="button"
          onClick={insertFileFromUpload}
          className="px-3 py-1.5 rounded-lg hover:bg-gray-100 bg-gray-50 text-[#4a4a4a] text-sm transition-colors"
          title="Upload File (PDF, PowerPoint, Word, Excel)"
        >
          File
        </button>
        <button
          type="button"
          onClick={insertTable}
          className="px-3 py-1.5 rounded-lg hover:bg-gray-100 bg-gray-50 text-[#4a4a4a] text-sm transition-colors"
          title="Insert Table"
        >
          Table
        </button>
        
        <div className="w-px bg-gray-300"></div>
        
        <button
          type="button"
          onClick={() => editor?.chain().focus().undo().run()}
          disabled={!editor?.can().undo()}
          className="px-3 py-1.5 rounded-lg hover:bg-gray-100 bg-gray-50 text-[#4a4a4a] text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Undo"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().redo().run()}
          disabled={!editor?.can().redo()}
          className="px-3 py-1.5 rounded-lg hover:bg-gray-100 bg-gray-50 text-[#4a4a4a] text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Redo"
        >
          Redo
        </button>
</div>

      <BubbleMenu
        editor={editor}
        pluginKey="table-bubble-menu"
        tippyOptions={{ placement: 'top', duration: 150 }}
        shouldShow={({ editor }) =>
          editor.isActive('table') || editor.isActive('tableCell') || editor.isActive('tableHeader')
        }
      >
        <div className="flex flex-wrap gap-1 bg-white/95 border border-gray-200 rounded-lg shadow-lg p-2">
          <button type="button" onClick={addRowBefore} className="px-2 py-1 text-xs rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">+ Row ↑</button>
          <button type="button" onClick={addRowAfter} className="px-2 py-1 text-xs rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">+ Row ↓</button>
          <button type="button" onClick={deleteRow} className="px-2 py-1 text-xs rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">Del Row</button>

          <div className="w-px bg-gray-300 mx-1" />

          <button type="button" onClick={addColumnBefore} className="px-2 py-1 text-xs rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">+ Col ←</button>
          <button type="button" onClick={addColumnAfter} className="px-2 py-1 text-xs rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">+ Col →</button>
          <button type="button" onClick={deleteColumn} className="px-2 py-1 text-xs rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">Del Col</button>

          <div className="w-px bg-gray-300 mx-1" />

          <button type="button" onClick={toggleHeaderRow} className="px-2 py-1 text-xs rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">Header</button>
          <button type="button" onClick={mergeCells} className="px-2 py-1 text-xs rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">Merge</button>
          <button type="button" onClick={splitCell} className="px-2 py-1 text-xs rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">Split</button>

          <div className="w-px bg-gray-300 mx-1" />

          <button type="button" onClick={deleteTable} className="px-2 py-1 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">Del Tbl</button>
        </div>
      </BubbleMenu>

      <div className="min-h-[400px]">
        <EditorContent editor={editor} />
      </div>

      <div className="text-xs text-[#999] border-t border-gray-200 pt-3">
        Tip: Paste or drag images into the editor. Use the File button to upload PDFs and PowerPoint presentations with inline preview.
      </div>
    </div>
  );
}
