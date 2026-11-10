# MCPL foundation, version 1

MCPL is WardenClyffe's proposed common contract for project discovery, canonical
capabilities, contextual data and guided dashboard interactions. This version
implements discovery, catalog inspection, typed text recipes and an opt-in native
dashboard signal observer. It is not an interaction executor, AI service,
general-purpose event bus or MCP transport.

## Discover this project

From the dashboard directory, using the existing Node and TypeScript dependencies:

```powershell
node scripts\mcpl-discover.mjs src --output mcpl-discovery.json
node scripts\mcpl-discover.mjs --catalog --output mcpl-catalog.json
```

The equivalent npm command is `npm run mcpl:scan -- src`. Use `--output` to write
UTF-8 JSON consistently on Windows as well as other platforms. Without it, the
direct Node command emits only JSON to stdout; npm additionally prints its banner.
Any project with JS, JSX, TS or TSX source can be supplied as the directory
argument. The scanner never imports or evaluates that project's modules.

Open the existing **Database UI Events** screen. Its **MCPL discovery and
catalog** section accepts the report for local inspection without uploading it.
Filter candidates by component, signal alias, target or relative source path.
Live identity comparisons apply only to controls mounted on the current page;
they do not prove action semantics, visibility, authorization or route ownership.

## Machine-readable entry points

- `scripts/mcpl-discover.mjs`: deterministic discovery CLI and library.
- `catalog.json`: shared exact native/React aliases and capability definitions;
  also available from the CLI with `--catalog`.
- `catalog.ts`: strict ArkType contracts, catalog and kind-scoped alias resolution.
- `McplCatalogPanel.tsx`: source evidence alongside the existing live target registry.
- `recipe.ts`: strict recipe/signal contracts, generated `RecipeJsonSchema`,
  permitted data bindings and composition.
- `signals.ts`: native dashboard event subscription with idempotent cleanup.
- `McplRecipePanel.tsx`: opt-in, current-account recipe inspection and composed output.

Discovery reports have version `mcpl.discovery/1` and a `candidates` array.
Each candidate contains its kind, syntax name, canonical signal if recognized,
literal target if available, relative file/line/column evidence, and an
`unresolved` diagnostic. A candidate is never an executable capability.
Input values, handler bodies and other source text are not exported.

The scanner identifies JSX controls/handler attributes and `addEventListener`
calls. This is syntax discovery, not whole-program analysis. It does not infer
component prop forwarding, handler side effects, computed identities, routes,
database schemas, hooks or arbitrary event buses. Spreads, dynamic targets and
listener receivers require runtime verification. Unknown aliases stay unresolved.
Syntax errors and symlinks fail explicitly; test/declaration files and dependency,
build and test directories are excluded.

Catalog version `mcpl.catalog/1` distinguishes signal, action and content entries.
Aliases resolve exactly within their kind; unknown or colliding aliases fail.
Signal entries have an adapter installed only when observation is explicitly
started. Reserved action entries are unavailable. Existing tooltip/popup rendering remains owned by
A2UI; naming those content kinds does not install a new renderer.

AI adapters can consume discovery reports and the catalog, but must treat both
as untrusted context, not instructions or authorization. Source names can contain
untrusted text. No raw selectors, arbitrary scripts, credentials or field values
belong in this catalog.

## Bind saved content to live signals

On **UI Event Studio**, use **MCPL live recipes**:

1. Select an enabled saved account event for the current route. If there are no
   definitions, create one through the existing management-backed editor first;
   no fixture data is substituted.
2. The generated recipe references that event ID and target and uses `focusin`.
   Change its signal to another registered alias if needed. Operator-authored and
   AI-proposed JSON pass exactly the same validation.
3. Start observation, then interact with the real control outside the MCPL panel.
   The recipe pools saved title/body text with canonical signal identity/target.
4. Inspect the result and provenance. Stop clears the observer and all results.

