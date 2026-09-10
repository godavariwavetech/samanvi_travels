import { createBrowserRouter, Navigate } from 'react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import LoginPage from '@/pages/auth/LoginPage'

// Dashboard
import DashboardPage from '@/pages/dashboard/DashboardPage'
import AnalysisPage from '@/pages/dashboard/AnalysisPage'

// Help Desk
import HelpDeskPage from '@/pages/helpdesk/HelpDeskPage'

// Users
import UserManagementPage from '@/pages/users/UserManagementPage'
import RolesPage from '@/pages/users/RolesPage'

// Validations
import VehicleValidationsPage from '@/pages/validations/VehicleValidationsPage'

// Masters
import BusNoPage from '@/pages/masters/BusNoPage'
import ServiceOutBusesPage from '@/pages/masters/ServiceOutBusesPage'
import ServiceForPage from '@/pages/masters/ServiceForPage'
import DesignationPage from '@/pages/masters/DesignationPage'
import ServiceNoPage from '@/pages/masters/ServiceNoPage'
import StaffPage from '@/pages/masters/StaffPage'
import SpareTankPage from '@/pages/masters/SpareTankPage'

// Trips
import TripCreationPage from '@/pages/trips/TripCreationPage'
import AdminApprovalsPage from '@/pages/trips/AdminApprovalsPage'
import TripExpensesPage from '@/pages/trips/TripExpensesPage'
import TripReportsPage from '@/pages/trips/TripReportsPage'
import DeletedTripsPage from '@/pages/trips/DeletedTripsPage'
import TripLogsPage from '@/pages/trips/TripLogsPage'

// Booking
import BookingDataPage from '@/pages/booking/BookingDataPage'
import CollectionAgentPage from '@/pages/booking/CollectionAgentPage'
import AccountantPage from '@/pages/booking/AccountantPage'
import BookingExpensesPage from '@/pages/booking/BookingExpensesPage'
import BookingHistoryPage from '@/pages/booking/BookingHistoryPage'
import AllExpensesPage from '@/pages/booking/AllExpensesPage'

// Fuel
import FuelEntryPage from '@/pages/fuel/FuelEntryPage'
import FuelTargetPage from '@/pages/fuel/FuelTargetPage'
import FuelReportsPage from '@/pages/fuel/FuelReportsPage'
import DayWisePage from '@/pages/fuel/DayWisePage'
import BusWisePage from '@/pages/fuel/BusWisePage'
import DriverWisePage from '@/pages/fuel/DriverWisePage'
import FuelStationWisePage from '@/pages/fuel/FuelStationWisePage'
import TargetReportPage from '@/pages/fuel/TargetReportPage'
import TopPerformersPage from '@/pages/fuel/TopPerformersPage'

// Laundry
import AddVendorPage from '@/pages/laundry/AddVendorPage'
import LaundryBillPage from '@/pages/laundry/LaundryBillPage'
import LaundryStatementPage from '@/pages/laundry/LaundryStatementPage'
import LaundryApprovedPage from '@/pages/laundry/LaundryApprovedPage'

// Accounting
import VoucherEntryPage from '@/pages/accounting/VoucherEntryPage'
import VoucherApprovalsPage from '@/pages/accounting/VoucherApprovalsPage'
import ProfitAndLossPage from '@/pages/accounting/ProfitAndLossPage'
import BalanceSheetPage from '@/pages/accounting/BalanceSheetPage'
import ApprovedVoucherPage from '@/pages/accounting/ApprovedVoucherPage'
import DayBookPage from '@/pages/accounting/DayBookPage'
import TrialBalancePage from '@/pages/accounting/TrialBalancePage'
import LedgerWisePage from '@/pages/accounting/LedgerWisePage'
import GroupWisePage from '@/pages/accounting/GroupWisePage'
import PayablesViewPage from '@/pages/accounting/PayablesViewPage'

// Payroll
import SalaryPaymentPage from '@/pages/payroll/SalaryPaymentPage'
import SalaryStatementPage from '@/pages/payroll/SalaryStatementPage'
import SalaryGenerationPage from '@/pages/payroll/SalaryGenerationPage'

// Garage
import RepairEntryPage from '@/pages/garage/RepairEntryPage'
import RepairTrackingPage from '@/pages/garage/RepairTrackingPage'
import GarageReportsPage from '@/pages/garage/GarageReportsPage'
import ServiceRemindersPage from '@/pages/garage/ServiceRemindersPage'
import TyreInventoryPage from '@/pages/garage/TyreInventoryPage'
import TyreSalePage from '@/pages/garage/TyreSalePage'
import TyrePositionPage from '@/pages/garage/TyrePositionPage'
import TyreRetreadPage from '@/pages/garage/TyreRetreadPage'
import TyreRepairPage from '@/pages/garage/TyreRepairPage'
import TyreMovementPage from '@/pages/garage/TyreMovementPage'
import TyreReportsPage from '@/pages/garage/TyreReportsPage'
import TyreStockAvailabilityPage from '@/pages/garage/TyreStockAvailabilityPage'
import BatteryManagementPage from '@/pages/garage/BatteryManagementPage'
import ScheduledJobsPage from '@/pages/garage/ScheduledJobsPage'
import RepeatJobsPage from '@/pages/garage/RepeatJobsPage'

