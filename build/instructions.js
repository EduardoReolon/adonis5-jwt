"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const ms_1 = __importDefault(require("ms"));
const crypto_1 = require("crypto");
const sinkStatic = __importStar(require("@adonisjs/sink"));
const helpers_1 = require("@poppinss/utils/build/helpers");
const ts_morph_1 = require("ts-morph");
const editorconfig_1 = require("editorconfig");
/**
 * Prompt choices for the tokens provider selection
 */
const TOKENS_PROVIDER_PROMPT_CHOICES = [
    {
        name: "database",
        message: "Database",
        hint: " (Uses SQL table for storing JWT tokens)",
    },
    {
        name: "redis",
        message: "Redis",
        hint: " (Uses Redis for storing JWT tokens)",
    },
];
/**
 * Returns absolute path to the stub relative from the templates
 * directory. This path is correct when files are in /build folder
 */
function getStub(...relativePaths) {
    return (0, path_1.join)(__dirname, "templates", ...relativePaths);
}
/**
 *
 * @returns
 */
async function getIntendationConfigForTsMorph(projectRoot) {
    const indentConfig = await (0, editorconfig_1.parse)(projectRoot + "/.editorconfig");
    let indentationText;
    if (indentConfig.indent_style === "space" && indentConfig.indent_size === 2) {
        indentationText = ts_morph_1.IndentationText.TwoSpaces;
    }
    else if (indentConfig.indent_style === "space" && indentConfig.indent_size === 4) {
        indentationText = ts_morph_1.IndentationText.FourSpaces;
    }
    else if (indentConfig.indent_style === "tab") {
        indentationText = ts_morph_1.IndentationText.Tab;
    }
    else {
        indentationText = ts_morph_1.IndentationText.FourSpaces;
    }
    let newLineKind;
    if (indentConfig.end_of_line === "lf") {
        newLineKind = ts_morph_1.NewLineKind.LineFeed;
    }
    else if (indentConfig.end_of_line === "crlf") {
        newLineKind = ts_morph_1.NewLineKind.CarriageReturnLineFeed;
    }
    else {
        newLineKind = ts_morph_1.NewLineKind.LineFeed;
    }
    return { indentationText, newLineKind };
}
async function getTsMorphProject(projectRoot) {
    const { indentationText, newLineKind } = await getIntendationConfigForTsMorph(projectRoot);
    return new ts_morph_1.Project({
        tsConfigFilePath: projectRoot + "/tsconfig.json",
        manipulationSettings: {
            indentationText: indentationText,
            newLineKind: newLineKind,
            useTrailingCommas: true,
        },
    });
}
/**
 * Create the migration file
 */
function makeTokensMigration(projectRoot, app, sink, state) {
    const migrationsDirectory = app.directoriesMap.get("migrations") || "database";
    const migrationPath = (0, path_1.join)(migrationsDirectory, `${Date.now()}_${state.tokensTableName}.ts`);
    let templateFile = "migrations/jwt_tokens.txt";
    if (!state.persistJwt) {
        templateFile = "migrations/jwt_refresh_tokens.txt";
    }
    const template = new sink.files.MustacheFile(projectRoot, migrationPath, getStub(templateFile));
    if (template.exists()) {
        sink.logger.action("create").skipped(`${migrationPath} file already exists`);
        return;
    }
    template.apply(state).commit();
    sink.logger.action("create").succeeded(migrationPath);
}
/**
 *
 * @param projectRoot
 * @param app
 * @returns
 */
