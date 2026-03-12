const { describe, it, before, after, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { setupTestHome } = require("./helpers");

describe("Postinstall Module", () => {
    let env, tmpHome, antigravityDir, mcpConfigPath;
    let consoleLog, origConsoleLog;
    let logs = [];

    before(() => {
        env = setupTestHome();
        tmpHome = env.tmpDir;
        antigravityDir = path.join(tmpHome, ".gemini", "antigravity");
        mcpConfigPath = path.join(antigravityDir, "mcp_config.json");

        // Mock console.log to capture output
        origConsoleLog = console.log;
        consoleLog = (...args) => {
            logs.push(args.join(" "));
        };
    });

    after(() => {
        env.cleanup();
        console.log = origConsoleLog;
    });

    beforeEach(() => {
        logs = [];
        console.log = consoleLog;
        // Clean antigravity directory before each test
        if (fs.existsSync(antigravityDir)) {
            fs.rmSync(antigravityDir, { recursive: true, force: true });
        }
    });

    afterEach(() => {
        console.log = origConsoleLog;
    });

    describe("main function", () => {
        it("should display welcome message", () => {
            // Mock platforms to return empty array
            const Module = require("module");
            const originalRequire = Module.prototype.require;
            Module.prototype.require = function (id) {
                if (id === "./platforms") {
                    return {
                        detectAll: () => [],
                        getByName: (name) => {
                            if (name === "antigravity") {
                                return {
                                    mcpConfigPath: path.join(tmpHome, ".gemini", "antigravity", "mcp_config.json")
                                };
                            }
                            return null;
                        }
                    };
                }
                return originalRequire.apply(this, arguments);
            };

            delete require.cache[require.resolve("../scripts/postinstall")];
            require("../scripts/postinstall");

            Module.prototype.require = originalRequire;

            const output = logs.join("\n");
            assert.ok(output.includes("AI Agent Config Installed!"));
            assert.ok(output.includes("Quick Start:"));
        });

        it("should display detected platforms", () => {
            const Module = require("module");
            const originalRequire = Module.prototype.require;
            Module.prototype.require = function (id) {
                if (id === "./platforms") {
                    return {
                        detectAll: () => [
                            { displayName: "Claude Code" },
                            { displayName: "Antigravity" }
                        ],
                        getByName: (name) => {
                            if (name === "antigravity") {
                                return {
                                    mcpConfigPath: path.join(tmpHome, ".gemini", "antigravity", "mcp_config.json")
                                };
                            }
                            return null;
                        }
                    };
                }
                return originalRequire.apply(this, arguments);
            };

            delete require.cache[require.resolve("../scripts/postinstall")];
            require("../scripts/postinstall");

            Module.prototype.require = originalRequire;

            const output = logs.join("\n");
            assert.ok(output.includes("Detected platforms:"));
            assert.ok(output.includes("Claude Code"));
            assert.ok(output.includes("Antigravity"));
        });

        it("should add Bitwarden MCP when antigravity dir exists and no config", () => {
            fs.mkdirSync(antigravityDir, { recursive: true });

            const Module = require("module");
            const originalRequire = Module.prototype.require;
            Module.prototype.require = function (id) {
                if (id === "./platforms") {
                    return {
                        detectAll: () => [],
                        getByName: (name) => {
                            if (name === "antigravity") {
                                return {
                                    mcpConfigPath: path.join(tmpHome, ".gemini", "antigravity", "mcp_config.json")
                                };
                            }
                            return null;
                        }
                    };
                }
                return originalRequire.apply(this, arguments);
            };

            delete require.cache[require.resolve("../scripts/postinstall")];
            require("../scripts/postinstall");

            Module.prototype.require = originalRequire;

            assert.ok(fs.existsSync(mcpConfigPath), "mcp_config.json should be created");
            const config = JSON.parse(fs.readFileSync(mcpConfigPath, "utf-8"));
            assert.ok(config.mcpServers.bitwarden, "bitwarden server should be added");
            assert.strictEqual(config.mcpServers.bitwarden.command, "npx");
            assert.ok(config.mcpServers.bitwarden.env.BW_SESSION);
            assert.ok(config.mcpServers.bitwarden.disabledTools);

            const output = logs.join("\n");
            assert.ok(output.includes("Bitwarden MCP server added"));
        });

        it("should repair Bitwarden MCP env if missing", () => {
            fs.mkdirSync(antigravityDir, { recursive: true });
            fs.writeFileSync(mcpConfigPath, JSON.stringify({
                mcpServers: {
                    bitwarden: {
                        command: "npx",
                        args: ["-y", "@bitwarden/mcp-server"],
                        env: {},
                        disabled: true
                    }
                }
            }), "utf-8");

            const Module = require("module");
            const originalRequire = Module.prototype.require;
            Module.prototype.require = function (id) {
                if (id === "./platforms") {
                    return {
                        detectAll: () => [],
                        getByName: (name) => {
                            if (name === "antigravity") {
                                return {
                                    mcpConfigPath: path.join(tmpHome, ".gemini", "antigravity", "mcp_config.json")
                                };
                            }
                            return null;
                        }
                    };
                }
                return originalRequire.apply(this, arguments);
            };

            delete require.cache[require.resolve("../scripts/postinstall")];
            require("../scripts/postinstall");

            Module.prototype.require = originalRequire;

            const config = JSON.parse(fs.readFileSync(mcpConfigPath, "utf-8"));
            assert.ok(config.mcpServers.bitwarden.env.BW_SESSION);
            assert.ok(config.mcpServers.bitwarden.env.BW_CLIENT_ID);
            assert.ok(config.mcpServers.bitwarden.env.BW_CLIENT_SECRET);
            assert.strictEqual(config.mcpServers.bitwarden.disabled, undefined);

            const output = logs.join("\n");
            assert.ok(output.includes("repaired and enabled"));
        });

        it("should add disabledTools if missing", () => {
            fs.mkdirSync(antigravityDir, { recursive: true });
            fs.writeFileSync(mcpConfigPath, JSON.stringify({
                mcpServers: {
                    bitwarden: {
                        command: "npx",
                        args: ["-y", "@bitwarden/mcp-server"],
                        env: {
                            BW_SESSION: "${BW_SESSION}",
                            BW_CLIENT_ID: "${BW_CLIENT_ID}",
                            BW_CLIENT_SECRET: "${BW_CLIENT_SECRET}"
                        }
                    }
                }
            }), "utf-8");

            const Module = require("module");
            const originalRequire = Module.prototype.require;
            Module.prototype.require = function (id) {
                if (id === "./platforms") {
                    return {
                        detectAll: () => [],
                        getByName: (name) => {
                            if (name === "antigravity") {
                                return {
                                    mcpConfigPath: path.join(tmpHome, ".gemini", "antigravity", "mcp_config.json")
                                };
                            }
                            return null;
                        }
                    };
                }
                return originalRequire.apply(this, arguments);
            };

            delete require.cache[require.resolve("../scripts/postinstall")];
            require("../scripts/postinstall");

            Module.prototype.require = originalRequire;

            const config = JSON.parse(fs.readFileSync(mcpConfigPath, "utf-8"));
            assert.ok(config.mcpServers.bitwarden.disabledTools);
            assert.ok(config.mcpServers.bitwarden.disabledTools.includes("lock"));

            const output = logs.join("\n");
            assert.ok(output.includes("Added tool filters"));
        });

        it("should not modify when config is already correct", () => {
            fs.mkdirSync(antigravityDir, { recursive: true });
            const correctConfig = {
                mcpServers: {
                    bitwarden: {
                        command: "npx",
                        args: ["-y", "@bitwarden/mcp-server"],
                        env: {
                            BW_SESSION: "${BW_SESSION}",
                            BW_CLIENT_ID: "${BW_CLIENT_ID}",
                            BW_CLIENT_SECRET: "${BW_CLIENT_SECRET}"
                        },
                        disabledTools: ["lock", "sync"]
                    }
                }
            };
            fs.writeFileSync(mcpConfigPath, JSON.stringify(correctConfig), "utf-8");

            const Module = require("module");
            const originalRequire = Module.prototype.require;
            Module.prototype.require = function (id) {
                if (id === "./platforms") {
                    return {
                        detectAll: () => [],
                        getByName: (name) => {
                            if (name === "antigravity") {
                                return {
                                    mcpConfigPath: path.join(tmpHome, ".gemini", "antigravity", "mcp_config.json")
                                };
                            }
                            return null;
                        }
                    };
                }
                return originalRequire.apply(this, arguments);
            };

            delete require.cache[require.resolve("../scripts/postinstall")];
            require("../scripts/postinstall");

            Module.prototype.require = originalRequire;

            const config = JSON.parse(fs.readFileSync(mcpConfigPath, "utf-8"));
            assert.deepStrictEqual(config, correctConfig, "Config should not change");

            const output = logs.join("\n");
            assert.ok(!output.includes("repaired"));
            assert.ok(!output.includes("Added tool filters"));
        });

        it("should handle malformed JSON gracefully", () => {
            fs.mkdirSync(antigravityDir, { recursive: true });
            fs.writeFileSync(mcpConfigPath, "{ invalid json", "utf-8");

            const Module = require("module");
            const originalRequire = Module.prototype.require;
            Module.prototype.require = function (id) {
                if (id === "./platforms") {
                    return {
                        detectAll: () => [],
                        getByName: (name) => {
                            if (name === "antigravity") {
                                return {
                                    mcpConfigPath: path.join(tmpHome, ".gemini", "antigravity", "mcp_config.json")
                                };
                            }
                            return null;
                        }
                    };
                }
                return originalRequire.apply(this, arguments);
            };

            delete require.cache[require.resolve("../scripts/postinstall")];
            require("../scripts/postinstall");

            Module.prototype.require = originalRequire;

            // Should fail silently - check logs don't include error traces
            const output = logs.join("\n");
            assert.ok(output.includes("AI Agent Config Installed!"));
        });

        it("should skip when antigravity dir does not exist", () => {
            const Module = require("module");
            const originalRequire = Module.prototype.require;
            Module.prototype.require = function (id) {
                if (id === "./platforms") {
                    return {
                        detectAll: () => [],
                        getByName: (name) => {
                            if (name === "antigravity") {
                                return {
                                    mcpConfigPath: path.join(tmpHome, ".gemini", "antigravity", "mcp_config.json")
                                };
                            }
                            return null;
                        }
                    };
                }
                return originalRequire.apply(this, arguments);
            };

            delete require.cache[require.resolve("../scripts/postinstall")];
            require("../scripts/postinstall");

            Module.prototype.require = originalRequire;

            assert.ok(!fs.existsSync(mcpConfigPath), "Should not create config");

            const output = logs.join("\n");
            assert.ok(!output.includes("Bitwarden MCP"));
        });
    });
});
