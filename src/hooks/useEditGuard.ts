import { useState } from 'react'
import { useBlocker } from 'react-router-dom'

export function useEditGuard(editMode: boolean, resetEditState: () => void) {
  const blocker = useBlocker(editMode)
  const [pendingTabAction, setPendingTabAction] = useState<(() => void) | null>(null)

  const isDialogOpen = blocker.state === 'blocked' || pendingTabAction !== null

  const handleNavigate = () => {
    resetEditState()
    if (blocker.state === 'blocked') blocker.proceed()
    if (pendingTabAction) {
      pendingTabAction()
      setPendingTabAction(null)
    }
  }

  const handleStay = () => {
    if (blocker.state === 'blocked') blocker.reset()
    setPendingTabAction(null)
  }

  const guardTabChange = (setTab: (t: string) => void) => (tab: string) => {
    if (editMode) {
      setPendingTabAction(() => () => setTab(tab))
    } else {
      setTab(tab)
    }
  }

  return { isDialogOpen, handleNavigate, handleStay, guardTabChange }
}
