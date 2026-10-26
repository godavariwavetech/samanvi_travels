type TripAuthorizationState = { admin_status?: unknown; status?: unknown; auth_required?: unknown; authorized_at?: unknown }

export const needsAuthorization = (trip: TripAuthorizationState) =>
  Number(trip.admin_status) === 0 && Number(trip.status) === 1 &&
  Number(trip.auth_required) === 1 && !trip.authorized_at

export const awaitingApproval = (trip: TripAuthorizationState) =>
  Number(trip.admin_status) === 0 && Number(trip.status) === 1 &&
  (Number(trip.auth_required) !== 1 || !!trip.authorized_at)
