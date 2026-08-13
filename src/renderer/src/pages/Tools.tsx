import { Sparkles } from 'lucide-react'
import { Card } from '@renderer/components/Card/Card'
import { useSettings } from '@renderer/settings/SettingsContext'
import { InviteFriendsCard } from './tools/InviteFriendsCard'
import { LootHelperCard } from './tools/LootHelperCard'
import { MatchHistoryCard } from './tools/MatchHistoryCard'
import { RunePagesCard } from './tools/RunePagesCard'
import { SessionOverviewCard } from './tools/SessionOverviewCard'
import styles from './Page.module.css'
import toolStyles from './Tools.module.css'

const COMING_SOON_TOOLS = [
  {
    icon: Sparkles,
    title: 'More on the way',
    description: 'The toolkit grows from here — suggestions are welcome.'
  }
] as const

export function Tools(): React.JSX.Element {
  const { settings } = useSettings()

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
        <SessionOverviewCard />
        <RunePagesCard />
        <MatchHistoryCard />
        {settings.lootHelperEnabled ? <LootHelperCard /> : null}
        {settings.inviteFriendsEnabled ? <InviteFriendsCard /> : null}
        {COMING_SOON_TOOLS.map(({ icon, title, description }) => (
          <Card key={title} icon={icon} title={title} tag="Coming soon">
            <p className={toolStyles.description}>{description}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
