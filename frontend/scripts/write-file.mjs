import { writeFileSync, appendFileSync } from "node:fs";

const rest = `
/**
 * On Windows, resolve a bare npm bin name (e.g. ` + "`" + `vite` + "`" + ``) to its real JS entry
 * point or a ` + "`" + `cmd /c` + "`" + `` invocation of the `.cmd` stub.
 *
 * ` + "`" + `spawn` + "`" + `` with ` + "`" + `shell: false` + "`" + `` cannot execute a bare `.cmd`/`.ps1` file on
 * Windows (it raises EFTYPE), and node has no shebang mechanism for `.js`
 * entry points without a shell, so we resolve the underlying JS file and run
 * it via ` + "`" + `node` + "`" + ``, or fall back to ` + "`" + `cmd /c "stub.cmd"` + "`" + `` which correctly forwards
 * `%*`.
 */
function resolveWinCommand(command) {
  if (process.platform !== "win32") return null;
  const binDir = join(projectRoot(), "node_modules", ".bin");
  try {
    const entries = readdirSync(binDir);
    const match = entries.find(
      (e) => e.toLowerCase() === \`\${command}.cmd\` || e.toLowerCase() === \`\${command}.ps1\`,
    );
    if (match) {
      const stub = join(binDir, match);
      const stubText = readFileSync(stub, "utf8");
      const jsRef = stubText.match(/"([^"]+\\.js)"\s*\\%/);
      if (jsRef) {
        const jsPath = join(binDir, "..", jsRef[1]);
        return { cmd: "node", args: [jsPath] };
      }
      return { cmd: "cmd", args: ["/c", \`"\${stub}"\`] };
    }
  } catch {
    /* `.bin` missing or unreadable — fall through to defaults below. */
  }
  return null;
}

/** The workspace root (this file lives in `<root>/scripts/`). */
export function projectRoot() {
  return dirname(dirname(fileURLToPath(import.meta.url)));
}

/**
 * Whether `moduleUrl` is the script node was asked to run.
 *
 * Both sides are resolved through symlinks: node realpaths `import.meta.url`
 * but leaves `process.argv[1]` as typed, so comparing them raw makes a CLI
 * launched through a symlinked path (`/tmp` on macOS) a silent no-op.
 */
export function isMainModule(moduleUrl) {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(entry) === fileURLToPath(moduleUrl);
  } catch {
    return false;
  }
}

function main(argv) {
  const [command, ...args] = argv;
  if (!command) {
    console.error("usage: node scripts/with-app-env.mjs <command> [args…]");
    process.exit(2);
  }
  const env = mergeAppEnv(readAppEnv(projectRoot()), process.env);
  const isWin32 = process.platform === "win32";
  let runCommand = command;
  let runArgs = args;
  if (isWin32) {
    const resolved = resolveWinCommand(command);
    if (resolved) {
      runCommand = resolved.cmd;
      runArgs = [...resolved.args, ...args];
    } else if (args.length === 0) {
      runCommand = \`\${command}.cmd\`;
      runArgs = [];
    } else {
      runCommand = \`\${command}.cmd\`;
      runArgs = args;
    }
  }
  const child = spawn(runCommand, runArgs, {
    stdio: "inherit",
    env,
    shell: false,
  });
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.on(signal, () => child.kill(signal));
  }
  child.on("error", (err) => {
    console.error(\`[with-app-env] failed to run \${command}:\`, err?.message || err);
    process.exit(127);
  });
  child.on("exit", (code, signal) => {
    process.exit(exitStatusFromChild(code, signal));
  });
}

if (isMainModule(import.meta.url)) {
  main(process.argv.slice(2));
}
`;

appendFileSync("with-app-env.mjs", rest, "utf8");
console.log("DONE - appended to with-app-env.mjs");
