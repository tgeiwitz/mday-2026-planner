import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Zones from "./pages/Zones";
import Drivers from "./pages/Drivers";
import Timeblocks from "./pages/Timeblocks";
import Routes from "./pages/Routes";
import Scenarios from "./pages/Scenarios";
import Settings from "./pages/Settings";
import Snapshots from "./pages/Snapshots";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/zones" component={Zones} />
      <Route path="/drivers" component={Drivers} />
      <Route path="/timeblocks" component={Timeblocks} />
      <Route path="/routes" component={Routes} />
      <Route path="/scenarios" component={Scenarios} />
      <Route path="/settings" component={Settings} />
      <Route path="/snapshots" component={Snapshots} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <DashboardLayout>
            <Router />
          </DashboardLayout>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
