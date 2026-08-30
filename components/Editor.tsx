'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { nanoid } from 'nanoid'
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Check, Code2, Copy, GripVertical, Heading, List, ListCheck, ListOrdered, Plus, Quote, Trash2 } from 'lucide-react'
import type { Page, Block } from '@/lib/storage'

type FaIconName = 'fa-font' | 'fa-heading' | 'fa-list-ul' | 'fa-list-ol' | 'fa-list-check' | 'fa-quote-left' | 'fa-code' | 'fa-plus' | 'fa-grip-vertical' | 'fa-copy' | 'fa-trash-can' | 'fa-check'
type MenuItem = { type: Block['type']; label: string; icon: FaIconName }

const BLOCK_TYPES: MenuItem[] = [
  { type: 'paragraph', label: 'Text', icon: 'fa-font' },
  { type: 'heading', label: 'Nadpis', icon: 'fa-heading' },
  { type: 'bulletList', label: 'Odrážky', icon: 'fa-list-ul' },
  { type: 'orderedList', label: 'Číslování', icon: 'fa-list-ol' },
  { type: 'taskList', label: 'Úkoly', icon: 'fa-list-check' },
  { type: 'blockquote', label: 'Citace', icon: 'fa-quote-left' },
  { type: 'codeBlock', label: 'Kód', icon: 'fa-code' },
]

function FA({ icon, size = 14 }: { icon: FaIconName; size?: number }) {
  const props = { size, strokeWidth: 1.8, 'aria-hidden': true } as const
  const icons: Record<FaIconName, React.ReactNode> = {
    'fa-font': <span style={{ fontSize: size, lineHeight: 1 }}>T</span>,
    'fa-heading': <Heading {...props} />,
    'fa-list-ul': <List {...props} />,
    'fa-list-ol': <ListOrdered {...props} />,
    'fa-list-check': <ListCheck {...props} />,
    'fa-quote-left': <Quote {...props} />,
    'fa-code': <Code2 {...props} />,
    'fa-plus': <Plus {...props} />,
    'fa-grip-vertical': <GripVertical {...props} />,
    'fa-copy': <Copy {...props} />,
    'fa-trash-can': <Trash2 {...props} />,
    'fa-check': <Check {...props} />,
  }
  return icons[icon]
}

function textContent(text: string) {
  return text ? [{ type: 'text', text }] : []
}

function contentFor(block: Block) {
  const text = textContent(block.text)
  if (block.type === 'heading') return { type: 'doc', content: [{ type: 'heading', attrs: { level: block.level || 1 }, content: text }] }
  if (block.type === 'bulletList') return { type: 'doc', content: [{ type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: text }] }] }] }
  if (block.type === 'orderedList') return { type: 'doc', content: [{ type: 'orderedList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: text }] }] }] }
  if (block.type === 'taskList') return { type: 'doc', content: [{ type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: text }] }] }] }
  if (block.type === 'blockquote') return { type: 'doc', content: [{ type: 'blockquote', content: [{ type: 'paragraph', content: text }] }] }
  if (block.type === 'codeBlock') return { type: 'doc', content: [{ type: 'codeBlock', content: block.text ? [{ type: 'text', text: block.text }] : [] }] }
  return { type: 'doc', content: [{ type: 'paragraph', content: text }] }
}

function htmlFor(block: Block) {
  return contentFor(block)
}

function typeLabel(block: Block) {
  return block.type === 'heading' ? `Nadpis ${block.level || 1}` : BLOCK_TYPES.find((item) => item.type === block.type)?.label || 'Text'
}

function TypeMenu({ block, onChange }: { block: Block; onChange: (type: Block['type'], level?: 1 | 2 | 3) => void }) {
  return <div className="block-type-menu" onMouseDown={(event) => event.stopPropagation()}>
    <div className="block-menu-title">Změnit typ</div>
    {BLOCK_TYPES.map((item) => <button key={item.type} type="button" onClick={() => onChange(item.type, item.type === 'heading' ? block.level || 1 : undefined)} className={`block-type-item ${block.type === item.type ? 'is-active' : ''}`}>
      <span className="block-menu-icon"><FA icon={item.icon} size={13} /></span><span>{item.label}</span>{block.type === item.type && <FA icon="fa-check" size={10} />}
    </button>)}
    {block.type === 'heading' && <><div className="block-menu-separator" /><div className="block-menu-title">Úroveň</div>
      {[1, 2, 3].map((level) => <button key={level} type="button" onClick={() => onChange('heading', level as 1 | 2 | 3)} className={`block-type-item ${block.level === level ? 'is-active' : ''}`}>
        <span className="block-menu-icon heading-level">H{level}</span><span>Nadpis {level}</span>{block.level === level && <FA icon="fa-check" size={10} />}
      </button>)}
    </>}
  </div>
}

