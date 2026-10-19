const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");
/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push("sql");
// Agent worktrees under .claude/ are second copies of the repo. Watching them
// reloads the app whenever another session edits its copy. Anchored to this
// checkout's root: inside a worktree, every path contains `/.claude/`.
const agentDir = path.join(__dirname, ".claude");
config.resolver.blockList = [
  ...[config.resolver.blockList ?? []].flat(),
  new RegExp(`^${agentDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[/\\\\]`),
];
module.exports = config;
