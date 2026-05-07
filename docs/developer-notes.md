# Developer Notes

## `next-env.d.ts` and local git status

Next.js can update `next-env.d.ts` during local dev/build runs and switch the
typed routes import between these generated files:

```ts
import "./.next/types/routes.d.ts";
import "./.next/dev/types/routes.d.ts";
```

This is an auto-generated local type reference change. It should not be treated
as a product/runtime change and should not be committed as part of feature work.

To keep the local working tree clean during large Codex phases, mark the file as
skip-worktree on your machine:

```bash
git update-index --skip-worktree next-env.d.ts
```

To undo the local skip-worktree flag:

```bash
git update-index --no-skip-worktree next-env.d.ts
```

If the diff contains anything other than the generated Next.js route type
reference change, inspect it before restoring or changing git index flags.
