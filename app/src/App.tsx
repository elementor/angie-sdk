import { useMemo, useState } from 'react';
import {
  EMBED_SNIPPET,
  FEATURE_MATRIX,
  FLOW_STEPS,
  LINKS,
  LOCAL_DEMOS,
  PACKAGE_VERSION,
  QUICK_START_SNIPPET,
  RESOURCE_SCHEMES,
  type FeatureStatus,
} from './data/content';

type Section = 'overview' | 'features' | 'start' | 'demos';

const REPO_RAW = LINKS.github.replace('github.com', 'raw.githubusercontent.com') + '/master';

function statusLabel(status: FeatureStatus): string {
  if (status === 'supported') return 'Supported';
  if (status === 'partial') return 'Partial';
  return 'Not yet';
}

function CodeBlock({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="code-block">
      <div className="code-block__head">
        <span>{label}</span>
        <button type="button" className="ghost-btn" onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function App() {
  const [section, setSection] = useState<Section>('overview');
  const supportedCount = useMemo(
    () => FEATURE_MATRIX.filter((f) => f.status === 'supported').length,
    [],
  );

  const nav: { id: Section; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'features', label: 'MCP features' },
    { id: 'start', label: 'Quick start' },
    { id: 'demos', label: 'Local demos' },
  ];

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand__mark" aria-hidden />
          <div>
            <p className="brand__eyebrow">@elementor/angie-sdk</p>
            <h1>Angie SDK Explorer</h1>
          </div>
        </div>
        <p className="topbar__meta">v{PACKAGE_VERSION} reference · sample data from repo docs</p>
      </header>

      <div className="layout">
        <nav className="nav" aria-label="Sections">
          {nav.map((item) => (
            <button
              key={item.id}
              type="button"
              className={section === item.id ? 'nav__item nav__item--active' : 'nav__item'}
              onClick={() => setSection(item.id)}
            >
              {item.label}
            </button>
          ))}
          <div className="nav__links">
            <a href={LINKS.github} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a href={LINKS.npm} target="_blank" rel="noreferrer">
              npm
            </a>
          </div>
        </nav>

        <main className="main">
          {section === 'overview' && (
            <>
              <section className="hero">
                <p className="hero__lead">
                  Extend Angie with browser MCP servers, register tools on the current screen, and
                  embed the assistant with <code>loadSidebarV2</code>.
                </p>
                <div className="stat-row">
                  <div className="stat">
                    <strong>{supportedCount}</strong>
                    <span>MCP features supported</span>
                  </div>
                  <div className="stat">
                    <strong>{LOCAL_DEMOS.length}</strong>
                    <span>interactive demos in repo</span>
                  </div>
                  <div className="stat">
                    <strong>Browser</strong>
                    <span>in-process MCP host</span>
                  </div>
                </div>
              </section>

              <section className="panel">
                <h2>How it fits together</h2>
                <ol className="flow">
                  {FLOW_STEPS.map((step, index) => (
                    <li key={step.title}>
                      <span className="flow__index">{index + 1}</span>
                      <div>
                        <strong>{step.title}</strong>
                        <p>{step.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>

              <section className="panel">
                <h2>Angie resource URI schemes</h2>
                <p className="muted">
                  Declare dependencies with <code>angie/requiredResources</code> so Angie fetches
                  context before running a tool.
                </p>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Scheme</th>
                        <th>Purpose</th>
                        <th>Example</th>
                      </tr>
                    </thead>
                    <tbody>
                      {RESOURCE_SCHEMES.map((row) => (
                        <tr key={row.scheme}>
                          <td>
                            <code>{row.scheme}</code>
                          </td>
                          <td>{row.purpose}</td>
                          <td>
                            <code>{row.example}</code>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          {section === 'features' && (
            <>
              <section className="panel">
                <h2>MCP feature matrix</h2>
                <p className="muted">
                  From{' '}
                  <a href={LINKS.featuresDoc} target="_blank" rel="noreferrer">
                    angie-sdk-supported-features.md
                  </a>
                  . Standard MCP behavior follows the TypeScript SDK; rows below are Angie-specific
                  notes.
                </p>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Feature</th>
                        <th>Status</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {FEATURE_MATRIX.map((row) => (
                        <tr key={row.name}>
                          <td>{row.name}</td>
                          <td>
                            <span className={`pill pill--${row.status}`}>
                              {statusLabel(row.status)}
                            </span>
                          </td>
                          <td>{row.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="panel panel--accent">
                <h2>Angie-only tool annotations</h2>
                <ul className="bullet-list">
                  <li>
                    <code>angie/requiredResources</code> — prefetch MCP resources before tool
                    execution.
                  </li>
                  <li>
                    <code>confirmationMessage</code> — pairs with MCP <code>destructiveHint</code>{' '}
                    for consent dialogs.
                  </li>
                  <li>
                    Multi-server URIs are prefixed as <code>{'{serverName}__{uri}'}</code> when
                    aggregated.
                  </li>
                </ul>
              </section>
            </>
          )}

          {section === 'start' && (
            <>
              <section className="panel">
                <h2>Install</h2>
                <CodeBlock
                  label="npm"
                  code={`npm install @elementor/angie-sdk @modelcontextprotocol/sdk zod`}
                />
              </section>

              <section className="panel">
                <h2>Register a browser MCP server</h2>
                <CodeBlock label="TypeScript" code={QUICK_START_SNIPPET} />
              </section>

              <section className="panel">
                <h2>Embed Angie on any page</h2>
                <p className="muted">
                  See{' '}
                  <a href={LINKS.loadSidebarDocs} target="_blank" rel="noreferrer">
                    loadSidebarV2 README
                  </a>{' '}
                  for layouts, widgetConfig, and host APIs.
                </p>
                <CodeBlock label="loadSidebarV2" code={EMBED_SNIPPET} />
              </section>

              <section className="panel">
                <h2>Run demos locally</h2>
                <CodeBlock
                  label="Terminal"
                  code={`git clone ${LINKS.github}.git\ncd angie-sdk\nnpm ci\nnpm run demo\n# open http://localhost:8080/demo/`}
                />
              </section>
            </>
          )}

          {section === 'demos' && (
            <>
              <section className="panel">
                <h2>Repository demos</h2>
                <p className="muted">
                  These pages need a local static server with the built SDK (see Quick start). Raw
                  GitHub HTML will not load MCP modules — clone the repo and run{' '}
                  <code>npm run demo</code>.
                </p>
                <ul className="demo-grid">
                  {LOCAL_DEMOS.map((demo) => (
                    <li key={demo.path}>
                      <a
                        className={demo.featured ? 'demo-card demo-card--featured' : 'demo-card'}
                        href={`${REPO_RAW}/${demo.path}index.html`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <strong>{demo.title}</strong>
                        <span>{demo.description}</span>
                        <code className="demo-card__path">{demo.path}</code>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}

          <footer className="footer">
            <span>
              Built for the{' '}
              <a href={LINKS.github} target="_blank" rel="noreferrer">
                angie-sdk
              </a>{' '}
              repository.
            </span>
            <a href={LINKS.mcpSpec} target="_blank" rel="noreferrer">
              MCP specification
            </a>
          </footer>
        </main>
      </div>
    </div>
  );
}
