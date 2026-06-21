import { useMemo, useState } from "react";
import Header from "./components/layout/Header.jsx";
import AboutPage from "./pages/AboutPage.jsx";
import DemoLabPage from "./pages/DemoLabPage.jsx";
import ExecutiveViewPage from "./pages/ExecutiveViewPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import StartHerePage from "./pages/StartHerePage.jsx";
import StudioPage from "./pages/StudioPage.jsx";
import UseCasesPage from "./pages/UseCasesPage.jsx";
import { SCENARIOS } from "./data/scenarioLibrary.js";
import { runSimulation } from "./engine/simulationEngine.js";

const NAV_ITEMS = [
  { id: "home", label: "Home" },
  { id: "start", label: "Start Here" },
  { id: "demo", label: "Demo Lab" },
  { id: "studio", label: "Studio" },
  { id: "executive", label: "Executive View" },
  { id: "use-cases", label: "Use Cases" },
  { id: "about", label: "About / Project Notes" }
];

export default function App() {
  const [activePage, setActivePage] = useState("home");
  const [activeScenario, setActiveScenario] = useState(SCENARIOS[0]);
  const [lastResults, setLastResults] = useState(() => runSimulation(SCENARIOS[0]));

  const appContext = useMemo(
    () => ({
      activeScenario,
      setActiveScenario,
      lastResults,
      setLastResults,
      openStudioWithScenario: (scenario) => {
        setActiveScenario(scenario);
        setLastResults(runSimulation(scenario));
        setActivePage("studio");
      },
      runScenario: (scenario = activeScenario, options) => {
        const results = runSimulation(scenario, options);
        setActiveScenario(scenario);
        setLastResults(results);
        return results;
      }
    }),
    [activeScenario, lastResults]
  );

  const page = {
    home: <HomePage onNavigate={setActivePage} />,
    start: <StartHerePage onNavigate={setActivePage} />,
    demo: <DemoLabPage {...appContext} />,
    studio: <StudioPage {...appContext} />,
    executive: <ExecutiveViewPage {...appContext} />,
    "use-cases": <UseCasesPage onNavigate={setActivePage} />,
    about: <AboutPage />
  }[activePage];

  return (
    <div className="app-shell">
      <Header items={NAV_ITEMS} activePage={activePage} onNavigate={setActivePage} />
      <main className="page-frame">{page}</main>
    </div>
  );
}