// Main Masters
import VoucherTypePage from '@/pages/mainmasters/VoucherTypePage'
import GroupPage from '@/pages/mainmasters/GroupPage'
import StaticEntryPage from '@/pages/mainmasters/StaticEntryPage'
import SubChildTwoPage from '@/pages/mainmasters/SubChildTwoPage'
import LaundryProductPage from '@/pages/mainmasters/LaundryProductPage'
import GarageMastersPage from '@/pages/mainmasters/GarageMastersPage'
import TyreMastersPage from '@/pages/mainmasters/TyreMastersPage'
import VehicleTypePage from '@/pages/mainmasters/VehicleTypePage'
import VehicleCompanyPage from '@/pages/mainmasters/VehicleCompanyPage'
import SeatingCapacityPage from '@/pages/mainmasters/SeatingCapacityPage'
import ChassisModelPage from '@/pages/mainmasters/ChassisModelPage'
import BodyBuilderPage from '@/pages/mainmasters/BodyBuilderPage'
import LuxuryTypePage from '@/pages/mainmasters/LuxuryTypePage'
import MfgYearPage from '@/pages/mainmasters/MfgYearPage'
import BatteryBrandPage from '@/pages/mainmasters/BatteryBrandPage'
import BatteryCapacityPage from '@/pages/mainmasters/BatteryCapacityPage'
import CityListPage from '@/pages/mainmasters/CityListPage'
import BoardingPointPage from '@/pages/mainmasters/BoardingPointPage'
import BusOperatorPage from '@/pages/mainmasters/BusOperatorPage'
import LineCodePage from '@/pages/mainmasters/LineCodePage'
import RouteIdPage from '@/pages/mainmasters/RouteIdPage'

// Reports
import ReportsPage from '@/pages/reports/ReportsPage'