async function getDefinedProviders(projectRoot, app) {
    const contractsDirectory = app.directoriesMap.get("contracts") || "contracts";
    const contractPath = (0, path_1.join)(contractsDirectory, "auth.ts");
    //Instantiate ts-morph
    const project = await getTsMorphProject(projectRoot);
    const authContractFile = project.getSourceFileOrThrow(contractPath);
    //Doesn't work without single quotes wrapping the module name
    const authModule = authContractFile?.getModuleOrThrow("'@ioc:Adonis/Addons/Auth'");
    const definedProviders = {};
    const providersInterface = authModule.getInterfaceOrThrow("ProvidersList");
    const userProviders = providersInterface.getProperties();
    for (const provider of userProviders) {
        let providerType;
        let providerLucidModel = "";
        const providerTypeJs = provider.getTypeNodeOrThrow().getFullText();
        if (providerTypeJs?.indexOf("LucidProviderContract") !== -1) {
            providerType = "lucid";
            const matches = /typeof ([^>]+)/g.exec(providerTypeJs);
            if (matches && matches.length) {
                providerLucidModel = matches[1];
            }
            else {
                sinkStatic.logger.warning(`Unable to find model name for provider ${provider}. Skipping it`);
                continue;
            }
        }
        else if (providerTypeJs?.indexOf("DatabaseProviderContract") !== -1) {
            providerType = "database";
        }
        else {
            continue;
        }
        definedProviders[provider.getName()] = {
            type: providerType,
        };
        if (providerLucidModel) {
            definedProviders[provider.getName()].model = providerLucidModel;
        }
    }
    if (!Object.keys(definedProviders).length) {
        throw new Error("No provider implementation found in ProvidersList. Maybe you didn't configure @adonisjs/auth first?");
    }
    return definedProviders;
}
/**
 * Creates the contract file
 */
async function editContract(projectRoot, app, sink, state) {
    const contractsDirectory = app.directoriesMap.get("contracts") || "contracts";
    const contractPath = (0, path_1.join)(contractsDirectory, "auth.ts");
    //Instantiate ts-morph
    const project = await getTsMorphProject(projectRoot);
    const authContractFile = project.getSourceFileOrThrow(contractPath);
    //Remove JWT import, if already present
    authContractFile.getImportDeclaration("@ioc:Adonis/Addons/Jwt")?.remove();
    //Add JWT import
    authContractFile.addImportDeclaration({
        namedImports: ["JWTGuardConfig", "JWTGuardContract"],
        moduleSpecifier: "@ioc:Adonis/Addons/Jwt",
    });
    //Doesn't work without single quotes wrapping the module name
    const authModule = authContractFile?.getModuleOrThrow("'@ioc:Adonis/Addons/Auth'");
    let providerName = "";
    const providersInterface = authModule.getInterfaceOrThrow("ProvidersList");
    if (state.providerConfiguredName && providersInterface.getProperty(state.providerConfiguredName)) {
        providerName = state.providerConfiguredName;
    }
    else {
        providerName = `user_using_${state.provider}`;
        let implementation = "";
        let config = "";
        if (state.provider === "lucid") {
            implementation = `LucidProviderContract<typeof ${state.usersModelName}>`;
            config = `LucidProviderConfig<typeof ${state.usersModelName}>`;
        }
        else {
            implementation = `DatabaseProviderContract<DatabaseProviderRow>`;
            config = `DatabaseProviderConfig`;
        }
        //Insert provider in last position
        providersInterface.addProperty({
            name: providerName,
            type: `{
                implementation: ${implementation},
                config: ${config},
            }`,
        });
    }
    const guardsInterface = authModule.getInterfaceOrThrow("GuardsList");
    //Remove JWT guard, if already present
    guardsInterface.getProperty("jwt")?.remove();
    //Insert JWT guard in second position (first parameter)
    guardsInterface.addProperty({
        name: "jwt",
        type: `{
            implementation: JWTGuardContract<'${providerName}', 'api'>,
            config: JWTGuardConfig<'${providerName}'>,
        }`,
    });
    authContractFile.formatText();
    await authContractFile?.save();
    sink.logger.action("update").succeeded(contractPath);
}
/**
 * Makes the auth config file
 */
