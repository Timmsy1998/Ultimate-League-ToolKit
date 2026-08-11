import logo from '@renderer/assets/logo.svg'
import styles from './TitleBar.module.css'

export function TitleBar(): React.JSX.Element {
  return (
    <header className={styles.titleBar}>
      <div className={styles.brand}>
        <img src={logo} alt="" className={styles.logo} />
        <span className={styles.wordmark}>ULTK</span>
      </div>
    </header>
  )
}