export const router = createBrowserRouter([
  { path: '/auth/login', element: <LoginPage /> },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },

      // Dashboard & Users
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'dashboard/analysis', element: <AnalysisPage /> },
      { path: 'helpdesk', element: <HelpDeskPage /> },
      { path: 'users', element: <UserManagementPage /> },
      { path: 'roles', element: <RolesPage /> },
      { path: 'validations', element: <VehicleValidationsPage /> },

      // Masters
      { path: 'masters/service-for', element: <ServiceForPage /> },
      { path: 'masters/bus-no', element: <BusNoPage /> },
      { path: 'masters/service-out', element: <ServiceOutBusesPage /> },
      { path: 'masters/service-no', element: <ServiceNoPage /> },
      { path: 'masters/staff', element: <StaffPage /> },
      { path: 'masters/spare-tank', element: <SpareTankPage /> },

      // Trips
      { path: 'trips/creation', element: <TripCreationPage /> },
      { path: 'trips/approvals', element: <AdminApprovalsPage /> },
      { path: 'trips/expenses', element: <TripExpensesPage /> },
      { path: 'trips/reports', element: <TripReportsPage /> },
      { path: 'trips/deleted', element: <DeletedTripsPage /> },
      { path: 'trips/logs', element: <TripLogsPage /> },

      // Booking
      { path: 'booking/data', element: <BookingDataPage /> },
      { path: 'booking/collection-agent', element: <CollectionAgentPage /> },
      { path: 'booking/accountant', element: <AccountantPage /> },
      { path: 'booking/expenses', element: <BookingExpensesPage /> },
      { path: 'booking/history', element: <BookingHistoryPage /> },
      { path: 'booking/all-expenses', element: <AllExpensesPage /> },

      // Fuel
      { path: 'fuel/entry', element: <FuelEntryPage /> },
      { path: 'fuel/target', element: <FuelTargetPage /> },
      { path: 'fuel/reports', element: <FuelReportsPage /> },
      { path: 'fuel/day-wise', element: <DayWisePage /> },
      { path: 'fuel/bus-wise', element: <BusWisePage /> },
      { path: 'fuel/driver-wise', element: <DriverWisePage /> },
      { path: 'fuel/station-wise', element: <FuelStationWisePage /> },
      { path: 'fuel/target-report', element: <TargetReportPage /> },
      { path: 'fuel/top-performers', element: <TopPerformersPage /> },

      // Laundry / Vendor
      { path: 'laundry/vendor', element: <AddVendorPage /> },
      { path: 'laundry/bill', element: <LaundryBillPage /> },
      { path: 'laundry/statement', element: <LaundryStatementPage /> },
      { path: 'laundry/approved', element: <LaundryApprovedPage /> },

      // Accounting
      { path: 'accounting/voucher', element: <VoucherEntryPage /> },
      { path: 'accounting/voucher-approvals', element: <VoucherApprovalsPage /> },
      { path: 'accounting/profit-loss', element: <ProfitAndLossPage /> },
      { path: 'accounting/balance-sheet', element: <BalanceSheetPage /> },
      // { path: 'accounting/approved', element: <ApprovedVoucherPage /> },
      { path: 'accounting/daybook', element: <DayBookPage /> },
      { path: 'accounting/trial-balance', element: <TrialBalancePage /> },
      { path: 'accounting/ledger-wise', element: <LedgerWisePage /> },
      { path: 'accounting/group-wise', element: <GroupWisePage /> },
      { path: 'accounting/payables-view', element: <PayablesViewPage /> },

      // Payroll
      { path: 'payroll/payment', element: <SalaryPaymentPage /> },
      { path: 'payroll/statement', element: <SalaryStatementPage /> },
      { path: 'payroll/generation', element: <SalaryGenerationPage /> },

      // Garage
      { path: 'garage/repair-entry', element: <RepairEntryPage /> },
      { path: 'garage/tracking', element: <RepairTrackingPage /> },
      { path: 'garage/reports', element: <GarageReportsPage /> },
      { path: 'garage/service-reminders', element: <ServiceRemindersPage /> },
      { path: 'garage/tyre-inventory', element: <TyreInventoryPage /> },
      { path: 'garage/tyre-sale', element: <TyreSalePage /> },
      { path: 'garage/tyre-position', element: <TyrePositionPage /> },
      { path: 'garage/tyre-retread', element: <TyreRetreadPage /> },
      { path: 'garage/tyre-repair', element: <TyreRepairPage /> },
      { path: 'garage/tyre-movement', element: <TyreMovementPage /> },
      { path: 'garage/tyre-reports', element: <TyreReportsPage /> },
      { path: 'garage/tyre-stock-availability', element: <TyreStockAvailabilityPage /> },
      { path: 'garage/battery-management', element: <BatteryManagementPage /> },
      { path: 'garage/scheduled-jobs', element: <ScheduledJobsPage /> },
      { path: 'garage/repeat-jobs',    element: <RepeatJobsPage /> },

      // Main Masters
      { path: 'mainmasters/voucher-type',   element: <VoucherTypePage /> },
      { path: 'mainmasters/static-entry',   element: <StaticEntryPage /> },
      { path: 'mainmasters/laundry-products', element: <LaundryProductPage /> },
      { path: 'mainmasters/garage-masters', element: <GarageMastersPage /> },
      { path: 'mainmasters/tyre-masters',   element: <TyreMastersPage /> },
      { path: 'mainmasters/vehicle-type',    element: <VehicleTypePage /> },
      { path: 'mainmasters/vehicle-company', element: <VehicleCompanyPage /> },
      { path: 'mainmasters/seating-capacity',element: <SeatingCapacityPage /> },
      { path: 'mainmasters/chassis-model',   element: <ChassisModelPage /> },
      { path: 'mainmasters/body-builder',    element: <BodyBuilderPage /> },
      { path: 'mainmasters/luxury-type',     element: <LuxuryTypePage /> },
      { path: 'mainmasters/mfg-year',        element: <MfgYearPage /> },
      { path: 'mainmasters/battery-brand',    element: <BatteryBrandPage /> },
      { path: 'mainmasters/battery-capacity', element: <BatteryCapacityPage /> },
      { path: 'mainmasters/city-list',        element: <CityListPage /> },
      { path: 'mainmasters/boarding-point',   element: <BoardingPointPage /> },
      { path: 'mainmasters/bus-operator',     element: <BusOperatorPage /> },
      { path: 'mainmasters/line-code',        element: <LineCodePage /> },
      { path: 'mainmasters/route-id',         element: <RouteIdPage /> },
      { path: 'mainmasters/designation',      element: <DesignationPage /> },
      // Group pages — each level gets its own path so NavLink active state works
      { path: 'mainmasters/groups',           element: <GroupPage /> },
      { path: 'mainmasters/main-group',       element: <GroupPage viewLevel={2} /> },
      { path: 'mainmasters/sub-group',        element: <GroupPage viewLevel={3} /> },
      { path: 'mainmasters/child-group',      element: <GroupPage viewLevel={4} /> },
      { path: 'mainmasters/sub-child-two',    element: <GroupPage viewLevel={5} /> },

      // Reports
      { path: 'reports', element: <ReportsPage /> },

      { path: '*', element: <Navigate to="/dashboard" replace /> },
    ],
  },
], {
  // '/' for the production build, '/staging/' for the subfolder one — set by
  // `base` in vite.config.ts. Without it every route path would be matched
  // against the full pathname including the /staging/ prefix and miss.
  basename: import.meta.env.BASE_URL,
})
