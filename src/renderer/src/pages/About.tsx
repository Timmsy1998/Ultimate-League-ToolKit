import { GitFork, ScrollText, ShieldCheck } from 'lucide-react'
import logo from '@renderer/assets/logo.svg'
import styles from './Page.module.css'
import aboutStyles from './About.module.css'

export function About(): React.JSX.Element {
  return (
    <div className={styles.page}>
      <div className={aboutStyles.hero}>
        <img src={logo} alt="ULTK" className={aboutStyles.logo} />
        <h1 className={aboutStyles.name}>ULTK</h1>
        <p className={aboutStyles.tagline}>Ultimate League ToolKit</p>
        <p className={aboutStyles.version}>Version 0.1.0</p>
      </div>

      <p className={aboutStyles.description}>
        An open source companion app for League of Legends, built on the local client API. No
        memory access, no injection, no interaction with Vanguard, and no gameplay automation —
        just client-side tools.
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
          href="https://github.com/Timmsy1998/Ultimate-League-ToolKit/blob/main/LICENSE"
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
