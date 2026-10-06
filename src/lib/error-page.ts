// Pagina di emergenza: compare solo se il sito non riesce a disegnare nulla.
export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <title>La pagina non si è caricata</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <style>
      body { font: 17px/1.5 Verdana, system-ui, sans-serif; background: #f4f6f3; color: #1b2559; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 30rem; width: 100%; }
      h1 { font-size: 1.5rem; margin: 0 0 0.5rem; }
      p { margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; }
      button { padding: 0.6rem 1.1rem; font: inherit; font-weight: 700; cursor: pointer; background: #1b2559; color: #fff; border: 0; border-radius: 4px; }
      a { color: #1b2559; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>La pagina non si è caricata</h1>
      <p>Il problema è nostro, non tuo. Di solito basta riprovare tra qualche secondo.</p>
      <div class="actions">
        <button onclick="location.reload()">Riprova</button>
        <a href="/">Torna alla pagina iniziale</a>
      </div>
    </div>
  </body>
</html>`;
}
