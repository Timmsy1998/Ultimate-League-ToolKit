import { createContext, useContext } from 'react'
import type { PageId } from '@renderer/components/Sidebar/Sidebar'

const NavigationContext = createContext<(page: PageId) => void>(() => {})

export const NavigationProvider = NavigationContext.Provider

export function useNavigation(): (page: PageId) => void {
  return useContext(NavigationContext)
}
