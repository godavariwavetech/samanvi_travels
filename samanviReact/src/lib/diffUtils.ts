export interface Change {
  side: 'header' | 'DR' | 'CR'
  field: string
  old: any
  nw: any
  idx?: number
  ledger?: string
}

export function calculateTripDiff(oldRecord: any, newRecord: any): Change[] {
  const changes: Change[] = []

  const fieldsToCompare = [
    { key: 'trip_date', label: 'Trip Date' },
    { key: 'bus_no', label: 'Bus Number' },
    { key: 'service_no', label: 'Service Number' },
    { key: 'trip_for', label: 'Trip For' },
    { key: 'driver1_name', label: 'Driver 1' },
    { key: 'driver2_name', label: 'Driver 2' },
    { key: 'helper_name', label: 'Helper' },
    { key: 'conductor_name', label: 'Conductor' },
    { key: 'paid_to_name', label: 'Paid To' },
    { key: 'amount', label: 'Amount' },
    { key: 'total_amount', label: 'Total Amount' },
    { key: 'tot_salary', label: 'Total Salary' },
    { key: 'tot_beta', label: 'Total Beta' },
    { key: 'remarks', label: 'Remarks' },
    { key: 'driveronebeta', label: 'D1 Beta Type' },
    { key: 'drivertwobeta', label: 'D2 Beta Type' },
    { key: 'helperbeta', label: 'Helper Beta Type' },
  ]

  fieldsToCompare.forEach(({ key, label }) => {
    const oldVal = oldRecord[key]
    const newVal = newRecord[key]

    if (String(oldVal || '') !== String(newVal || '')) {
      changes.push({
        side: 'header',
        field: label,
        old: oldVal,
        nw: newVal,
      })
    }
  })

  return changes
}
