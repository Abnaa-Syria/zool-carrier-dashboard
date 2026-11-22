import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '../shell/AppShell';
import { LoginPage } from '../../features/auth/LoginPage';
import { RequireAuth, RequirePermission } from '../../features/auth/RequireAuth';
import { HomePage } from '../../features/home/HomePage';
import { TripsListPage } from '../../features/network/pages/TripsListPage';
import { TripDetailPage } from '../../features/network/pages/TripDetailPage';
import { RoutesListPage } from '../../features/network/pages/RoutesListPage';
import { VehiclesListPage } from '../../features/fleet/pages/VehiclesListPage';
import { VehicleFormPage } from '../../features/fleet/pages/VehicleFormPage';
import { FleetVehicleDetailsPage } from '../../features/fleet/pages/FleetVehicleDetailsPage';
import { DriversListPage } from '../../features/fleet/pages/DriversListPage';
import { BookingsListPage } from '../../features/bookings/BookingsListPage';
import { LiveTrackingPage } from '../../features/tracking/pages/LiveTrackingPage';
import { TripTrackingPage } from '../../features/tracking/pages/TripTrackingPage';
import { ReportsPage } from '../../features/reports/ReportsPage';
import { SettlementDetailPage, SettlementsPage } from '../../features/settlements/SettlementsPage';
import { BrokersPage } from '../../features/brokers/BrokersPage';
import { StaffPage } from '../../features/staff/StaffPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/home" replace /> },
      { path: 'home', element: <HomePage /> },
      // operations (read for everyone; write actions check carrier.schedule inside the pages)
      { path: 'trips', element: <TripsListPage /> },
      { path: 'trips/:id', element: <TripDetailPage /> },
      { path: 'routes', element: <RoutesListPage /> },
      { path: 'bookings', element: <BookingsListPage /> },
      { path: 'tracking', element: <LiveTrackingPage /> },
      { path: 'tracking/:tripId', element: <TripTrackingPage /> },
      // fleet (read for everyone; create/edit need carrier.fleet)
      { path: 'vehicles', element: <VehiclesListPage /> },
      { path: 'vehicles/new', element: <RequirePermission permission="carrier.fleet"><VehicleFormPage /></RequirePermission> },
      { path: 'vehicles/:id', element: <FleetVehicleDetailsPage /> },
      { path: 'vehicles/:id/edit', element: <RequirePermission permission="carrier.fleet"><VehicleFormPage /></RequirePermission> },
      { path: 'drivers', element: <DriversListPage /> },
      // finance
      { path: 'reports', element: <RequirePermission permission="carrier.finance"><ReportsPage /></RequirePermission> },
      { path: 'settlements', element: <RequirePermission permission="carrier.finance"><SettlementsPage /></RequirePermission> },
      { path: 'settlements/:id', element: <RequirePermission permission="carrier.finance"><SettlementDetailPage /></RequirePermission> },
      // company
      { path: 'brokers', element: <BrokersPage /> },
      { path: 'staff', element: <RequirePermission permission="carrier.staff"><StaffPage /></RequirePermission> },
      { path: '*', element: <Navigate to="/home" replace /> },
    ],
  },
]);