async function editConfig(projectRoot, app, sink, state) {
    const configDirectory = app.directoriesMap.get("config") || "config";
    const configPath = (0, path_1.join)(configDirectory, "auth.ts");
    let tokenProvider;
    if (state.tokensProvider === "redis") {
        tokenProvider = ts_morph_1.Writers.object({
            type: "'jwt'",
            driver: "'redis'",
            redisConnection: "'local'",
            foreignKey: "'user_id'",
        });
    }
    else {
        tokenProvider = ts_morph_1.Writers.object({
            type: "'api'",
            driver: "'database'",
            table: "'jwt_tokens'",
            foreignKey: "'user_id'",
        });
    }
    let provider;
    if (state.provider === "database") {
        provider = ts_morph_1.Writers.object({
            driver: "'database'",
            identifierKey: "'id'",
            uids: "['email']",
            usersTable: `'${state.usersTableName}'`,
        });
    }
    else if (state.provider === "lucid") {
        provider = ts_morph_1.Writers.object({
            driver: '"lucid"',
            identifierKey: '"id"',
            uids: "[]",
            model: `() => import('${state.usersModelNamespace}')`,
        });
    }
    else {
        throw new Error(`Invalid state.provider: ${state.provider}`);
    }
    //Instantiate ts-morph
    const project = await getTsMorphProject(projectRoot);
    const authConfigFile = project.getSourceFileOrThrow(configPath);
    //Remove Env import, if already present
    authConfigFile.getImportDeclaration("@ioc:Adonis/Core/Env")?.remove();
    //Add Env import
    authConfigFile.addImportDeclaration({
        defaultImport: "Env",
        moduleSpecifier: "@ioc:Adonis/Core/Env",
    });
    const variable = authConfigFile
        ?.getVariableDeclarationOrThrow("authConfig")
        .getInitializerIfKindOrThrow(ts_morph_1.SyntaxKind.ObjectLiteralExpression);
    let guardsProperty = variable?.getPropertyOrThrow("guards");
    let guardsObject = guardsProperty.getInitializerIfKindOrThrow(ts_morph_1.SyntaxKind.ObjectLiteralExpression);
    //Remove JWT config, if already present
    guardsObject.getProperty("jwt")?.remove();
    //Add JWT config
    guardsObject?.addPropertyAssignment({
        name: "jwt",
        initializer: ts_morph_1.Writers.object({
            driver: '"jwt"',
            publicKey: `Env.get('JWT_PUBLIC_KEY', '').replace(/\\\\n/g, '\\n')`,
            privateKey: `Env.get('JWT_PRIVATE_KEY', '').replace(/\\\\n/g, '\\n')`,
            persistJwt: `${state.persistJwt ? "true" : "false"}`,
            jwtDefaultExpire: `'${state.jwtDefaultExpire}'`,
            refreshTokenDefaultExpire: `'${state.refreshTokenDefaultExpire}'`,
            tokenProvider: tokenProvider,
            provider: provider,
        }),
    });
    authConfigFile.formatText();
    await authConfigFile?.save();
    sink.logger.action("update").succeeded(configPath);
}
async function makeKeys(projectRoot, _app, sink, _state) {
    await new Promise((resolve, reject) => {
        (0, crypto_1.generateKeyPair)("rsa", {
            modulusLength: 4096,
            publicKeyEncoding: {
                type: "spki",
                format: "pem",
            },
            privateKeyEncoding: {
                type: "pkcs8",
                format: "pem",
            },
        }, (err, publicKey, privateKey) => {
            if (err) {
                return reject(err);
            }
            resolve({ publicKey, privateKey });
        });
    }).then(({ privateKey, publicKey }) => {
        const env = new sink.files.EnvFile(projectRoot);
        env.set("JWT_PRIVATE_KEY", privateKey.replace(/\n/g, "\\n"));
        env.set("JWT_PUBLIC_KEY", publicKey.replace(/\n/g, "\\n"));
        env.commit();
        sink.logger.action("update").succeeded(".env,.env.example");
    });
}
/**
 * Prompts user to select the provider
 */
async function getProvider(sink, definedProviders) {
    let choices = {
        lucid: {
            name: "lucid",
            message: "Lucid",
            hint: " (Uses Data Models)",
        },
        database: {
            name: "database",
            message: "Database",
            hint: " (Uses Database QueryBuilder, will be created in this configuration)",
        },
    };
    for (const providerName in definedProviders) {
        const { type: definedProviderType } = definedProviders[providerName];
        if (choices[definedProviderType]) {
            choices[definedProviderType].name = providerName;
            choices[definedProviderType].message = `Already configured ${helpers_1.string.capitalCase(definedProviderType)} provider (${providerName})`;
        }
    }
    const chosenProvider = await sink.getPrompt().choice("Select provider for finding users", Object.values(choices), {
        validate(choice) {
            return choice && choice.length ? true : "Select the provider for finding users";
        },
    });
    return chosenProvider;
}
/**
 * Prompts user to select the tokens provider
 */
async function getTokensProvider(sink) {
    return sink.getPrompt().choice("Select the provider for storing JWT tokens", TOKENS_PROVIDER_PROMPT_CHOICES, {
        validate(choice) {
            return choice && choice.length ? true : "Select the provider for storing JWT tokens";
        },
    });
}
/**
 * Prompts user for the model name
 */
