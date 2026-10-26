import ReferenceAuditModal from '@/components/shared/ReferenceAuditModal'

export default function TripAuditModal({ cNumber, onClose }: { cNumber: string; onClose: () => void }) {
  return <ReferenceAuditModal reference={cNumber} onClose={onClose} />
}
