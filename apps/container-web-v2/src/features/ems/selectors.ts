import type { KpiCardData, StringStateCard } from "@gd-monorepo/ui-v2";
import type { EmsDashboardMock } from "./mock/ems-dashboard.mock";

export const kpiItems = (mock: EmsDashboardMock): KpiCardData[] => mock.kpis;

export const stringStates = (mock: EmsDashboardMock): StringStateCard[] => mock.states;

export const dashboardPills = (mock: EmsDashboardMock) => mock.pills;

export const doorLabel = (mock: EmsDashboardMock): string => mock.title;
