# A0b · claude/demo-polish: one word «Проблема», short form for workers

**Base:** `claude/demo-ready` (A0). A0 was not merged into main when this was done, so this branch stacks on it. Once A0 is merged, this PR shows only its own commits. If needed, run `git rebase origin/main`.

## What was done

1. **One word: «Проблема».**
   - The tab stays «Проблемы».
   - The button and the form heading are «Сообщить о проблеме». The overview action, formerly «Отметить проблему», now says the same.
   - «Замечание» is gone from the interface and from `ru.json`. `grep -ri замечани src` finds nothing.
   - en and et already used issue / probleem; I aligned the button labels.
2. **Issue form for a phone.**
   - It is now: photo, one line «Что случилось», «Срочно / Не срочно» (two large buttons), «Отправить».
   - Description is hidden under «Ещё». The owner and foreman also see responsible person and deadline there. A worker does not see them at all.
   - «Срочно» is saved as priority `high` and «Не срочно» as `medium`. The database schema does not change.
3. **No technical captions on the worker's screens.**
   - The «Фото уменьшается до 1600px…» line is removed from both photo forms (issue form and task photo).
   - Upload and save errors no longer show the server's English message or the storage path. The worker sees one line, for example «Не получилось отправить фото. Проверьте связь и попробуйте снова.»
   - The details go to `console.warn` for support.
   - Unused keys `photoResizeHint`, `*FailedOrphan` and `*FailedCleaned` were removed.

**Screenshots (390 px, worker), before → after**, in `docs/screens/worker/`:
- `before-issue-form.png` → `after-issue-form.png`: the form
- `before-task-photo-form.png` → `after-task-photo-form.png`: the «1600px» line is gone
- `today`, `stages`, `photos`, `issues`: unchanged except the button label

The full A0 set in `docs/screens/` was regenerated: the issues screen and the form changed. On the other screens only the relative dates in the demo data moved.

`SET=worker PREFIX=after-` in `docs/screens/capture.mjs` captures only the worker screens.

**Checks:** lint clean, `tsc -b` clean, tests 38/38, `ALLOW_PLACEHOLDERS=1 npm run build` OK. The capture script finds no Latin words and no horizontal scroll on any screen.

## What I set aside

- **Item 4, `docs/design-inputs/`.** `buildproof-decisions.md` is not on this machine. The only `landing-prototype` is the old copy in `Buildproof/.claude/docs/landing-prototype/` (5 Nov, `index (1).html` + `loop.html`). I did not commit a file I could not confirm. Once you tell me where the files are, it is one separate commit.

## What remains

- On the issue card the priority still says «Высокий / Средний / Низкий», while the form says «Срочно / Не срочно». I suggest showing «Срочно» on the card for `high` and nothing for the rest. That needs a decision on old `low` issues.
- The new ET strings need a native-speaker review (A7).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
