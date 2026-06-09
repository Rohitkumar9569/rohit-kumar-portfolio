import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ClipboardEvent, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowTopRightOnSquareIcon,
  ArrowsPointingOutIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentDuplicateIcon,
  DocumentPlusIcon,
  DocumentTextIcon,
  EyeIcon,
  PaintBrushIcon,
  PlusIcon,
  QueueListIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  uploadAdminStudyCardFiles,
  type StudyCard,
  type StudyCardFileMetadataPayload,
} from '../../studyHubApi';

type DocumentBlockType = 'title' | 'heading' | 'subheading' | 'paragraph' | 'bullet' | 'quote' | 'callout';
type DocumentFontFamily = 'inter' | 'serif' | 'mono';
type DocumentAlign = 'left' | 'center' | 'right';
type DocumentTemplate = 'blank' | 'exam-pack' | 'notes' | 'answer-key' | 'syllabus';
type DocumentPageLayout = {
  margin: number;
  padding: number;
  borderWidth: number;
  borderColor: string;
};

type DocumentBlock = {
  id: string;
  type: DocumentBlockType;
  html: string;
  fontFamily: DocumentFontFamily;
  fontSize: number;
  color: string;
  align: DocumentAlign;
  bold: boolean;
  italic: boolean;
};

interface StudyDocumentStudioProps {
  activeCard: StudyCard | null;
  activeFileNames: Set<string>;
  currentFolderPath: string;
  defaultMetadata: StudyCardFileMetadataPayload;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

const modalButtonClassName =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 text-[13px] font-black text-[#f3f3f3] shadow-sm transition hover:border-cyan-300/30 hover:bg-white/[0.10] disabled:cursor-not-allowed disabled:opacity-50';

const primaryButtonClassName =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-cyan-100/30 bg-[#5fd0ff] px-4 text-[13px] font-black text-[#071014] shadow-[0_16px_34px_rgba(76,194,255,0.22)] transition hover:bg-[#8ddeff] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.055] disabled:text-[#8a8a8a] disabled:shadow-none';

const fieldClassName =
  'w-full rounded-xl border border-white/10 bg-[#111111] px-3 py-2.5 text-sm font-semibold text-white outline-none transition placeholder:text-[#777] focus:border-[#4cc2ff] focus:ring-2 focus:ring-[#4cc2ff]/20';

const smallLabelClassName = 'mb-1 block text-[11px] font-black uppercase tracking-wide text-[#9a9a9a]';

const blockTypeOptions: Array<{ value: DocumentBlockType; label: string }> = [
  { value: 'title', label: 'Title' },
  { value: 'heading', label: 'Heading' },
  { value: 'subheading', label: 'Subheading' },
  { value: 'paragraph', label: 'Paragraph' },
  { value: 'bullet', label: 'Bullet' },
  { value: 'quote', label: 'Quote' },
  { value: 'callout', label: 'Callout' },
];

const fontOptions: Array<{ value: DocumentFontFamily; label: string }> = [
  { value: 'inter', label: 'Modern' },
  { value: 'serif', label: 'Serif' },
  { value: 'mono', label: 'Mono' },
];

const colorSwatches = ['#0f172a', '#1d4ed8', '#0f766e', '#b45309', '#be123c', '#6d28d9', '#334155', '#111827'];

const fontStacks: Record<DocumentFontFamily, string> = {
  inter: 'Inter, Arial, Helvetica, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: '"Courier New", Courier, monospace',
};

const canvasFontStacks: Record<DocumentFontFamily, string> = {
  inter: 'Arial, Helvetica, sans-serif',
  serif: 'Georgia, Times New Roman, serif',
  mono: 'Courier New, Courier, monospace',
};

const templateLabels: Record<DocumentTemplate, string> = {
  blank: 'Blank Document',
  'exam-pack': 'Exam Pack',
  notes: 'Study Notes',
  'answer-key': 'Answer Key',
  syllabus: 'Syllabus',
};

const pageWidth = 760;
const pageHeight = 1040;
const pagePaddingX = 56;
const pagePaddingY = 64;
const pageContentHeight = pageHeight - (pagePaddingY * 2);
const pageContentWidth = pageWidth - (pagePaddingX * 2);
const blockSpacing = 18;
const defaultPageLayout: DocumentPageLayout = {
  margin: 24,
  padding: 42,
  borderWidth: 1,
  borderColor: '#e2e8f0',
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const textToHtml = (value: string) => escapeHtml(value).replace(/\r?\n/g, '<br />');

const htmlToPlainText = (html: string) => {
  if (typeof document === 'undefined') return html;
  const container = document.createElement('div');
  container.innerHTML = html;
  return (container.innerText || container.textContent || '').replace(/\u00a0/g, ' ').trimEnd();
};

const sanitizeHtml = (html: string) => {
  if (typeof document === 'undefined') return html;
  const container = document.createElement('div');
  container.innerHTML = html;
  container.querySelectorAll('script, style, noscript, meta, link').forEach((element) => element.remove());

  const allowedTags = new Set([
    'a', 'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'sub', 'sup', 'font',
    'span', 'div', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'code', 'pre', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  ]);

  const sanitizeElement = (element: Element) => {
    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value;
      if (name.startsWith('on')) {
        element.removeAttribute(attribute.name);
        return;
      }
      if (name === 'href' || name === 'src') {
        if (/^\s*(javascript|data):/i.test(value)) {
          element.removeAttribute(attribute.name);
        }
        return;
      }
      if (name === 'style') {
        const safeDeclarations = value
          .split(';')
          .map((entry) => entry.trim())
          .filter(Boolean)
          .filter((entry) => /^(color|background-color|font-size|font-family|font-weight|font-style|text-decoration|text-align|line-height)(\s*:)/i.test(entry))
          .join('; ');
        if (!safeDeclarations) {
          element.removeAttribute(attribute.name);
          return;
        }
        element.setAttribute('style', safeDeclarations);
        return;
      }
      if (name === 'class' || name === 'id' || name === 'title' || name === 'alt' || name === 'colspan' || name === 'rowspan') {
        return;
      }
      element.removeAttribute(attribute.name);
    });

    Array.from(element.children).forEach((child) => {
      const childElement = child as Element;
      sanitizeElement(childElement);
      const tagName = childElement.tagName.toLowerCase();
      if (!allowedTags.has(tagName)) {
        while (childElement.firstChild) {
          childElement.parentNode?.insertBefore(childElement.firstChild, childElement);
        }
        childElement.remove();
      }
    });
  };

  Array.from(container.children).forEach((child) => {
    sanitizeElement(child as Element);
  });

  return container.innerHTML.trim();
};

const getBlockPlainText = (block: DocumentBlock) => htmlToPlainText(block.html);

const getBlockDisplayHtml = (block: DocumentBlock) => block.html || '&nbsp;';

const createBlockId = () => `doc-block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeNameKey = (value: string) => value.trim().toLowerCase();

const slugifyFileName = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || `document-${Date.now()}`;

const getUniqueDocumentName = (baseName: string, existingNames: Set<string>) => {
  const cleanBase = baseName.trim() || 'Premium Document';
  if (!existingNames.has(normalizeNameKey(cleanBase))) return cleanBase;

  for (let index = 2; index < 100; index += 1) {
    const candidate = `${cleanBase} ${index}`;
    if (!existingNames.has(normalizeNameKey(candidate))) return candidate;
  }

  return `${cleanBase} ${Date.now().toString(36)}`;
};

const createBlock = (type: DocumentBlockType, text = ''): DocumentBlock => {
  const common = {
    id: createBlockId(),
    type,
    html: textToHtml(text),
    fontFamily: 'inter' as DocumentFontFamily,
    color: '#0f172a',
    align: 'left' as DocumentAlign,
    bold: false,
    italic: false,
  };

  if (type === 'title') {
    return {
      ...common,
      html: textToHtml(text || 'Premium Exam Pack'),
      fontSize: 30,
      align: 'center',
      bold: true,
    };
  }

  if (type === 'heading') {
    return {
      ...common,
      html: textToHtml(text || 'Section heading'),
      fontSize: 21,
      color: '#0f766e',
      bold: true,
    };
  }

  if (type === 'subheading') {
    return {
      ...common,
      html: textToHtml(text || 'Short subheading'),
      fontSize: 15,
      color: '#334155',
      bold: true,
    };
  }

  if (type === 'bullet') {
    return {
      ...common,
      html: textToHtml(text || 'Important point for revision'),
      fontSize: 12,
    };
  }

  if (type === 'quote') {
    return {
      ...common,
      html: textToHtml(text || 'Use this space for a key rule, formula, or exam insight.'),
      fontSize: 13,
      color: '#475569',
      italic: true,
    };
  }

  if (type === 'callout') {
    return {
      ...common,
      html: textToHtml(text || 'Exam focus: add the most important takeaway here.'),
      fontSize: 13,
      color: '#0f172a',
      bold: true,
    };
  }

  return {
    ...common,
    html: textToHtml(text || 'Write your content here. You can format every block from the right sidebar.'),
    fontSize: 12,
  };
};

const createTemplateBlocks = (template: DocumentTemplate, contextName: string) => {
  if (template === 'blank') {
    return [createBlock('paragraph', '')];
  }

  if (template === 'answer-key') {
    return [
      createBlock('title', `${contextName} Answer Key`),
      createBlock('heading', 'Answer Key'),
      createBlock('paragraph', 'Add question numbers, correct options, and short explanations.'),
      createBlock('bullet', 'Q1 - Option A - Add explanation'),
      createBlock('bullet', 'Q2 - Option C - Add explanation'),
      createBlock('callout', 'Review note: verify final answers before publishing.'),
    ];
  }

  if (template === 'syllabus') {
    return [
      createBlock('title', `${contextName} Syllabus`),
      createBlock('heading', 'Exam Overview'),
      createBlock('paragraph', 'Add eligibility, stages, marking scheme, and important dates.'),
      createBlock('heading', 'Topic List'),
      createBlock('bullet', 'Unit 1 - Add topic'),
      createBlock('bullet', 'Unit 2 - Add topic'),
    ];
  }

  if (template === 'notes') {
    return [
      createBlock('title', `${contextName} Study Notes`),
      createBlock('heading', 'Concept Snapshot'),
      createBlock('paragraph', 'Start with the direct concept explanation in your own words.'),
      createBlock('subheading', 'Exam Points'),
      createBlock('bullet', 'Point 1 - add a high-yield fact'),
      createBlock('bullet', 'Point 2 - add a common trap'),
      createBlock('quote', 'Memory hook or formula goes here.'),
    ];
  }

  return [
    createBlock('title', `${contextName} Premium Pack`),
    createBlock('heading', 'High-Yield Roadmap'),
    createBlock('paragraph', 'Add the exam strategy, must-do chapters, and revision order.'),
    createBlock('subheading', 'Priority Topics'),
    createBlock('bullet', 'Topic 1 - why it matters'),
    createBlock('bullet', 'Topic 2 - expected question pattern'),
    createBlock('callout', 'Final sprint: add the one-page revision focus here.'),
  ];
};

const getEditableBlockStyle = (block: DocumentBlock): CSSProperties => ({
  color: block.color,
  fontFamily: fontStacks[block.fontFamily],
  fontSize: `${block.fontSize}px`,
  fontStyle: block.italic ? 'italic' : 'normal',
  fontWeight: block.bold ? 800 : 500,
  lineHeight: block.type === 'title' ? 1.18 : block.type === 'heading' ? 1.25 : 1.55,
  textAlign: block.align,
});

const getBlockPreviewStyle = (block: DocumentBlock): CSSProperties => ({
  color: block.color,
  fontFamily: fontStacks[block.fontFamily],
  fontSize: `${block.fontSize}px`,
  fontStyle: block.italic ? 'italic' : 'normal',
  fontWeight: block.bold ? 800 : 500,
  lineHeight: block.type === 'title' ? 1.18 : 1.5,
  textAlign: block.align,
});

const getRowsForBlock = (block: DocumentBlock) => {
  const plainText = getBlockPlainText(block);
  const lineCount = Math.max(1, plainText.split(/\r?\n/).length);
  const softWrapCount = Math.ceil(plainText.length / (block.type === 'title' ? 34 : 80));
  return Math.max(1, Math.min(12, lineCount + softWrapCount));
};

type DocumentPage = {
  id: string;
  blocks: DocumentBlock[];
};

const estimateBlockHeight = (block: DocumentBlock) => {
  const text = getBlockPlainText(block) || ' ';
  const lineHeight = block.type === 'title' ? block.fontSize * 1.38 : block.type === 'heading' ? block.fontSize * 1.35 : block.fontSize * 1.65;
  const lines = Math.max(1, Math.ceil(text.length / (block.type === 'title' ? 26 : block.type === 'heading' ? 38 : 72)));
  return Math.ceil((lines * lineHeight) + (block.type === 'title' ? 14 : 10));
};

const paginateBlocks = (blocks: DocumentBlock[], measuredHeights: Record<string, number>) => {
  const pages: DocumentPage[] = [];
  let currentPage: DocumentBlock[] = [];
  let remainingHeight = pageContentHeight;

  const commitPage = () => {
    if (!currentPage.length) return;
    pages.push({ id: `page-${pages.length + 1}`, blocks: currentPage });
    currentPage = [];
    remainingHeight = pageContentHeight;
  };

  blocks.forEach((block) => {
    const blockHeight = measuredHeights[block.id] || estimateBlockHeight(block);
    const requiredHeight = blockHeight + (currentPage.length ? blockSpacing : 0);

    if (requiredHeight <= remainingHeight) {
      currentPage.push(block);
      remainingHeight -= requiredHeight;
      return;
    }

    if (currentPage.length) {
      commitPage();
    }

    if (blockHeight > pageContentHeight) {
      const plainText = getBlockPlainText(block);
      const chunkSize = Math.max(120, Math.floor(plainText.length / 3));
      let cursor = 0;

      while (cursor < plainText.length) {
        const chunkText = plainText.slice(cursor, cursor + chunkSize);
        const chunkBlock: DocumentBlock = { ...block, id: `${block.id}-${cursor}`, html: textToHtml(chunkText) };
        const fragmentHeight = estimateBlockHeight(chunkBlock) + (currentPage.length ? blockSpacing : 0);
        if (fragmentHeight > remainingHeight && currentPage.length) {
          commitPage();
        }
        currentPage.push(chunkBlock);
        remainingHeight -= fragmentHeight;
        cursor += chunkSize;
        if (remainingHeight <= 0 && cursor < plainText.length) commitPage();
      }
      return;
    }

    currentPage.push(block);
    remainingHeight -= blockHeight;
  });

  commitPage();
  return pages;
};

const StudyDocumentStudio = ({
  activeCard,
  activeFileNames,
  currentFolderPath,
  defaultMetadata,
  onClose,
  onSaved,
}: StudyDocumentStudioProps) => {
  const contextName = activeCard?.name || 'Study Hub';
  const defaultDocumentName = useMemo(
    () => getUniqueDocumentName(`${contextName} Premium Notes`, activeFileNames),
    [activeFileNames, contextName]
  );
  const initialBlocks = useMemo(() => createTemplateBlocks('blank', contextName), [contextName]);

  const [blocks, setBlocks] = useState<DocumentBlock[]>(initialBlocks);
  const [selectedBlockId, setSelectedBlockId] = useState(initialBlocks[0]?.id || '');
  const [blockHeights, setBlockHeights] = useState<Record<string, number>>({});
  const [documentName, setDocumentName] = useState(defaultDocumentName);
  const [metadata, setMetadata] = useState<StudyCardFileMetadataPayload>(() => ({
    ...defaultMetadata,
    name: defaultDocumentName,
    status: defaultMetadata.status || 'draft',
    visibility: defaultMetadata.visibility || 'public',
    language: defaultMetadata.language || 'hinglish',
    sourceType: defaultMetadata.sourceType || 'platform',
    sourceName: defaultMetadata.sourceName || 'Study Hub Document Studio',
    notes: defaultMetadata.notes || 'Created with Study Hub Document Studio',
  }));
  const [isPremiumDocument, setIsPremiumDocument] = useState<boolean>(() => Boolean((defaultMetadata as any).premium));
  const [activeTemplate, setActiveTemplate] = useState<DocumentTemplate>('blank');
  const [isSaving, setSaving] = useState(false);
  const [isPreviewing, setPreviewing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pageLayout, setPageLayout] = useState<DocumentPageLayout>(defaultPageLayout);
  const [activeInlineFormat, setActiveInlineFormat] = useState({
    fontFamily: 'inter' as DocumentFontFamily,
    fontSize: 12,
    color: '#0f172a',
    align: 'left' as DocumentAlign,
    bold: false,
    italic: false,
    underline: false,
  });
  const [activeEditorBlockId, setActiveEditorBlockId] = useState<string | null>(null);
  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const editorShellRef = useRef<HTMLDivElement | null>(null);

  const selectedBlock = blocks.find((block) => block.id === selectedBlockId) || blocks[0];
  const duplicateName = activeFileNames.has(normalizeNameKey(documentName));
  const pages = useMemo(() => paginateBlocks(blocks, blockHeights), [blocks, blockHeights]);
  const canSave = Boolean(activeCard && documentName.trim() && blocks.some((block) => getBlockPlainText(block).trim()) && !duplicateName);

  useLayoutEffect(() => {
    const nextHeights: Record<string, number> = {};
    blocks.forEach((block) => {
      const element = blockRefs.current[block.id];
      nextHeights[block.id] = element?.offsetHeight || estimateBlockHeight(block);
    });
    setBlockHeights(nextHeights);
  }, [blocks]);

  const updateBlock = (blockId: string, patch: Partial<DocumentBlock>) => {
    setBlocks((current) => current.map((block) => (block.id === blockId ? { ...block, ...patch } : block)));
  };

  const updateBlockHtml = (blockId: string, html: string) => {
    updateBlock(blockId, { html: sanitizeHtml(html) });
  };

  const updateSelectedBlock = (patch: Partial<DocumentBlock>) => {
    if (!selectedBlock) return;
    updateBlock(selectedBlock.id, patch);
  };

  const syncBlockHtmlFromEditor = (blockId: string) => {
    const element = blockRefs.current[blockId];
    if (element) updateBlockHtml(blockId, element.innerHTML);
  };

  const updateSelectionFormatState = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const selectionNode = selection.anchorNode?.parentElement?.closest('[data-block-id]') as HTMLElement | null;
    const blockId = selectionNode?.dataset.blockId || null;
    if (blockId) {
      setActiveEditorBlockId(blockId);
      if (selectedBlock?.id !== blockId) {
        setSelectedBlockId(blockId);
      }
    }

    const nextFormat = {
      fontFamily: (document.queryCommandValue('fontName') || '').toLowerCase().includes('courier')
        ? 'mono'
        : (document.queryCommandValue('fontName') || '').toLowerCase().includes('georgia') || (document.queryCommandValue('fontName') || '').toLowerCase().includes('times')
          ? 'serif'
          : 'inter',
      fontSize: Math.max(9, Math.min(36, Number(document.queryCommandValue('fontSize') || 3) * 4 + 8)),
      color: document.queryCommandValue('foreColor') || selectedBlock?.color || '#0f172a',
      align: document.queryCommandState('justifyCenter') ? 'center' : document.queryCommandState('justifyRight') ? 'right' : 'left',
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
    };

    setActiveInlineFormat(nextFormat);
  };

  const applyInlineCommand = (command: string, value?: string) => {
    if (typeof document === 'undefined') return;
    document.execCommand('styleWithCSS', false, true);
    document.execCommand(command, false, value);
    if (activeEditorBlockId) {
      window.setTimeout(() => syncBlockHtmlFromEditor(activeEditorBlockId), 0);
    }
    window.setTimeout(() => updateSelectionFormatState(), 0);
  };

  useEffect(() => {
    const handleSelectionChange = () => updateSelectionFormatState();
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isInsideEditor = Boolean(target?.closest('[data-block-id]'));
      if (!isInsideEditor) return;

      const isMeta = event.ctrlKey || event.metaKey;
      if (!isMeta) return;

      const key = event.key.toLowerCase();
      if (key === 'b') {
        event.preventDefault();
        applyInlineCommand('bold');
        return;
      }
      if (key === 'i') {
        event.preventDefault();
        applyInlineCommand('italic');
        return;
      }
      if (key === 'u') {
        event.preventDefault();
        applyInlineCommand('underline');
        return;
      }
      if (key === '1' && event.shiftKey) {
        event.preventDefault();
        updateSelectedBlock({ type: 'title' });
        return;
      }
      if (key === '2' && event.shiftKey) {
        event.preventDefault();
        updateSelectedBlock({ type: 'heading' });
        return;
      }
      if (key === '3' && event.shiftKey) {
        event.preventDefault();
        updateSelectedBlock({ type: 'subheading' });
        return;
      }
      if (key === 'l' && event.shiftKey) {
        event.preventDefault();
        applyInlineCommand('justifyLeft');
        return;
      }
      if (key === 'e' && event.shiftKey) {
        event.preventDefault();
        applyInlineCommand('justifyCenter');
        return;
      }
      if (key === 'r' && event.shiftKey) {
        event.preventDefault();
        applyInlineCommand('justifyRight');
        return;
      }
      if (key === 's') {
        event.preventDefault();
        void handleSavePdf();
        return;
      }
      if (key === 'f' && event.altKey) {
        event.preventDefault();
        setIsFullscreen((current) => !current);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeEditorBlockId, selectedBlock]);

  const updateMetadata = (key: keyof StudyCardFileMetadataPayload, value: string) => {
    setMetadata((current) => ({ ...current, [key]: value }));
  };

  const applyTemplate = (template: DocumentTemplate) => {
    const nextBlocks = createTemplateBlocks(template, contextName);
    setActiveTemplate(template);
    setBlocks(nextBlocks);
    setSelectedBlockId(nextBlocks[0]?.id || '');
  };

  const addBlockAfterSelection = (type: DocumentBlockType) => {
    const nextBlock = createBlock(type);
    setBlocks((current) => {
      const selectedIndex = current.findIndex((block) => block.id === selectedBlockId);
      const insertIndex = selectedIndex >= 0 ? selectedIndex + 1 : current.length;
      return [...current.slice(0, insertIndex), nextBlock, ...current.slice(insertIndex)];
    });
    setSelectedBlockId(nextBlock.id);
  };

  const replaceSelectionWithBlocks = (nextBlocks: DocumentBlock[]) => {
    if (!selectedBlock) return;
    setBlocks((current) => {
      const selectedIndex = current.findIndex((block) => block.id === selectedBlock.id);
      if (selectedIndex < 0) return current;
      return [...current.slice(0, selectedIndex), ...nextBlocks, ...current.slice(selectedIndex + 1)];
    });
    setSelectedBlockId(nextBlocks[0]?.id || selectedBlock.id);
  };

  const insertBlocksAfterSelection = (nextBlocks: DocumentBlock[]) => {
    if (!selectedBlock) return;
    setBlocks((current) => {
      const selectedIndex = current.findIndex((block) => block.id === selectedBlock.id);
      const insertIndex = selectedIndex >= 0 ? selectedIndex + 1 : current.length;
      return [...current.slice(0, insertIndex), ...nextBlocks, ...current.slice(insertIndex)];
    });
    setSelectedBlockId(nextBlocks[0]?.id || selectedBlock.id);
  };

  const parseClipboardToBlocks = (html: string, fallbackText: string) => {
    const container = document.createElement('div');
    container.innerHTML = sanitizeHtml(html);

    const buildBlocksFromNode = (node: ChildNode): DocumentBlock[] => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        return text.trim() ? [createBlock('paragraph', text)] : [];
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return [];
      }

      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();
      const content = sanitizeHtml(element.innerHTML || element.textContent || '');

      if (tagName === 'h1') return [{ ...createBlock('title', htmlToPlainText(content)), html: content }];
      if (tagName === 'h2' || tagName === 'h3') return [{ ...createBlock('heading', htmlToPlainText(content)), html: content }];
      if (tagName === 'h4') return [{ ...createBlock('subheading', htmlToPlainText(content)), html: content }];
      if (tagName === 'blockquote') return [{ ...createBlock('quote', htmlToPlainText(content)), html: content }];
      if (tagName === 'li') return [{ ...createBlock('bullet', htmlToPlainText(content)), html: content }];
      if (tagName === 'p') return [{ ...createBlock('paragraph', htmlToPlainText(content)), html: content }];
      if (tagName === 'div' || tagName === 'section' || tagName === 'article' || tagName === 'li' || tagName === 'ul' || tagName === 'ol') {
        const nestedBlocks = Array.from(element.childNodes).flatMap(buildBlocksFromNode);
        if (nestedBlocks.length) return nestedBlocks;
      }

      return [{ ...createBlock('paragraph', htmlToPlainText(content || element.textContent || '')), html: content || textToHtml(element.textContent || '') }];
    };

    const blocksFromClipboard = Array.from(container.childNodes).flatMap(buildBlocksFromNode);

    if (!blocksFromClipboard.length && fallbackText.trim()) {
      blocksFromClipboard.push(createBlock('paragraph', fallbackText));
    }

    return blocksFromClipboard;
  };

  const handlePasteIntoBlock = (blockId: string, event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const html = event.clipboardData.getData('text/html') || '';
    const text = event.clipboardData.getData('text/plain') || '';

    // Prefer HTML paste to preserve formatting
    if (html.trim()) {
      const importedBlocks = parseClipboardToBlocks(html, text);

      // If nothing meaningful parsed, fallback to inserting plain text
      if (!importedBlocks.length) {
        document.execCommand('insertHTML', false, textToHtml(text || ''));
        // sync state after DOM mutation
        setTimeout(() => {
          const el = blockRefs.current[blockId];
          if (el) updateBlockHtml(blockId, el.innerHTML);
        }, 0);
        return;
      }

      // If single block, insert its HTML at caret position (preserve inline formatting)
      if (importedBlocks.length === 1) {
        const fragmentHtml = importedBlocks[0].html || textToHtml(importedBlocks[0].html || importedBlocks[0].text || text);
        document.execCommand('insertHTML', false, fragmentHtml);

        // After insertion, read the DOM and update internal state to keep in sync
        setTimeout(() => {
          const el = blockRefs.current[blockId];
          if (el) updateBlockHtml(blockId, el.innerHTML);
        }, 0);

        return;
      }

      // Multiple blocks: insert first block at caret, then insert remaining blocks after current block
      const [firstBlock, ...restBlocks] = importedBlocks;
      const firstHtml = firstBlock.html || textToHtml(firstBlock.html || firstBlock.text || '');
      document.execCommand('insertHTML', false, firstHtml);

      // Sync current block content with DOM then insert other blocks after selection
      setTimeout(() => {
        const el = blockRefs.current[blockId];
        if (el) updateBlockHtml(blockId, el.innerHTML);
        // Insert remaining blocks after the current block
        insertBlocksAfterSelection(restBlocks.map((b) => ({ ...b })));
      }, 0);

      return;
    }

    // Fallback plain-text insertion
    document.execCommand('insertHTML', false, textToHtml(text || ''));
    setTimeout(() => {
      const el = blockRefs.current[blockId];
      if (el) updateBlockHtml(blockId, el.innerHTML);
    }, 0);
  };

  const handleBlockInput = (blockId: string, event: FormEvent<HTMLDivElement>) => {
    updateBlockHtml(blockId, event.currentTarget.innerHTML);
  };

  const duplicateSelectedBlock = () => {
    if (!selectedBlock) return;
    const nextBlock = { ...selectedBlock, id: createBlockId() };
    setBlocks((current) => {
      const selectedIndex = current.findIndex((block) => block.id === selectedBlock.id);
      const insertIndex = selectedIndex >= 0 ? selectedIndex + 1 : current.length;
      return [...current.slice(0, insertIndex), nextBlock, ...current.slice(insertIndex)];
    });
    setSelectedBlockId(nextBlock.id);
  };

  const deleteSelectedBlock = () => {
    if (!selectedBlock || blocks.length <= 1) return;
    setBlocks((current) => {
      const selectedIndex = current.findIndex((block) => block.id === selectedBlock.id);
      const nextBlocks = current.filter((block) => block.id !== selectedBlock.id);
      setSelectedBlockId(nextBlocks[Math.max(0, selectedIndex - 1)]?.id || nextBlocks[0]?.id || '');
      return nextBlocks;
    });
  };

  const moveSelectedBlock = (direction: -1 | 1) => {
    if (!selectedBlock) return;
    setBlocks((current) => {
      const index = current.findIndex((block) => block.id === selectedBlock.id);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= current.length) return current;
      const nextBlocks = current.slice();
      const [movedBlock] = nextBlocks.splice(index, 1);
      nextBlocks.splice(targetIndex, 0, movedBlock);
      return nextBlocks;
    });
  };

  const createPdfFile = async () => {
    const blob = await createDocumentPdfBlob({
      title: documentName.trim() || 'Premium Document',
      folderPath: currentFolderPath,
      blocks,
    });

    if (blob.size > 14 * 1024 * 1024) {
      throw new Error('Generated PDF is too large. Reduce content or split it into smaller documents.');
    }

    return new File([blob], `${slugifyFileName(documentName)}.pdf`, { type: 'application/pdf' });
  };

  const handlePreviewPdf = async () => {
    setPreviewing(true);
    try {
      const file = await createPdfFile();
      const previewUrl = URL.createObjectURL(file);
      window.open(previewUrl, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(previewUrl), 60_000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'PDF preview failed');
    } finally {
      setPreviewing(false);
    }
  };

  const handleSavePdf = async () => {
    if (!activeCard) {
      toast.error('Open a folder before saving a document.');
      return;
    }
    if (!canSave || isSaving) {
      if (duplicateName) toast.error('A PDF with this name already exists in this folder.');
      return;
    }

    setSaving(true);
    try {
      const file = await createPdfFile();
      const uploadMetadata: StudyCardFileMetadataPayload = {
        ...metadata,
        name: documentName.trim(),
        sourceType: metadata.sourceType || 'platform',
        sourceName: metadata.sourceName || 'Study Hub Document Studio',
        notes: metadata.notes || 'Created with Study Hub Document Studio',
      };

      // attach premium flag separately (server expects a specific field if supported)
      const finalMetadata = { ...uploadMetadata, premium: isPremiumDocument } as any;

      await toast.promise(
        uploadAdminStudyCardFiles(activeCard._id, [file], [documentName.trim()], [finalMetadata]),
        {
          loading: 'Saving document PDF...',
          success: 'Document saved as PDF',
          error: 'Document save failed',
        }
      );
      await onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Document save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={['fixed inset-0 z-50 flex items-center justify-center bg-black/72 text-[#f3f3f3] backdrop-blur-xl', isFullscreen ? 'p-0' : 'p-3 sm:p-4'].join(' ')}>
      <section ref={editorShellRef} className={['study-document-studio flex overflow-hidden border border-white/10 bg-[#181a18] shadow-[0_32px_90px_rgba(0,0,0,0.68)]', isFullscreen ? 'h-screen w-screen flex-col rounded-none' : 'max-h-[94vh] w-full max-w-[96rem] flex-col rounded-[1.75rem]'].join(' ')}>
        <div className="flex flex-col gap-3 border-b border-white/10 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-[#9cdcfe]">
              <DocumentPlusIcon className="h-4 w-4" aria-hidden="true" />
              Word-style PDF Studio
            </p>
            <h3 className="mt-1 truncate text-xl font-black text-white">Create premium text content</h3>
            <p className="mt-1 truncate text-sm font-semibold text-[#a8a8a8]">{currentFolderPath}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setIsFullscreen((current) => !current)} className={modalButtonClassName}>
              <ArrowsPointingOutIcon className="h-4 w-4" aria-hidden="true" />
              {isFullscreen ? 'Exit full screen' : 'Full screen'}
            </button>
            <button type="button" onClick={() => void handlePreviewPdf()} disabled={isPreviewing || isSaving} className={modalButtonClassName}>
              <EyeIcon className="h-4 w-4" aria-hidden="true" />
              {isPreviewing ? 'Preparing...' : 'Preview PDF'}
            </button>
            <button type="button" onClick={() => void handleSavePdf()} disabled={!canSave || isSaving || isPreviewing} className={primaryButtonClassName}>
              <DocumentTextIcon className="h-4 w-4" aria-hidden="true" />
              {isSaving ? 'Saving...' : 'Save as PDF'}
            </button>
            <button type="button" onClick={onClose} className={modalButtonClassName} aria-label="Close document studio">
              <XMarkIcon className="h-4 w-4" aria-hidden="true" />
              Close
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[17rem_minmax(0,1fr)_20rem]">
          <aside className="hidden min-h-0 border-r border-white/10 bg-[#111411] lg:flex lg:flex-col">
            <div className="border-b border-white/10 p-4">
              <span className={smallLabelClassName}>File name</span>
              <input
                value={documentName}
                onChange={(event) => setDocumentName(event.target.value)}
                className={fieldClassName}
                placeholder="Document name"
              />
              {duplicateName && (
                <p className="mt-2 rounded-xl border border-amber-300/20 bg-amber-400/[0.08] px-2 py-1.5 text-xs font-bold text-[#ffd88a]">
                  Same PDF name already exists here.
                </p>
              )}
            </div>

            <div className="border-b border-white/10 p-4">
              <span className={smallLabelClassName}>Templates</span>
              <div className="grid gap-2">
                {(Object.keys(templateLabels) as DocumentTemplate[]).map((template) => (
                  <button
                    key={template}
                    type="button"
                    onClick={() => applyTemplate(template)}
                    className={[
                      'flex min-h-10 items-center gap-2 rounded-xl border px-3 text-left text-sm font-black transition',
                      activeTemplate === template
                        ? 'border-[#4cc2ff]/50 bg-cyan-300/[0.12] text-white'
                        : 'border-white/10 bg-white/[0.045] text-[#d6d6d6] hover:bg-white/[0.08]',
                    ].join(' ')}
                  >
                    <DocumentTextIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{templateLabels[template]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="study-scrollbar min-h-0 flex-1 overflow-auto p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className={smallLabelClassName}>Outline</span>
                <QueueListIcon className="h-4 w-4 text-[#9cdcfe]" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                {blocks.map((block, index) => (
                  <button
                    key={block.id}
                    type="button"
                    onClick={() => setSelectedBlockId(block.id)}
                    className={[
                      'flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-bold transition',
                      selectedBlockId === block.id
                        ? 'border-[#4cc2ff]/55 bg-[#223443] text-white'
                        : 'border-white/10 bg-white/[0.045] text-[#cfcfcf] hover:bg-white/[0.08]',
                    ].join(' ')}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-black/20 text-[10px] font-black">
                      {index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate capitalize">{block.type}</span>
                      <span className="block truncate text-[11px] font-semibold text-[#9a9a9a]">{getBlockPlainText(block) || 'Empty block'}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <main className="study-scrollbar min-h-0 overflow-auto bg-[#252824] p-3 sm:p-5">
            <div className="mx-auto w-full max-w-[56rem]">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-[#181a18] p-2 shadow-sm">
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => addBlockAfterSelection('heading')} className={modalButtonClassName}>
                    <PlusIcon className="h-4 w-4" aria-hidden="true" />
                    Heading
                  </button>
                  <button type="button" onClick={() => addBlockAfterSelection('paragraph')} className={modalButtonClassName}>
                    <PlusIcon className="h-4 w-4" aria-hidden="true" />
                    Text
                  </button>
                  <button type="button" onClick={() => addBlockAfterSelection('bullet')} className={modalButtonClassName}>
                    <PlusIcon className="h-4 w-4" aria-hidden="true" />
                    Bullet
                  </button>
                  <button type="button" onClick={() => applyInlineCommand('bold')} className={[modalButtonClassName, activeInlineFormat.bold ? 'border-[#4cc2ff]/50 bg-cyan-300/[0.12]' : ''].join(' ')} title="Bold (Ctrl/Cmd+B)">
                    B
                  </button>
                  <button type="button" onClick={() => applyInlineCommand('italic')} className={[modalButtonClassName, activeInlineFormat.italic ? 'border-[#4cc2ff]/50 bg-cyan-300/[0.12]' : ''].join(' ')} title="Italic (Ctrl/Cmd+I)">
                    I
                  </button>
                  <button type="button" onClick={() => applyInlineCommand('underline')} className={[modalButtonClassName, activeInlineFormat.underline ? 'border-[#4cc2ff]/50 bg-cyan-300/[0.12]' : ''].join(' ')} title="Underline (Ctrl/Cmd+U)">
                    U
                  </button>
                  <select
                    value={activeInlineFormat.fontFamily}
                    onChange={(event) => {
                      const nextFont = event.target.value as DocumentFontFamily;
                      setActiveInlineFormat((current) => ({ ...current, fontFamily: nextFont }));
                      applyInlineCommand('fontName', nextFont === 'serif' ? 'Georgia' : nextFont === 'mono' ? 'Courier New' : 'Inter');
                    }}
                    className={fieldClassName}
                  >
                    {fontOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={duplicateSelectedBlock} disabled={!selectedBlock} className={modalButtonClassName} title="Duplicate block">
                    <DocumentDuplicateIcon className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => moveSelectedBlock(-1)} disabled={!selectedBlock} className={modalButtonClassName} title="Move up">
                    <ChevronUpIcon className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => moveSelectedBlock(1)} disabled={!selectedBlock} className={modalButtonClassName} title="Move down">
                    <ChevronDownIcon className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="space-y-8 pb-8">
                {pages.map((page, pageIndex) => (
                  <article
                    key={page.id}
                    className="mx-auto w-full overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white text-slate-950 shadow-[0_28px_90px_rgba(0,0,0,0.32)] ring-1 ring-slate-950/[0.04]"
                    style={{
                      minHeight: `${pageHeight}px`,
                      margin: `${pageLayout.margin}px`,
                      padding: `${pageLayout.padding}px`,
                      borderWidth: pageLayout.borderWidth,
                      borderColor: pageLayout.borderColor,
                      borderStyle: 'solid',
                    }}
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 py-5 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400" style={{ paddingLeft: `${pageLayout.padding}px`, paddingRight: `${pageLayout.padding}px` }}>
                      <span>Study Hub Premium</span>
                      <span>{`Page ${pageIndex + 1}`}</span>
                    </div>
                    <div className="space-y-4" style={{ padding: `${pageLayout.padding}px` }}>
                      {page.blocks.map((block) => {
                        const isSelected = block.id === selectedBlockId;
                        const sharedStyle = getEditableBlockStyle(block);
                        const blockShellClassName = [
                          'group rounded-2xl border px-4 py-3 transition',
                          isSelected ? 'border-cyan-400/80 bg-cyan-50/70 shadow-[0_0_0_3px_rgba(14,165,233,0.12)]' : 'border-transparent hover:border-slate-200',
                          block.type === 'quote' ? 'border-l-4 border-l-slate-300 bg-slate-50/90' : '',
                          block.type === 'callout' ? 'border-teal-200 bg-teal-50/90' : '',
                        ].join(' ');

                        return (
                          <div key={block.id} className={blockShellClassName} onClick={() => setSelectedBlockId(block.id)}>
                            {block.type === 'bullet' ? (
                              <div className="grid grid-cols-[1.3rem_minmax(0,1fr)] gap-2">
                                <span className="pt-0.5 text-sm font-black text-slate-500">-</span>
                                <div
                                  ref={(element) => {
                                    blockRefs.current[block.id] = element;
                                  }}
                                  contentEditable
                                  suppressContentEditableWarning
                                  role="textbox"
                                  aria-multiline="true"
                                  data-block-id={block.id}
                                  onFocus={() => setSelectedBlockId(block.id)}
                                  onInput={(event) => handleBlockInput(block.id, event)}
                                  onPaste={(event) => handlePasteIntoBlock(block.id, event)}
                                  className="study-document-block-input min-h-[2rem] w-full outline-none"
                                  style={sharedStyle}
                                  dangerouslySetInnerHTML={{ __html: getBlockDisplayHtml(block) }}
                                />
                              </div>
                            ) : (
                              <div
                                ref={(element) => {
                                  blockRefs.current[block.id] = element;
                                }}
                                contentEditable
                                suppressContentEditableWarning
                                role="textbox"
                                aria-multiline="true"
                                data-block-id={block.id}
                                onFocus={() => setSelectedBlockId(block.id)}
                                onInput={(event) => handleBlockInput(block.id, event)}
                                onPaste={(event) => handlePasteIntoBlock(block.id, event)}
                                className="study-document-block-input min-h-[2rem] w-full outline-none"
                                style={sharedStyle}
                                dangerouslySetInnerHTML={{ __html: getBlockDisplayHtml(block) }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </article>
                ))}
              </div>

            </div>
          </main>

          <aside className="study-scrollbar min-h-0 overflow-auto border-t border-white/10 bg-[#111411] p-4 lg:border-l lg:border-t-0">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-[#9cdcfe]">Format</p>
                <h4 className="mt-1 text-lg font-black text-white">Right sidebar</h4>
              </div>
              <PaintBrushIcon className="h-6 w-6 text-[#9cdcfe]" aria-hidden="true" />
            </div>

            <div className="space-y-4">
              <label className="block lg:hidden">
                <span className={smallLabelClassName}>File name</span>
                <input value={documentName} onChange={(event) => setDocumentName(event.target.value)} className={fieldClassName} />
              </label>

              <div className="space-y-3 rounded-[1.4rem] border border-white/10 bg-white/[0.045] p-3">
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className={smallLabelClassName}>Page margin</span>
                    <input
                      type="range"
                      min={8}
                      max={64}
                      value={pageLayout.margin}
                      onChange={(event) => setPageLayout((current) => ({ ...current, margin: Number(event.target.value) }))}
                      className="w-full accent-cyan-300"
                    />
                    <p className="mt-1 text-[11px] text-[#9a9a9a]">{pageLayout.margin}px</p>
                  </label>
                  <label className="block">
                    <span className={smallLabelClassName}>Inner padding</span>
                    <input
                      type="range"
                      min={24}
                      max={96}
                      value={pageLayout.padding}
                      onChange={(event) => setPageLayout((current) => ({ ...current, padding: Number(event.target.value) }))}
                      className="w-full accent-cyan-300"
                    />
                    <p className="mt-1 text-[11px] text-[#9a9a9a]">{pageLayout.padding}px</p>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className={smallLabelClassName}>Border width</span>
                    <input
                      type="range"
                      min={0}
                      max={4}
                      value={pageLayout.borderWidth}
                      onChange={(event) => setPageLayout((current) => ({ ...current, borderWidth: Number(event.target.value) }))}
                      className="w-full accent-cyan-300"
                    />
                  </label>
                  <label className="block">
                    <span className={smallLabelClassName}>Border color</span>
                    <input
                      type="color"
                      value={pageLayout.borderColor}
                      onChange={(event) => setPageLayout((current) => ({ ...current, borderColor: event.target.value }))}
                      className="mt-2 h-10 w-full rounded-xl border border-white/10 bg-transparent p-1"
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className={smallLabelClassName}>Status</span>
                  <select
                    value={metadata.status || 'draft'}
                    onChange={(event) => updateMetadata('status', event.target.value)}
                    className={fieldClassName}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </label>
                <label className="block">
                  <span className={smallLabelClassName}>Language</span>
                  <select
                    value={metadata.language || 'hinglish'}
                    onChange={(event) => updateMetadata('language', event.target.value)}
                    className={fieldClassName}
                  >
                    <option value="hinglish">Hinglish</option>
                    <option value="english">English</option>
                    <option value="hindi">Hindi</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </label>
              </div>

              <div className="mt-3">
                <span className={smallLabelClassName}>Premium</span>
                <div className="mt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPremiumDocument((v) => !v)}
                    className={[modalButtonClassName, isPremiumDocument ? 'bg-amber-400 text-black border-amber-300/40' : ''].join(' ')}
                  >
                    {isPremiumDocument ? 'Premium ON' : 'Mark as Premium'}
                  </button>
                  <p className="text-sm text-[#9a9a9a]">Toggle to mark entire document as premium.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className={smallLabelClassName}>Year</span>
                  <input value={metadata.year || ''} onChange={(event) => updateMetadata('year', event.target.value)} className={fieldClassName} placeholder="2026" />
                </label>
                <label className="block">
                  <span className={smallLabelClassName}>Subject</span>
                  <input value={metadata.subject || ''} onChange={(event) => updateMetadata('subject', event.target.value)} className={fieldClassName} placeholder="Subject" />
                </label>
              </div>

              <label className="block">
                <span className={smallLabelClassName}>Topic</span>
                <input value={metadata.topic || ''} onChange={(event) => updateMetadata('topic', event.target.value)} className={fieldClassName} placeholder="Topic" />
              </label>

              {selectedBlock && (
                <div className="space-y-4 rounded-[1.4rem] border border-white/10 bg-white/[0.045] p-3">
                  <label className="block">
                    <span className={smallLabelClassName}>Block style</span>
                    <select
                      value={selectedBlock.type}
                      onChange={(event) => updateSelectedBlock({ type: event.target.value as DocumentBlockType })}
                      className={fieldClassName}
                    >
                      {blockTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className={smallLabelClassName}>Font</span>
                    <select
                      value={selectedBlock.fontFamily}
                      onChange={(event) => updateSelectedBlock({ fontFamily: event.target.value as DocumentFontFamily })}
                      className={fieldClassName}
                    >
                      {fontOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>

                  <div className="grid grid-cols-[1fr_5rem] gap-2">
                    <label className="block">
                      <span className={smallLabelClassName}>Size</span>
                      <input
                        type="range"
                        min={9}
                        max={36}
                        value={selectedBlock.fontSize}
                        onChange={(event) => updateSelectedBlock({ fontSize: Number(event.target.value) })}
                        className="w-full accent-cyan-300"
                      />
                    </label>
                    <label className="block">
                      <span className={smallLabelClassName}>Px</span>
                      <input
                        type="number"
                        min={9}
                        max={36}
                        value={selectedBlock.fontSize}
                        onChange={(event) => updateSelectedBlock({ fontSize: Number(event.target.value) })}
                        className={fieldClassName}
                      />
                    </label>
                  </div>

                  <div>
                    <span className={smallLabelClassName}>Color</span>
                    <div className="grid grid-cols-[repeat(8,1fr)] gap-1.5">
                      {colorSwatches.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => updateSelectedBlock({ color })}
                          className={[
                            'h-8 rounded-lg border transition',
                            selectedBlock.color.toLowerCase() === color.toLowerCase() ? 'border-white ring-2 ring-[#4cc2ff]/60' : 'border-white/10',
                          ].join(' ')}
                          style={{ backgroundColor: color }}
                          aria-label={`Use color ${color}`}
                        />
                      ))}
                    </div>
                    <input
                      type="color"
                      value={selectedBlock.color}
                      onChange={(event) => updateSelectedBlock({ color: event.target.value })}
                      className="mt-2 h-10 w-full rounded-xl border border-white/10 bg-transparent p-1"
                    />
                  </div>

                  <div>
                    <span className={smallLabelClassName}>Alignment</span>
                    <div className="grid grid-cols-3 gap-2">
                      {(['left', 'center', 'right'] as DocumentAlign[]).map((align) => (
                        <button
                          key={align}
                          type="button"
                          onClick={() => updateSelectedBlock({ align })}
                          className={[
                            modalButtonClassName,
                            selectedBlock.align === align ? 'border-[#4cc2ff]/50 bg-cyan-300/[0.12]' : '',
                          ].join(' ')}
                        >
                          {align}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => updateSelectedBlock({ bold: !selectedBlock.bold })}
                      className={[modalButtonClassName, selectedBlock.bold ? 'border-[#4cc2ff]/50 bg-cyan-300/[0.12]' : ''].join(' ')}
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSelectedBlock({ italic: !selectedBlock.italic })}
                      className={[modalButtonClassName, selectedBlock.italic ? 'border-[#4cc2ff]/50 bg-cyan-300/[0.12]' : ''].join(' ')}
                    >
                      I
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={duplicateSelectedBlock} className={modalButtonClassName}>
                      <DocumentDuplicateIcon className="h-4 w-4" aria-hidden="true" />
                      Copy block
                    </button>
                    <button type="button" onClick={deleteSelectedBlock} disabled={blocks.length <= 1} className={modalButtonClassName}>
                      <TrashIcon className="h-4 w-4" aria-hidden="true" />
                      Delete
                    </button>
                  </div>
                </div>
              )}

              <button type="button" onClick={() => void handlePreviewPdf()} disabled={isPreviewing || isSaving} className={`${modalButtonClassName} w-full`}>
                <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
                Open generated PDF
              </button>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
};

interface PdfDocumentInput {
  title: string;
  folderPath: string;
  blocks: DocumentBlock[];
}

type PdfImage = {
  data: Uint8Array;
  width: number;
  height: number;
};

const pdfPageWidth = 595.28;
const pdfPageHeight = 841.89;
const canvasPageWidth = 960;
const canvasPageHeight = 1358;
const canvasMargin = 86;
const canvasHeaderY = 42;
const canvasFooterY = canvasPageHeight - 48;
const canvasContentTop = 104;
const canvasContentBottom = canvasPageHeight - 88;

const getCanvasFont = (block: DocumentBlock, scale = 1.46) => {
  const weight = block.bold ? '700' : '400';
  const style = block.italic ? 'italic ' : '';
  const size = Math.max(10, Math.round(block.fontSize * scale));
  return `${style}${weight} ${size}px ${canvasFontStacks[block.fontFamily]}`;
};

const getCanvasLineHeight = (block: DocumentBlock) => {
  const size = Math.max(10, Math.round(block.fontSize * 1.46));
  return Math.round(size * (block.type === 'title' ? 1.25 : 1.48));
};

const wrapCanvasText = (context: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  const explicitLines = (text || ' ').replace(/\r\n/g, '\n').split('\n');
  const wrappedLines: string[] = [];

  explicitLines.forEach((line) => {
    const words = line.split(/\s+/).filter(Boolean);
    if (!words.length) {
      wrappedLines.push('');
      return;
    }

    let currentLine = '';
    words.forEach((word) => {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (context.measureText(candidate).width <= maxWidth || !currentLine) {
        currentLine = candidate;
        return;
      }
      wrappedLines.push(currentLine);
      currentLine = word;
    });

    if (currentLine) wrappedLines.push(currentLine);
  });

  return wrappedLines.length ? wrappedLines : [''];
};

const drawPageChrome = (
  context: CanvasRenderingContext2D,
  title: string,
  folderPath: string,
  pageNumber: number
) => {
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvasPageWidth, canvasPageHeight);

  context.fillStyle = '#94a3b8';
  context.font = '700 15px Arial, Helvetica, sans-serif';
  context.textBaseline = 'top';
  context.fillText('Study Hub Premium', canvasMargin, canvasHeaderY);

  context.textAlign = 'right';
  context.fillText(title.slice(0, 68), canvasPageWidth - canvasMargin, canvasHeaderY);
  context.textAlign = 'left';

  context.strokeStyle = '#e2e8f0';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(canvasMargin, 76);
  context.lineTo(canvasPageWidth - canvasMargin, 76);
  context.stroke();

  context.fillStyle = '#94a3b8';
  context.font = '600 13px Arial, Helvetica, sans-serif';
  context.fillText(folderPath.slice(0, 88), canvasMargin, canvasFooterY);
  context.textAlign = 'right';
  context.fillText(`Page ${pageNumber}`, canvasPageWidth - canvasMargin, canvasFooterY);
  context.textAlign = 'left';
};

const createCanvasPage = (input: PdfDocumentInput, pageNumber: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = canvasPageWidth;
  canvas.height = canvasPageHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is not available in this browser.');
  drawPageChrome(context, input.title, input.folderPath, pageNumber);
  return { canvas, context };
};

const createDocumentPdfBlob = async (input: PdfDocumentInput) => {
  const pages: HTMLCanvasElement[] = [];
  let page = createCanvasPage(input, 1);
  pages.push(page.canvas);
  let y = canvasContentTop;

  const createNextPage = () => {
    page = createCanvasPage(input, pages.length + 1);
    pages.push(page.canvas);
    y = canvasContentTop;
  };

  input.blocks.forEach((block) => {
    const context = page.context;
    context.font = getCanvasFont(block);
    context.textBaseline = 'top';
    const lineHeight = getCanvasLineHeight(block);
    const beforeSpacing = block.type === 'title' ? 8 : block.type === 'heading' ? 24 : 12;
    const afterSpacing = block.type === 'title' ? 30 : block.type === 'heading' ? 16 : 10;
    const bulletIndent = block.type === 'bullet' ? 32 : 0;
    const decorationInset = block.type === 'callout' ? 18 : block.type === 'quote' ? 20 : 0;
    const maxWidth = canvasPageWidth - (canvasMargin * 2) - bulletIndent - (decorationInset * 2);
    const lines = wrapCanvasText(context, getBlockPlainText(block), maxWidth);

    y += beforeSpacing;
    lines.forEach((line, lineIndex) => {
      if (y + lineHeight > canvasContentBottom) createNextPage();
      const activeContext = page.context;
      activeContext.font = getCanvasFont(block);
      activeContext.textBaseline = 'top';

      if (block.type === 'callout') {
        activeContext.fillStyle = '#ecfdf5';
        activeContext.fillRect(canvasMargin - 16, y - 8, canvasPageWidth - (canvasMargin * 2) + 32, lineHeight + 16);
        activeContext.fillStyle = '#14b8a6';
        activeContext.fillRect(canvasMargin - 16, y - 8, 6, lineHeight + 16);
      }

      if (block.type === 'quote') {
        activeContext.fillStyle = '#f8fafc';
        activeContext.fillRect(canvasMargin - 16, y - 6, canvasPageWidth - (canvasMargin * 2) + 32, lineHeight + 12);
        activeContext.fillStyle = '#94a3b8';
        activeContext.fillRect(canvasMargin - 16, y - 6, 5, lineHeight + 12);
      }

      activeContext.fillStyle = block.color;
      const textWidth = activeContext.measureText(line).width;
      let x = canvasMargin + bulletIndent + decorationInset;

      if (block.align === 'center' && block.type !== 'bullet') {
        x = (canvasPageWidth - textWidth) / 2;
      } else if (block.align === 'right' && block.type !== 'bullet') {
        x = canvasPageWidth - canvasMargin - decorationInset - textWidth;
      }

      if (block.type === 'bullet' && lineIndex === 0) {
        activeContext.fillStyle = '#64748b';
        activeContext.font = '700 21px Arial, Helvetica, sans-serif';
        activeContext.fillText('-', canvasMargin + 4, y);
        activeContext.font = getCanvasFont(block);
        activeContext.fillStyle = block.color;
      }

      activeContext.fillText(line, x, y);
      y += lineHeight;
    });
    y += afterSpacing;
  });

  const images = await Promise.all(
    pages.map(async (canvas) => ({
      data: dataUrlToUint8Array(canvas.toDataURL('image/jpeg', 0.86)),
      width: canvas.width,
      height: canvas.height,
    }))
  );

  return buildPdfFromJpegImages(images);
};

const dataUrlToUint8Array = (dataUrl: string) => {
  const base64 = dataUrl.split(',')[1] || '';
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const concatUint8Arrays = (chunks: Uint8Array[], totalLength: number) => {
  const result = new Uint8Array(totalLength);
  let offset = 0;
  chunks.forEach((chunk) => {
    result.set(chunk, offset);
    offset += chunk.length;
  });
  return result;
};

const buildPdfFromJpegImages = (images: PdfImage[]) => {
  if (!images.length) throw new Error('No PDF pages were generated.');

  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let byteLength = 0;

  const write = (value: string | Uint8Array) => {
    const chunk = typeof value === 'string' ? encoder.encode(value) : value;
    chunks.push(chunk);
    byteLength += chunk.length;
  };

  const beginObject = (id: number) => {
    offsets[id] = byteLength;
    write(`${id} 0 obj\n`);
  };

  write('%PDF-1.4\n');

  const pageObjectIds = images.map((_, index) => 3 + (index * 3));
  const contentObjectIds = images.map((_, index) => 4 + (index * 3));
  const imageObjectIds = images.map((_, index) => 5 + (index * 3));
  const objectCount = 2 + (images.length * 3);

  beginObject(1);
  write('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  beginObject(2);
  write(`<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${images.length} >>\nendobj\n`);

  images.forEach((image, index) => {
    const pageId = pageObjectIds[index];
    const contentId = contentObjectIds[index];
    const imageId = imageObjectIds[index];
    const imageName = `Im${index + 1}`;
    const content = `q\n${pdfPageWidth} 0 0 ${pdfPageHeight} 0 0 cm\n/${imageName} Do\nQ`;

    beginObject(pageId);
    write(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pdfPageWidth} ${pdfPageHeight}] /Resources << /XObject << /${imageName} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`);

    beginObject(contentId);
    write(`<< /Length ${encoder.encode(content).length} >>\nstream\n${content}\nendstream\nendobj\n`);

    beginObject(imageId);
    write(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.data.length} >>\nstream\n`);
    write(image.data);
    write('\nendstream\nendobj\n');
  });

  const xrefOffset = byteLength;
  write(`xref\n0 ${objectCount + 1}\n`);
  write('0000000000 65535 f \n');
  for (let id = 1; id <= objectCount; id += 1) {
    write(`${String(offsets[id] || 0).padStart(10, '0')} 00000 n \n`);
  }
  write(`trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return new Blob([concatUint8Arrays(chunks, byteLength)], { type: 'application/pdf' });
};

export default StudyDocumentStudio;
