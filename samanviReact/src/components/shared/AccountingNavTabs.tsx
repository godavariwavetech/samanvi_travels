import { useNavigate, useLocation } from 'react-router'
import { TopNavTabs } from './TopNavTabs'

const TABS = [
  { label: 'Voucher Entry',     path: '/accounting/voucher' },
  { label: 'Approved Vouchers', path: '/accounting/approved' },
  { label: 'Day Book',          path: '/accounting/daybook' },
  { label: 'Trial Balance',     path: '/accounting/trial-balance' },
  { label: 'Balance Sheet',     path: '/accounting/balance-sheet' },
]

export function AccountingNavTabs() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const active = TABS.find(t => t.path === pathname)?.label ?? TABS[0].label

  return (
    <TopNavTabs
      tabs={TABS.map(t => t.label)}
      activeTab={active}
      onChange={label => {
        const tab = TABS.find(t => t.label === label)
        if (tab) navigate(tab.path)
      }}
    />
  )
}