function Row({ block, active, onActivate, onContextMenu, onUpdate, onDelete, onDuplicate, onAdd }: { block: Block; active: boolean; onActivate: () => void; onContextMenu: (event: React.MouseEvent) => void; onUpdate: (value: Partial<Block>) => void; onDelete: () => void; onDuplicate: () => void; onAdd: () => void }) {
  const [typeMenuOpen, setTypeMenuOpen] = useState(false)
  const [toolbarTop, setToolbarTop] = useState(0)
  const rowRef = useRef<HTMLDivElement | null>(null)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id })

  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3] } }), TaskList, TaskItem.configure({ nested: true }), Placeholder.configure({ placeholder: 'Napiš něco…' })],
    content: htmlFor(block),
    immediatelyRender: false,
    editorProps: {
      attributes: { 'aria-label': typeLabel(block) },
    },
    onFocus: () => { onActivate(); requestAnimationFrame(updateToolbarPosition) },
    onSelectionUpdate: () => requestAnimationFrame(updateToolbarPosition),
    onUpdate: ({ editor: currentEditor }) => { onActivate(); onUpdate({ text: currentEditor.getText() }); requestAnimationFrame(updateToolbarPosition) },
  })

  function updateToolbarPosition() {
    if (!editor || !rowRef.current) return
    const rowRect = rowRef.current.getBoundingClientRect()
    const caret = editor.view.coordsAtPos(editor.state.selection.from)
    const caretCenter = (caret.top + caret.bottom) / 2
    setToolbarTop(caretCenter - rowRect.top)
  }

  useLayoutEffect(() => {
    if (!active) return
    const frame = requestAnimationFrame(updateToolbarPosition)
    return () => cancelAnimationFrame(frame)
  }, [active, block.text, block.type, block.level])

  useEffect(() => {
    if (editor && !editor.isFocused && (editor.getText() !== block.text || JSON.stringify(editor.getJSON()) !== JSON.stringify(htmlFor(block)))) {
      editor.commands.setContent(htmlFor(block), false)
    }
  }, [block.text, block.type, block.level, editor])

  const changeType = (type: Block['type'], level?: 1 | 2 | 3) => {
    const next: Block = { ...block, type, level: type === 'heading' ? level || 1 : undefined }
    onUpdate(next)
    editor?.commands.setContent(contentFor(next), false)
    editor?.commands.focus('start')
    setTypeMenuOpen(false)
    onActivate()
    requestAnimationFrame(updateToolbarPosition)
  }

  return <div ref={(node) => { rowRef.current = node; setNodeRef(node) }} onFocusCapture={onActivate} onContextMenu={onContextMenu} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.55 : 1 }} className={`block-row relative flex min-w-0 items-start rounded-md ${active ? 'is-active' : ''}`}>
    <div className={`block-toolbar ${active ? 'is-visible' : ''}`} style={{ top: toolbarTop }} onMouseDown={(event) => event.preventDefault()}>
      <button type="button" onClick={onAdd} aria-label="Přidat blok" title="Přidat blok" className="block-control"><FA icon="fa-plus" size={12} /></button>
      <div className="relative">
        <button type="button" onClick={() => setTypeMenuOpen((value) => !value)} aria-label={`Změnit typ: ${typeLabel(block)}`} title={`Změnit typ: ${typeLabel(block)}`} className={`block-control ${typeMenuOpen ? 'is-pressed' : ''}`}><FA icon={block.type === 'heading' ? 'fa-heading' : (BLOCK_TYPES.find((item) => item.type === block.type)?.icon || 'fa-font')} size={13} /></button>
        {typeMenuOpen && <TypeMenu block={block} onChange={changeType} />}
      </div>
      <button type="button" {...listeners} {...attributes} aria-label="Přesunout blok" title="Přesunout blok" className="block-control cursor-grab active:cursor-grabbing"><FA icon="fa-grip-vertical" size={12} /></button>
    </div>
    <div className="min-w-0 flex-1 py-0.5">{editor && <EditorContent editor={editor} className="tiptap" />}</div>
    {typeMenuOpen && <button type="button" aria-label="Zavřít nabídku" className="fixed inset-0 z-20 cursor-default bg-transparent" onMouseDown={() => setTypeMenuOpen(false)} />}
  </div>
}

