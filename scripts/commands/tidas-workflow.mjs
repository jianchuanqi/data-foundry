export function createTidasWorkflowCommands({
  repoRoot,
  runTidasHandshake,
  runTidasImport,
  runTidasPackageValidation,
  runTidasRowsValidation,
}) {
  function help(command, usage) {
    return {
      schema_version: 1,
      status: "help",
      command,
      usage,
      owner: "tidas",
      remote_write_mode: "read-only",
    };
  }

  return {
    runTidasHandshake(options = {}) {
      if (options.help) {
        return help("tidas-handshake", [
          "node scripts/foundry.mjs tidas-handshake [--tidas-bin /path/to/tidas] [--tidas-config /path/to/config]",
        ]);
      }
      const result = runTidasHandshake({ repoRoot, options });
      return {
        schema_version: 1,
        status: "passed",
        command: "tidas-handshake",
        binary_version: result.binary_version,
        operation_report: result.report,
        validation_describe: result.validation_describe,
        validation_describe_report: result.validation_describe_report,
        foundry_adapter: result,
      };
    },
    runTidasImport(options = {}) {
      if (options.help) {
        return help("dataset-tidas-import", [
          "node scripts/foundry.mjs dataset-tidas-import --input <source> --output <dir> [--from-format <format>] [--target tidas|ilcd|both] [--write-mapping]",
        ]);
      }
      const result = runTidasImport({ repoRoot, options });
      return {
        ...result.report,
        foundry_adapter: result,
      };
    },
    runTidasPackageValidation(options = {}) {
      if (options.help) {
        return help("dataset-tidas-validate", [
          "node scripts/foundry.mjs dataset-tidas-validate --input <package-dir> [--input-format tidas-json|ilcd-xml]",
          "node scripts/foundry.mjs dataset-tidas-validate --rows-file <rows.jsonl> --type <type> --out-dir <dir>",
        ]);
      }
      const result = options.rowsFile
        ? runTidasRowsValidation({ repoRoot, options })
        : runTidasPackageValidation({ repoRoot, options });
      return {
        ...result.report,
        foundry_adapter: result,
      };
    },
  };
}
