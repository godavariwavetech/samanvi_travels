type TripAuthorizationState = { admin_status?: unknown; status?: unknown; auth_required?: unknown; authorized_at?: unknown }

// Trip flow: created -> authorized (Trip Approvals) -> expense filed (Trip
// Expenses) -> approved. A trip waits for authorization from the moment it is
// created, filed or not.
export const needsAuthorization = (trip: TripAuthorizationState) =>
  Number(trip.admin_status) === 0 &&
  Number(trip.auth_required) === 1 && !trip.authorized_at

// A created trip that still has to be authorized cannot have its expense filed
// yet, so Trip Expenses does not list it.
export const awaitingAuthorizationBeforeExpense = (trip: TripAuthorizationState) =>
  Number(trip.status) !== 1 && needsAuthorization(trip)

export const awaitingApproval = (trip: TripAuthorizationState) =>
  Number(trip.admin_status) === 0 && Number(trip.status) === 1 &&
  (Number(trip.auth_required) !== 1 || !!trip.authorized_at)
