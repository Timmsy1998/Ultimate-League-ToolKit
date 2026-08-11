import { Notification } from 'electron'
import { readSettings } from '../settings/store'

interface NotifyOptions {
  title: string
  body: string
}

export async function notify({ title, body }: NotifyOptions): Promise<void> {
  if (!Notification.isSupported()) return

  const settings = await readSettings()
  if (!settings.notificationsEnabled) return

  new Notification({ title, body }).show()
}
