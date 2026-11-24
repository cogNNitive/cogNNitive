# domain-console-visuals

Objective: make the domain console explain the domaiNN to someone who does not know it — a Summary dashboard, a structural Map, an ER Schema and a Versions tab — on one chart library (ECharts) that custom views can use too.
Branch: `session/echarts-spike` · Delivery: ask-on-risk (forecast ~1700 authored lines; chain strategy pending) · Runner: `node --test test/<file>.test.mjs` (jsdom, `test/helpers/console-boot.mjs`); bundle `npm run build:console` + `npm run check:console-bundle`.

## Specs

- **S1** - The domain view must let a newcomer understand the domaiNN structure easily and visually. User: "En general lo más importante es que alguien que no entiende la estructura del dominio pueda entenderla de forma fácil y visual."
- **S2** - A dashboard tab. User: "un dashboard".
- **S3** - A graphical representation for the domain and its relationships. User: "una representación gráfica, pero más apropiada para visualizar el dominio y las relaciones entre modelos y componentes, modelos y conceptos, y elementos y campos". Clarified (L3): "En realidad me refería a modelos y conceptos". An ER-style diagram is acceptable: "Seguro que hay alguna visualización mejor, por ejemplo, un diagrama entidad-relación".
- **S4** - A Versions tab. User: "la versión de Cognnitive instalada / la versión de cada una de las plantillas que se utilizan en el dominio / cuáles se sincronizan con Cognnitive y cuáles no / las versiones que hay / si están al día, etc." Extended (L3): "en cada componente (como skills, MCP, blueprints, etcétera), se viera la que hay instalada y la que es la última en Cognitive para chequear que todo está correcto". Reuse the existing comparison (`classifyAgainstCatalog`, update status); the console is offline, so it states "checked on <export date>" — user: "Me parece perfecto".
- **S5** - A vocabulary legend in every tab (bluepriNNt = template, concept = card type, element = card, field = datum). User: "Totalmente de acuerdo".
- **S6** - One chart library, ECharts, vendored as UMD under `console/vendor/`, usable by custom views. User: "deben servir y ser versátiles porque deben poder utilizarse cuando un usuario genera vistas custom. Estas pueden tener gráficos de barras, timelines, etcétera". Bundle growth accepted: "Creo que es perfectamente tolerable".
- **S7** - Drop uPlot. User: "Creo que sería mejor descartarlo [...] es mejor utilizar solo de charts".
- **S8** - No dagre until ECharts proves insufficient. User: "A lo mejor podemos renunciar a dagre y ver hasta dónde llega ECharts". Cytoscape is plan B: "Me parece bien que sea un plan B".
- **S9** - Chart backgrounds are white. User: "el fondo de todos los gráficos es negro, pero debería ser blanco".
- **S10** - No debug JSON in the UI. User: "en el primer gráfico sale un JSON".
- **S11** - ER boxes readable, not cramped. User: "el diagrama de entidades-relaciones tiene unos bordes de caja un poco confusos y está apelotonado".

## Tasks

| ID | Specs | What | Route | Status | Evidence |
|---|---|---|---|---|---|
| T1 | S6 S7 S9 | Vendor ECharts 6.1.0, remove uPlot, `renderCharts` on ECharts (same signature), new `nnConsole.renderChart(host, option)` with a light theme for views | inline | done | RED 5/6 then 6/6 `test/console-charts.test.mjs`; console suites 810/810; nn-core console-thinning 8/8; `check:console-bundle` fresh; vendored sha256 OK (full `check:licenses` needs `npm ci --prefix skills/nn-sources`, not runnable in a worktree); testlab fixture regenerated. Risk item 5 (new vendored dependency) |
| T2 | S1 S2 S5 S10 | Summary tab: KPI row, one card per model (stacked concept bar), "what to look at" list, vocabulary legend | inline | pending | |
| T3 | S4 | Export: pinned bluepriNNt version/url, installation state, catalog status into the payload; Versions tab | inline | pending | |
| T4 | S3 S11 | Schema tab: ER boxes sized by field count, clear borders, spacing; node size by element count | inline | pending | |
| T5 | S1 S3 | Map tab: domaiNN > model > concept treemap/sunburst with drill-down; 1-hop element neighbourhood (never the full element graph: 2000 nodes froze 18 s in the PoC) | inline | pending | |

## Log

- **L1** (2026-11-24) User's original request: "En la consola de dominio me gustaría enriquecer la vista de dominio, que actualmente solamente presenta unos círculos con los conceptos incluidos en el dominio, y que ayudara a entender cómo funciona el dominio, seguramente añadiéndole pestañas aparte: - un dashboard - una representación gráfica, pero más apropiada para visualizar el dominio y las relaciones entre modelos y componentes, modelos y conceptos, y elementos y campos. Dale una buena pensada y dime cómo esta vista podría ayudar a una persona a entender cuál es la estructura del dominio. También me gustaría que presentara una pestaña con información acerca de: - la versión de Cognnitive instalada - la versión de cada una de las plantillas que se utilizan en el dominio - cuáles se sincronizan con Cognnitive y cuáles no - las versiones que hay - si están al día, etc. En general lo más importante es que alguien que no entiende la estructura del dominio pueda entenderla de forma fácil y visual."
- **L2** Library decision: rule C allows a new library with maintainer approval. Candidates compared (uPlot, Chart.js, ECharts, Cytoscape, Mermaid, D3); ECharts chosen for breadth + declarative JSON options for custom views.
- **L3** User feedback on the proposal, quoted in S3, S4, S6-S8.
- **L4** PoC (2026-11-24): ECharts 6.1.0 inlined in a real exported testlab domain console, headless Chrome over CDP on file://: 7 chart types rendered, 0 CSP violations under hashed `script-src` (no unsafe-eval; the only `new Function` is a dead geoJSON fallback), console tabs still mount, `check:console-bundle` green. Force graph 2000 nodes/3000 edges blocked ~18 s. Bundle 940 KB -> 2.09 MB. Pre-existing: no shipped sample domain exports with `--domain` (UNFROZEN_MODEL / invalid parent_spec); only `test/fixtures/testlab` does.
- **L5** User on the PoC: "Estupendo, es un buen punto de partida pero habrá que hacer muchas mejoras en muchos de los gráficos. Entre ellas te nombro algunas que son novias en el primer gráfico sale un JSON el fondo de todos los gráficos es negro, pero debería ser blanco y el diagrama de entidades-relaciones tiene unos bordes de caja un poco confusos y está apelotonado dicho esto sigamos porque creo que vamos por el buen camino". Note: the black background came from the PoC passing the `dark` theme when the OS prefers dark; the JSON was the PoC's debug report.
- **L6** T1: `renderChart` defaults to the SVG renderer (crisp text, works in jsdom); callers pass `{ renderer: 'canvas' }` for large graphs. Always the light theme, whatever the OS colour scheme (S9). uPlot's `renderCharts` signature is kept; the `uPlot` global is gone.
- **Next**: independent verifier on T1 (Risk item 5), then T2.
