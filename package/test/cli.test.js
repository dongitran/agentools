const { describe, it } = require("node:test");
const assert = require("node:assert");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const cliPath = path.join(__dirname, "..", "bin", "cli.js");

describe("CLI Module", () => {
  describe("CLI file structure", () => {
    it("should exist", () => {
      assert.ok(fs.existsSync(cliPath));
    });
    it("should have shebang", () => {
      assert.ok(fs.readFileSync(cliPath, "utf-8").startsWith("#!/usr/bin/env node"));
    });
    it("should define all main commands", () => {
      const content = fs.readFileSync(cliPath, "utf-8");
      ["init", "pull", "push", "update", "list", "platforms", "uninstall", "list-external", "sync-external", "migrate"].forEach(cmd => {
        assert.ok(content.includes(`case "${cmd}":`), `Missing ${cmd}`);
      });
    });
    it("should define source subcommands", () => {
      const content = fs.readFileSync(cliPath, "utf-8");
      ["add", "remove", "list", "enable", "disable", "info"].forEach(sub => {
        assert.ok(content.includes(`case "${sub}":`));
      });
    });
    it("should define config subcommands", () => {
      const content = fs.readFileSync(cliPath, "utf-8");
      ["get", "set", "edit", "validate", "export", "import", "reset"].forEach(sub => {
        assert.ok(content.includes(`case "${sub}":`));
      });
    });
  });

  describe("CLI execution", () => {
    it("should show version with --version", () => {
      const out = execSync(`node "${cliPath}" --version`, { encoding: "utf-8" }).trim();
      assert.ok(out.startsWith("v"));
      assert.ok(out.includes(require("../package.json").version));
    });
    it("should show version with -v", () => {
      assert.ok(execSync(`node "${cliPath}" -v`, { encoding: "utf-8" }).trim().startsWith("v"));
    });
    it("should show help with --help", () => {
      const out = execSync(`node "${cliPath}" --help`, { encoding: "utf-8" });
      assert.ok(out.includes("AI Agent Config CLI"));
    });
    it("should show help with no args", () => {
      assert.ok(execSync(`node "${cliPath}"`, { encoding: "utf-8" }).includes("AI Agent Config CLI"));
    });
    it("should handle unknown command", () => {
      try {
        execSync(`node "${cliPath}" unknown-cmd`, { encoding: "utf-8", stdio: "pipe" });
      } catch (err) {
        assert.ok(err.stdout.includes("Unknown command") || err.stderr.includes("Unknown command"));
      }
    });
    it("should run platforms command", () => {
      const out = execSync(`node "${cliPath}" platforms`, { encoding: "utf-8" });
      assert.ok(typeof out === "string");
    });
    it("should run list command", () => {
      assert.ok(typeof execSync(`node "${cliPath}" list`, { encoding: "utf-8" }) === "string");
    });
  });

  describe("Package.json", () => {
    it("should have correct bin entry", () => {
      const pkg = require("../package.json");
      assert.ok(pkg.bin["agentools"].includes("cli.js"));
    });
  });
});
