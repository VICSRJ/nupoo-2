import { loadPages, savePages, loadTrash, saveTrash, createPage, type Page } from './storage'

export type PageSearchResult = Page & { score: number }

export const dataService = {
  load(): Page[] { return loadPages() },
  save(pages: Page[]) { savePages(pages) },
  loadTrash(): Page[] { return loadTrash() },
  saveTrash(pages: Page[]) { saveTrash(pages) },
  create(parentId: string | null = null): Page { return createPage(parentId) },
  search(pages: Page[], query: string): PageSearchResult[] {
    const q = query.trim().toLocaleLowerCase('cs-CZ')
    if (!q) return []
    return pages
      .map((page) => {
        const title = page.title.toLocaleLowerCase('cs-CZ')
        const body = page.blocks.map((block) => block.text).join(' ').toLocaleLowerCase('cs-CZ')
        let score = 0
        if (title === q) score += 100
        else if (title.startsWith(q)) score += 60
        else if (title.includes(q)) score += 40
        if (body.includes(q)) score += 15
        return { ...page, score }
      })
      .filter((page) => page.score > 0)
      .sort((a, b) => b.score - a.score || b.updatedAt.localeCompare(a.updatedAt))
  },
}