export default function Editor({ page, onChange }: { page: Page; onChange: (page: Page) => void }) {
  const [blocks, setBlocks] = useState(page.blocks)
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const [context, setContext] = useState<{ blockId: string; x: number; y: number } | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  useEffect(() => { setBlocks(page.blocks); setActiveBlockId(null); setContext(null) }, [page.id])

  const persist = (next: Block[]) => { setBlocks(next); onChange({ ...page, blocks: next, updatedAt: new Date().toISOString() }) }
  const addAt = (index: number) => { const nextBlock: Block = { id: nanoid(), type: 'paragraph', text: '' }; persist([...blocks.slice(0, index + 1), nextBlock, ...blocks.slice(index + 1)]); setActiveBlockId(nextBlock.id) }
  const duplicateBlock = (index: number) => { const duplicate = { ...blocks[index], id: nanoid() }; persist([...blocks.slice(0, index + 1), duplicate, ...blocks.slice(index + 1)]); setActiveBlockId(duplicate.id); setContext(null) }
  const deleteBlock = (index: number) => { const next = blocks.filter((_, i) => i !== index); persist(next); setActiveBlockId(next[Math.min(index, next.length - 1)]?.id || null); setContext(null) }
  const drag = (event: DragEndEvent) => { if (!event.over || event.active.id === event.over.id) return; const from = blocks.findIndex((block) => block.id === event.active.id); const to = blocks.findIndex((block) => block.id === event.over?.id); if (from >= 0 && to >= 0) persist(arrayMove(blocks, from, to)) }

  useEffect(() => {
    const close = () => setContext(null)
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setContext(null) }
    window.addEventListener('mousedown', close); window.addEventListener('keydown', escape)
    return () => { window.removeEventListener('mousedown', close); window.removeEventListener('keydown', escape) }
  }, [])

  const contextIndex = context ? blocks.findIndex((block) => block.id === context.blockId) : -1
  const contextBlock = contextIndex >= 0 ? blocks[contextIndex] : null

  return <article className="mx-auto max-w-4xl px-3 py-10 sm:px-5 md:px-10 md:py-16" onMouseDown={(event) => {
    const target = event.target as HTMLElement
    if (!target.closest('.block-row') && !target.closest('.block-context-menu')) setActiveBlockId(null)
  }}>
    <div className="mb-8 pl-[76px] md:pl-[84px]"><div className="mb-3 text-5xl">{page.icon || '📄'}</div><input value={page.title} onChange={(event) => onChange({ ...page, title: event.target.value, updatedAt: new Date().toISOString() })} className="w-full bg-transparent text-4xl font-bold tracking-tight outline-none placeholder:text-zinc-300 sm:text-5xl" placeholder="Bez názvu" /></div>
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={drag}><SortableContext items={blocks.map((block) => block.id)} strategy={verticalListSortingStrategy}><div className="space-y-0.5">{blocks.map((block, index) => <Row key={block.id} block={block} active={activeBlockId === block.id} onActivate={() => { setActiveBlockId(block.id); setContext(null) }} onContextMenu={(event) => { event.preventDefault(); setActiveBlockId(block.id); const width = document.documentElement.clientWidth; const height = document.documentElement.clientHeight; setContext({ blockId: block.id, x: Math.min(event.clientX, Math.max(8, width - 238)), y: Math.min(event.clientY, Math.max(8, height - 370)) }) }} onAdd={() => addAt(index)} onDelete={() => deleteBlock(index)} onDuplicate={() => duplicateBlock(index)} onUpdate={(update) => persist(blocks.map((item) => item.id === block.id ? { ...item, ...update } : item))} />)}</div></SortableContext></DndContext>
    <button type="button" onClick={() => addAt(Math.max(0, blocks.length - 1))} className="ml-[76px] mt-4 flex items-center gap-2 text-sm text-zinc-400 transition hover:text-zinc-700 dark:hover:text-zinc-200"><FA icon="fa-plus" size={12} /> Přidat blok</button>
    {context && contextBlock && <div className="block-context-menu fixed z-50" style={{ left: context.x, top: context.y }} onMouseDown={(event) => event.stopPropagation()}>
      <div className="block-menu-title">{typeLabel(contextBlock)}</div>
      <div className="block-context-grid"><button type="button" className="block-context-item" onClick={() => duplicateBlock(contextIndex)}><FA icon="fa-copy" size={12} /> Duplikovat</button><button type="button" className="block-context-item danger" onClick={() => deleteBlock(contextIndex)}><FA icon="fa-trash-can" size={12} /> Smazat</button></div>
      <div className="block-menu-separator" /><div className="block-menu-title">Změnit typ</div>
      {BLOCK_TYPES.map((item) => <button key={item.type} type="button" className={`block-type-item ${contextBlock.type === item.type ? 'is-active' : ''}`} onClick={() => { const level = item.type === 'heading' ? contextBlock.level || 1 : undefined; const next = { ...contextBlock, type: item.type, level }; persist(blocks.map((block) => block.id === contextBlock.id ? next : block)); setActiveBlockId(next.id); setContext(null) }}><span className="block-menu-icon"><FA icon={item.icon} size={13} /></span><span>{item.label}</span>{contextBlock.type === item.type && <FA icon="fa-check" size={10} />}</button>)}
    </div>}
  </article>
}
