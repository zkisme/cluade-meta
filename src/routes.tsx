import { RootRoute, Route, Router } from '@tanstack/react-router';
import App from './App';
import { Overview } from './components/Overview';
import { ProjectManagement } from './components/ProjectManagement';
import { GenericConfigManager } from './components/GenericConfigManager';
import { ClaudeCodeManager } from './components/ClaudeCodeManager';
import { configTypes } from './config';

const rootRoute = new RootRoute({ component: App });

const overviewRoute = new Route({ getParentRoute: () => rootRoute, path: '/', component: Overview });
const projectManagementRoute = new Route({ getParentRoute: () => rootRoute, path: '/project-management', component: ProjectManagement });

const configRoutes = configTypes.map(configType => {
  if (configType.id === 'claude-code') {
    return new Route({
      getParentRoute: () => rootRoute,
      path: `/config/claude-code`,
      component: ClaudeCodeManager
    });
  }
  return new Route({
    getParentRoute: () => rootRoute,
    path: `/config/${configType.id}`,
    component: () => <GenericConfigManager configType={configType} />
  });
});

const routeTree = rootRoute.addChildren([overviewRoute, projectManagementRoute, ...configRoutes]);

export const router = new Router({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
