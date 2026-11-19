# statusbar

A Claude Code mod: a quiet two-line bar right above the prompt, in the style of TUFFUI's inline context meter.

- **First line**: the project (the repository's folder) and its current git branch, `isiit / backlog`.
- **Second line**: three quotas, each a thin strip of 20 ticks, its percentage in tabular figures and, for the usage windows, when it resets: `ctx ▮▮▯▯… 9%`, `5h ▮▯▯… 6% ↻ 4h31`, `sem ▮▮▮▮▮▮▮▮▮▮▯… 49% ↻ 21h41`. Each quota has its own colour (context violet, the five-hour window cyan, the week mint), its empty ticks a faint shade of it; past 80 % the strip and its percentage turn amber, past 95 % red.

The figures come from the engine itself (`$.session.usage()` and the `session.measure` event: the context window and the `five_hour` and `seven_day` windows); the branch from `git`, read at session start and after each turn. The countdowns move every minute. Each quota keeps its own width; when the band is narrow they wrap to another line rather than overlap. The bar puts itself last in the band, right above the prompt, below other mods' rows.

On the desktop and mobile apps the strips are drawn as small vector images; the terminal gets them in characters.

## Install

In the desktop app: **+** next to the prompt box, **Plugins**, add the marketplace `ayatooo/claude-desktop`, then add **statusbar**. Or: `claude plugin install statusbar --marketplace ayatooo/claude-desktop`.

If another mod already draws a status bar, turn that one off.

## Files

- `hooks/register.tsx`: reads the figures and the branch, draws the bar, keeps it last in the band.
- `hooks/ticks.ts`: the tick strip (SVG and text), the warm and hot thresholds, the countdown format.
- `types/index.d.ts`: the values kept in the session's state.
- `tests/statusbar.test.tsx`: `claude plugin test statusbar`.
