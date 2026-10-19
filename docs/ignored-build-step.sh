#!/bin/sh
# Vercel's Ignored Build Step for the website: vercel.json runs it from docs/,
# the project's Root Directory. Exit 0 cancels the deployment and any other
# exit builds it, so a git error builds.
#
# Most pushes change only the app, or the repo's documentation that shares
# docs/ with the website, and leave the site as it was. This builds only when
# something else under docs/ changed. A canceled deployment still counts
# toward Vercel's deployment quota, but it stops after the clone instead of
# installing and building.
#
# The list names what is not the website, so a new file builds by default;
# add a new folder or top-level file of documentation to it.
# __tests__/vercelIgnoredBuildStep.test.ts pins which changes build.

if [ -n "${VERCEL_GIT_PREVIOUS_SHA:-}" ]; then
  # The last deployment that succeeded on this branch. Vercel clones ten
  # commits deep, so it may be missing.
  base=$VERCEL_GIT_PREVIOUS_SHA
  git cat-file -e "$base^{commit}" 2>/dev/null ||
    git fetch --quiet --depth=1 origin "$base" 2>/dev/null
else
  # Nothing has succeeded on this branch yet: compare its website with main's.
  base=$(git fetch --quiet --depth=1 origin main 2>/dev/null &&
    git rev-parse FETCH_HEAD)
  if [ -z "$base" ] || [ "$base" = "$(git rev-parse HEAD)" ]; then
    echo "No deployment or main to compare with: building."
    exit 1
  fi
fi

if git diff --quiet "$base" HEAD -- . ':!adr' ':!agents' ':!plans' \
  ':!.vscode' ':!.gitignore' ':!README.md' \
  ':(exclude,glob)CYCLE_PREDICTION_*.md'; then
  echo "The website is unchanged since $base: skipping the build."
  exit 0
fi
echo "The website changed since $base, or $base is unknown: building."
exit 1
