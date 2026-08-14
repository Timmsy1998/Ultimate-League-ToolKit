import { GitFork, ScrollText, ShieldCheck } from 'lucide-react'
import logo from '@renderer/assets/logo.svg'
import { useAppVersion } from '@renderer/updater/useAppVersion'
import styles from './Page.module.css'
import aboutStyles from './About.module.css'

export function About(): React.JSX.Element {
  const version = useAppVersion()

  return (
    <div className={styles.page}>
      <div className={aboutStyles.hero}>
        <img src={logo} alt="ULTK" className={aboutStyles.logo} />
        <h1 className={aboutStyles.name}>ULTK</h1>
        <p className={aboutStyles.tagline}>Ultimate League ToolKit</p>
        <p className={aboutStyles.version}>{version ? `Version ${version}` : 'Loading version…'}</p>
      </div>

      <p className={aboutStyles.description}>
        An open source companion app for League of Legends, built on the local client API. No
        game or client process memory access, no interaction with Vanguard, and no gameplay
        automation. The one narrow, always opt-in exception is client theming — a cosmetic reskin
        of the League Client's own UI, plus an in-client panel for three fixed tools (Dodge,
        Invite Friends, Loot Helper) that calls back into ULTK's own client-side logic. Both are
        off by default and reversible with one click.
      </p>

      <div className={aboutStyles.links}>
        <a
          className={aboutStyles.linkButton}
          href="https://github.com/Timmsy1998/Ultimate-League-ToolKit"
          title="Source on GitHub"
        >
          <GitFork size={16} strokeWidth={1.75} aria-hidden="true" />
          <span className={aboutStyles.srOnly}>Source on GitHub</span>
        </a>
        <a
          className={aboutStyles.linkButton}
          href="https://github.com/Timmsy1998/Ultimate-League-ToolKit/blob/master/LICENSE"
          title="License"
        >
          <ScrollText size={16} strokeWidth={1.75} aria-hidden="true" />
          <span className={aboutStyles.srOnly}>License</span>
        </a>
        <a
          className={aboutStyles.linkButton}
          href="https://developer.riotgames.com/docs/lol"
          title="Riot Developer Policies"
        >
          <ShieldCheck size={16} strokeWidth={1.75} aria-hidden="true" />
          <span className={aboutStyles.srOnly}>Riot Developer Policies</span>
        </a>
      </div>
    </div>
  )
}
