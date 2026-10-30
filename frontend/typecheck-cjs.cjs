const ts = require("typescript");
const path = require("path");
const fs = require("fs");

const OUTPUT_FILE = path.join(process.cwd(), "typecheck_result.txt");

try {
  const configPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists, "tsconfig.json");
  if (!configPath) {
    fs.writeFileSync(OUTPUT_FILE, "ERROR: Could not find tsconfig.json in " + process.cwd());
    process.exit(1);
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(configPath),
  );

  const program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);
  const diagnostics = ts.getPreEmitDiagnostics(program);

  let output = "Found " + diagnostics.length + " error(s).\n";
  for (const diag of diagnostics) {
    const msg = ts.flattenDiagnosticMessageText(diag.messageText, "\n");
    if (diag.file && diag.start !== undefined) {
      const pos = diag.file.getLineAndCharacterOfPosition(diag.start);
      output += diag.file.fileName + " (" + (pos.line + 1) + "," + (pos.character + 1) + "): " + msg + "\n";
    } else {
      output += msg + "\n";
    }
  }

  fs.writeFileSync(OUTPUT_FILE, output);
  console.log(output);
  process.exit(diagnostics.length > 0 ? 1 : 0);
} catch (err) {
  const errMsg = "FATAL ERROR: " + (err && err.stack ? err.stack : String(err));
  fs.writeFileSync(OUTPUT_FILE, errMsg);
  console.error(errMsg);
  process.exit(1);
}

