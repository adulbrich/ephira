#!/bin/sh
# Vercel's Ignored Build Step for the website: vercel.json runs it from docs/,
# the project's Root Directory. Exit 0 skips the deployment and any other exit
# builds it, so a git error builds.
#
# Most pushes change only the app, or the repo's documentation that shares
# docs/ with the website, and leave the site as it was. This builds only when
# something else under docs/ changed since the last deployment that succeeded
# on this branch. A skipped deployment still shows as canceled, but it stops
# after the clone instead of installing and building.
#
# The list names what is not the website, so a new site file builds by
# default. Add a new folder of documentation to it.

# Empty until a deployment on this branch succeeds; the newest commit alone is
# then compared. Every push to main is a merge, so there HEAD^ is exactly what
# the pull request changed.
base=${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}

# Vercel clones ten commits deep, so an older base may be missing.
if ! git cat-file -e "$base^{commit}" 2>/dev/null; then
  git fetch --quiet --deepen=100 2>/dev/null
fi

if git diff --quiet "$base" HEAD -- . \
  ':!adr' ':!agents' ':!plans' ':!.vscode' ':!.gitignore' \
  ':(exclude,glob)*.md'; then
  echo "The website is unchanged since $base: skipping the build."
  exit 0
fi
echo "The website changed since $base, or $base is unknown: building."
exit 1
