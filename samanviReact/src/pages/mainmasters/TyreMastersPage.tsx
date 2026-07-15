import { useState } from 'react'
import { motion } from 'motion/react'
import { PageHeader, TopNavTabs, NameListMaster } from '@/components/shared'
import { mainmastersService } from '@/services/mainmasters.service'

const tabs = ['Tyre Positions', 'Tyre Vendors', 'Tyre Sizes', 'Tyre Make']

export default function TyreMastersPage() {
  const [tab, setTab] = useState(tabs[0])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <PageHeader title="Tyre Masters" subtitle="Manage the type lists used across the Tyre Management module" />
      <TopNavTabs tabs={tabs} activeTab={tab} onChange={setTab} />

      {tab === 'Tyre Positions' && (
        <NameListMaster
          label="Tyre Position"
          placeholder="e.g. Front Left, Spare 1…"
          fieldKey="position_name"
          queryKey="tyre-positions-master"
          getAll={mainmastersService.getTyrePositionsMaster}
          add={mainmastersService.addTyrePositionMaster}
          edit={mainmastersService.editTyrePositionMaster}
          remove={mainmastersService.deleteTyrePositionMaster}
        />
      )}

      {tab === 'Tyre Vendors' && (
        <NameListMaster
          label="Tyre Vendor"
          placeholder="e.g. Balaji Tyres, MRF Retreading…"
          fieldKey="vendor_name"
          queryKey="tyre-vendors"
          getAll={mainmastersService.getTyreVendors}
          add={mainmastersService.addTyreVendor}
          edit={mainmastersService.editTyreVendor}
          remove={mainmastersService.deleteTyreVendor}
        />
      )}

      {tab === 'Tyre Sizes' && (
        <NameListMaster
          label="Tyre Size"
          placeholder="e.g. 295/80 R22.5, 10.00-20…"
          fieldKey="size_name"
          queryKey="tyre-sizes"
          getAll={mainmastersService.getTyreSizes}
          add={mainmastersService.addTyreSize}
          edit={mainmastersService.editTyreSize}
          remove={mainmastersService.deleteTyreSize}
        />
      )}

      {tab === 'Tyre Make' && (
        <NameListMaster
          label="Tyre Make"
          placeholder="e.g. MRF, CEAT…"
          fieldKey="make_name"
          queryKey="tyre-makes"
          getAll={mainmastersService.getTyreMakes}
          add={mainmastersService.addTyreMake}
          edit={mainmastersService.editTyreMake}
          remove={mainmastersService.deleteTyreMake}
        />
      )}
    </motion.div>
  )
}