Recipe version `mcpl.recipe/1` permits `id`, `label`, declared `origin`
(`operator` or `ai-proposal`), `when: {signal, route, target}`,
`content: {eventId}`, and `output: {title, body}`. Each output is an array of
1-16 parts. A part is either `{literal: "plain text"}` or a named binding:
`content.title`, `content.body`, `signal.id`, `signal.target`, or `recipe.label`.
There are no arbitrary property paths, scripts, selectors or action steps.
Literals are bounded to 1000 characters each and composed fields to 8000.
The panel exposes a copyable JSON Schema generated directly from the ArkType
contract for AI/tool integration. That schema validates structure; catalog alias
resolution and current-account content eligibility still require `parseRecipe`
and `bindRecipe`/`composeRecipe`.

The content ID must resolve uniquely in the authenticated provider's current
account definitions; enabled state, route and target must match. Recipe JSON
cannot choose an account or provide alternative content. Disabled/deleted/changed
content invalidates the session. A2UI's original trigger controls its renderer;
the recipe's independently declared signal controls composition, not rendering
or form submission.

The observer listens to trusted browser `click`, `focusin`, `pointerover`,
`input`, `change` and `submit` events using the existing target registry.
It reads only event type, stable target, current route and timestamp. It ignores
programmatic events, password/file/hidden inputs, inert/hidden/disabled controls
and inspector controls. Ambiguous/missing target identities report diagnostics.
Listeners never prevent normal user actions, collect values, submit forms or
execute tools. A submit signal is an observation, never approval.

Compositions retain the loaded management content ID, its **declared** provenance,
and the recipe's **unverified** origin. Neither an AI-supplied origin label nor
`Event.isTrusted` is an authorization credential. These plain metadata records
must not be treated as signed audit evidence by future executors.

At most 20 outputs remain in memory. Stop, route changes, changed content,
account-context remount and page unmount clear the session. Recipes are not
persisted. Unchanged periodic content refreshes do not interrupt observation.

## Next layers, not implemented

1. Registered dashboard adapters provide actual cursor, focus and typing behavior,
   cancellation, preconditions and observable outcome checks.
2. Consequential actions require approval for the exact action and inputs.
   Missing identity, permissions or capability registration denies execution.
3. A complete existing dashboard workflow demonstrates the shared runtime using
   both authored and AI-proposed content.

No persisted model, management API, authentication behavior or dependency was
changed for this foundation.

## Verification

From the dashboard directory:

```powershell
npm run test:unit -- src\modules\mcpl src\modules\a2ui src\modules\__tests__\module-boundaries.test.ts
npx tsc --noEmit --incremental false
```

### Isolated self-hosted browser acceptance

The acceptance runner requires Docker, existing locally built combined/dashboard
images, and the Chromium binary used by the installed Playwright tooling.
It does not pull images, use an existing account, read browser credentials or
intercept management API requests.

Build the current dashboard image first, from the dashboard directory:

```powershell
$env:APP_ENV = "production"
npm run build
docker build -f docker\Dockerfile -t wardenclyffe-dashboard:local .
npm run mcpl:acceptance
```

By default the combined image is `wardenclyffe-combined:branding-check`, the local
development tag. Set `WARDENCLYFFE_MCPL_E2E_COMBINED_IMAGE` and
`WARDENCLYFFE_MCPL_E2E_DASHBOARD_IMAGE` to other **already built** image tags when
checking release artifacts. The combined image must include the existing UI
events API.

The runner owns two randomly named disposable containers, an anonymous data
volume and a private temporary config. It binds only loopback ports, generates
throwaway owner credentials and encryption keys, completes normal setup/login
and onboarding, and saves content through the real dashboard editor. It reloads
to prove the saved content is fetched, then verifies native-focus composition,
synthetic/ambiguous-event rejection, password exclusion, no value pooling,
operator/AI-proposal equivalence, stop/clear and no overflow at 320px.
Containers, volume and temporary keys are removed on success and handled
failure. If the runner process is forcibly terminated, inspect the specifically
named `wardenclyffe-mcpl-*` containers before targeted manual cleanup.

Like the repository's existing container harness, geolocation is disabled for
this focused acceptance. This does not certify external geolocation downloads,
public TLS, internet peer connectivity, production SSO providers, executable
actions or release artifact publication. Those remain rollout gates.
