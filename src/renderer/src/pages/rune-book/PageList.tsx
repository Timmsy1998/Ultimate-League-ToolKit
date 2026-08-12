import { BookOpen, Copy, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { EmptyState } from '@renderer/components/EmptyState/EmptyState'
import type { RuneBookPage } from '../../../../shared/rune-book-types'
import styles from './PageList.module.css'

interface PageListProps {
  title: string
  pages: RuneBookPage[]
  styleNameById: Map<number, string>
  onNew: () => void
  onEdit: (page: RuneBookPage) => void
  onDuplicate: (page: RuneBookPage) => void
  onDelete: (page: RuneBookPage) => void
  onImport: (page: RuneBookPage) => void
}

export function PageList({
  title,
  pages,
  styleNameById,
  onNew,
  onEdit,
  onDuplicate,
  onDelete,
  onImport
}: PageListProps): React.JSX.Element {
  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        <button type="button" className={styles.newButton} onClick={onNew}>
          <Plus size={14} strokeWidth={1.75} aria-hidden="true" />
          New page
        </button>
      </div>

      {pages.length === 0 ? (
        <EmptyState icon={BookOpen} title="No saved pages yet" description="Build one and it'll show up here." />
      ) : (
        <ul className={styles.list}>
          {pages.map((page) => (
            <li key={page.id} className={styles.item}>
              <div className={styles.itemMain}>
                <span className={styles.name}>{page.name}</span>
                <span className={styles.styles}>
                  {styleNameById.get(page.primaryStyleId) ?? 'Unknown'} ·{' '}
                  {styleNameById.get(page.subStyleId) ?? 'Unknown'}
                </span>
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.importButton}
                  onClick={() => onImport(page)}
                  title="Import to client"
                >
                  <Upload size={12} strokeWidth={1.75} aria-hidden="true" />
                  Import
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => onEdit(page)}
                  title="Edit"
                  aria-label="Edit page"
                >
                  <Pencil size={14} strokeWidth={1.75} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => onDuplicate(page)}
                  title="Duplicate"
                  aria-label="Duplicate page"
                >
                  <Copy size={14} strokeWidth={1.75} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={`${styles.iconButton} ${styles.dangerButton}`}
                  onClick={() => onDelete(page)}
                  title="Delete"
                  aria-label="Delete page"
                >
                  <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
