# Nupoo

Nupoo je lehký **Notion-like blokový editor** postavený na Next.js, Reactu, TypeScriptu, Tailwind CSS, Tiptapu, dnd-kit a Zustandu.

## Co umí

- blokový editor s podporou textu, nadpisů, seznamů, úkolů, citací a kódu
- drag & drop řazení bloků
- vlastní kontextové menu bloku
- stránky a vnořené podstránky ve stromu
- oblíbené stránky
- rychlé fulltextové hledání názvů i obsahu
- automatické ukládání do `localStorage` s indikací „Ukládám / Uloženo“
- světlý / tmavý režim
- klávesové zkratky `Ctrl/Cmd + K` a `Ctrl/Cmd + N`
- responzivní ovládání pro desktop i mobil
- statický export kompatibilní s GitHub Pages

## Architektura

```text
app/
  layout.tsx          # metadata + shell
  page.tsx            # vstup do Workspace
  globals.css         # globální a editorové styly
components/
  Workspace.tsx       # UI workspace, strom, hledání, navigace
  Editor.tsx          # Tiptap + dnd-kit editor
lib/
  storage.ts          # typy a bezpečná localStorage persistence
  data-service.ts     # datová abstrakce nad storage/API
  store.ts            # Zustand store
```

### Datový model

`Page` obsahuje identitu stránky, její rodičovskou stránku, metadata a pole bloků. `parentId` vytváří stromovou strukturu. `Block` je atomický obsahový prvek editoru.

```ts
type Page = {
  id: string
  title: string
  icon?: string
  favorite?: boolean
  parentId?: string | null
  blocks: Block[]
  updatedAt: string
}

type Block = {
  id: string
  type: 'paragraph' | 'heading' | 'bulletList' | 'orderedList' | 'taskList' | 'blockquote' | 'codeBlock'
  level?: 1 | 2 | 3
  text: string
}
```

## Lokální vývoj

```bash
npm install
npm run dev
```

Aplikace poběží na `http://localhost:3000`.

### Kontrola před commitem

```bash
npm run type-check
npm run lint
npm run format:check
npm run build
```

## Deployment

GitHub Pages používá workflow `.github/workflows/pages.yml` a Next.js static export.

Pro lokální produkční kontrolu:

```bash
npm run preview
```

Projekt používá `basePath=/nupoo` pouze v GitHub Actions prostředí. Mimo CI zůstává základní cesta prázdná.

## Persistence a budoucí backend

UI není přímo navázané na `localStorage`. Workspace používá Zustand a datové operace jsou směrovány přes `lib/data-service.ts`. Díky tomu lze později nahradit local-first persistence REST/API implementací bez zásadního refaktoru UI.

## Roadmap

- undo / redo historie změn
- koš a obnova stránek
- přesouvání stránek ve stromu
- sofistikovanější editor bloků a markdown shortcuts
- import / export JSON a Markdown
- synchronizace přes backend
- multi-user workspace

## Licence

Projekt je aktuálně bez explicitně deklarované open-source licence. Použití a další distribuce by měly vycházet z rozhodnutí vlastníka repozitáře, dokud nebude licence doplněna.