async function getModelName(sink) {
    return sink.getPrompt().ask("Enter model name to be used for authentication", {
        validate(value) {
            return !!value.trim().length;
        },
    });
}
/**
 * Prompts user for the table name
 */
async function getTableName(sink) {
    return sink.getPrompt().ask("Enter the database table name to look up users", {
        validate(value) {
            return !!value.trim().length;
        },
    });
}
/**
 * Prompts user for the table name
 */
async function getMigrationConsent(sink, tableName) {
    return sink.getPrompt().confirm(`Create migration for the ${sink.logger.colors.underline(tableName)} table?`);
}
function getModelNamespace(app, usersModelName) {
    return `${app.namespacesMap.get("models") || "App/Models"}/${helpers_1.string.capitalCase(usersModelName)}`;
}
async function getPersistJwt(sink) {
    return sink.getPrompt().confirm(`Do you want to persist JWT in database/redis (please read README.md beforehand)?`);
}
async function getJwtDefaultExpire(sink, state) {
    return sink.getPrompt().ask("Enter the default expire time for the JWT (10h = 10 hours, 5d = 5 days, etc)", {
        default: state.jwtDefaultExpire,
        validate(value) {
            if (!value.match(/^[0-9]+[a-z]+$/)) {
                return false;
            }
            return !!(0, ms_1.default)(value);
        },
    });
}
async function getRefreshTokenDefaultExpire(sink, state) {
    return sink
        .getPrompt()
        .ask("Enter the default expire time for the refresh token (10h = 10 hours, 5d = 5 days, etc)", {
        default: state.refreshTokenDefaultExpire,
        validate(value) {
            if (!value.match(/^[0-9]+[a-z]+$/)) {
                return false;
            }
            return !!(0, ms_1.default)(value);
        },
    });
}
/**
 * Instructions to be executed when setting up the package.
 */
async function instructions(projectRoot, app, sink) {
    const state = {
        persistJwt: false,
        jwtDefaultExpire: "10m",
        refreshTokenDefaultExpire: "10d",
        tokensTableName: "jwt_tokens",
        tokensSchemaName: "JwtTokens",
        provider: "lucid",
        tokensProvider: "database",
    };
    const definedProviders = await getDefinedProviders(projectRoot, app);
    const chosenProvider = await getProvider(sink, definedProviders);
    if (definedProviders[chosenProvider]) {
        state.providerConfiguredName = chosenProvider;
        state.provider = definedProviders[chosenProvider].type;
        if (definedProviders[chosenProvider].model) {
            state.usersModelName = definedProviders[chosenProvider].model;
            state.usersModelNamespace = getModelNamespace(app, definedProviders[chosenProvider].model);
        }
        /**
         * Prompt for the database table name. If it's using a Lucid provider, we already have
         * the name of the model in the ProvidersList
         */
        if (state.provider === "database") {
            state.usersTableName = await getTableName(sink);
        }
    }
    else {
        //Force type
        state.provider = chosenProvider;
        /**
         * Get model name when provider is lucid otherwise prompt for the database
         * table name
         */
        if (state.provider === "lucid") {
            const usersModelName = await getModelName(sink);
            state.usersModelName = usersModelName.replace(/(\.ts|\.js)$/, "");
            state.usersTableName = helpers_1.string.pluralize(helpers_1.string.snakeCase(usersModelName));
            state.usersModelNamespace = getModelNamespace(app, usersModelName);
        }
        else if (state.provider === "database") {
            state.usersTableName = await getTableName(sink);
        }
    }
    state.persistJwt = await getPersistJwt(sink);
    let tokensMigrationConsent = false;
    state.tokensProvider = await getTokensProvider(sink);
    if (state.tokensProvider === "database") {
        tokensMigrationConsent = await getMigrationConsent(sink, state.tokensTableName);
    }
    state.jwtDefaultExpire = await getJwtDefaultExpire(sink, state);
    state.refreshTokenDefaultExpire = await getRefreshTokenDefaultExpire(sink, state);
    await makeKeys(projectRoot, app, sink, state);
    /**
     * Make tokens migration file
     */
    if (tokensMigrationConsent) {
        makeTokensMigration(projectRoot, app, sink, state);
    }
    /**
     * Make contract file
     */
    await editContract(projectRoot, app, sink, state);
    /**
     * Make config file
     */
    await editConfig(projectRoot, app, sink, state);
}
exports.default = instructions;
