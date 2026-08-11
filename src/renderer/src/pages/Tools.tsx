import { BookOpen, Clock, LayoutList, Sparkles } from 'lucide-react'
import { Card } from '@renderer/components/Card/Card'
import styles from './Page.module.css'
import toolStyles from './Tools.module.css'

const TOOLS = [
  {
    icon: LayoutList,
    title: 'Match history',
    description: 'Browse recent games with a cleaner, faster view than the client.'
  },
  {
    icon: BookOpen,
    title: 'Rune pages',
    description: 'Build and switch between rune pages without leaving champ select.'
  },
  {
    icon: Clock,
    title: 'Session overview',
    description: 'A quiet summary of your current client session.'
  },
  {
    icon: Sparkles,
    title: 'More on the way',
    description: 'The toolkit grows from here — suggestions are welcome.'
  }
] as const

export function Tools(): React.JSX.Element {
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Tools</h1>
          <p className={styles.pageSubtitle}>
            Utilities that talk to the League Client. Nothing here touches the game itself.
          </p>
        </div>
      </div>

      <div className={styles.grid}>
        {TOOLS.map(({ icon, title, description }) => (
          <Card key={title} icon={icon} title={title} tag="Coming soon">
            <p className={toolStyles.description}>{description}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
