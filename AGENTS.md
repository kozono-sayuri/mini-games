# Codex project instructions

## README is part of every change

- Treat `README.md` as a required project artifact, not optional documentation.
- Whenever adding or changing a game, character, scene, feature, dependency, route, deployment behavior, visual system, accessibility behavior, or important engineering decision, update `README.md` in the same change.
- Review all README sections for consistency, especially the character/game table, current feature checklist, design rules, important notes, and update log.
- Add a concise dated entry under `更新紀錄` for material user-visible or architectural changes.
- Do not finish or publish a material change while README content is stale.

## Product consistency

- Preserve the Étoile Arcade original-anime fantasy universe.
- Each game must have a named adult protagonist, chapter title, role, quote, distinctive palette, and matching full-page environment.
- The game card, route page, character art, background, typography, and UI accents must tell the same visual story.
- Keep the arcade lightweight, single-player, GitHub Pages-compatible, responsive, and accessible.
- Respect `prefers-reduced-motion` for all decorative animation.
- Do not imitate an existing copyrighted character, franchise, or living artist's signature style.

## Verification before publishing

- Run JavaScript syntax checks for changed JavaScript files.
- Run `git diff --check`.
- Verify the GitHub Pages workflow when publishing.
- Confirm the public site and any newly added asset return successfully.
