import { useLcuAsset } from './useLcuAsset'
import styles from './AssetIcon.module.css'

interface AssetIconProps {
  path: string
  label: string
  size?: number
  round?: boolean
}

export function AssetIcon({ path, label, size = 28, round = false }: AssetIconProps): React.JSX.Element {
  const dataUri = useLcuAsset(path || null)
  const dimension = { width: size, height: size, fontSize: Math.round(size * 0.38) }
  const className = round ? `${styles.icon} ${styles.round}` : styles.icon

  if (!dataUri) {
    return (
      <span className={`${className} ${styles.placeholder}`} style={dimension} aria-hidden="true">
        {label.slice(0, 2).toUpperCase()}
      </span>
    )
  }

  return <img className={className} style={dimension} src={dataUri} alt={label} />
}
