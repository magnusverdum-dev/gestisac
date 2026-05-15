export type DashboardMetric = {
  label: string;
  value: string;
  status?: 'urgent' | 'warning' | 'success' | 'new';
};

export type DashboardModuleTone = 'blue' | 'green' | 'purple' | 'gold';

export type DashboardModule = {
  id: string;
  title: string;
  subtitle: string;
  tone: DashboardModuleTone;
  cta: string;
  metrics: DashboardMetric[];
};
