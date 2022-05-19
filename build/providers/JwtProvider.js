'use strict';
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
Object.defineProperty(exports, "__esModule", { value: true });
const JwtGuard_1 = require("../lib/Guards/JwtGuard");
class JwtProvider {
    constructor(app) {
        this.app = app;
    }
    /**
     * Register namespaces to the IoC container
     *
     * @method register
     *
     * @return {void}
     */
    async register() {
        const Event = this.app.container.resolveBinding('Adonis/Core/Event');
        const AuthManager = this.app.container.resolveBinding('Adonis/Addons/Auth');
        const { default: JwtRedisProvider } = await Promise.resolve().then(() => __importStar(require('../lib/TokenProviders/JwtRedisProvider')));
        const { default: JwtDatabaseProvider } = await Promise.resolve().then(() => __importStar(require('../lib/TokenProviders/JwtDatabaseProvider')));
        const { default: JwtMongoProvider } = await Promise.resolve().then(() => __importStar(require('../lib/TokenProviders/JwtMongoProvider')));
        const { default: RefreshTokenDatabaseProvider } = await Promise.resolve().then(() => __importStar(require('../lib/TokenProviders/RefreshTokenDatabaseProvider')));
        AuthManager.extend('guard', 'jwt', (_auth, _mapping, config, provider, ctx) => {
            //The default TokenDatabaseProvider expects token id to be prepended
            //to the JWT token which makes no sense, because then JWT becomes invalid.
            //Use a custom JwtTokenDatabaseProvider so that the JWT can be found in database using
            //the token itself and not an id.
            //const tokenProvider = auth.makeTokenProviderInstance(config.tokenProvider);
            let tokenProvider;
            if (config.persistJwt && config.tokenProvider.driver === "database") {
                const Database = this.app.container.use('Adonis/Lucid/Database');
                tokenProvider = new JwtDatabaseProvider(config.tokenProvider, Database);
            }
            else if (!config.persistJwt && config.tokenProvider.driver === "database") {
                const Database = this.app.container.use('Adonis/Lucid/Database');
                tokenProvider = new RefreshTokenDatabaseProvider(config.tokenProvider, Database);
            }
            else if (config.tokenProvider.driver === "redis") {
                const Redis = this.app.container.use('Adonis/Addons/Redis');
                tokenProvider = new JwtRedisProvider(config.tokenProvider, Redis);
            }
            else if (config.persistJwt && config.tokenProvider.driver === "mongo") {
                const Database = this.app.container.use('Adonis/Lucid/Database');
                tokenProvider = new JwtMongoProvider(config.tokenProvider, Database);
            }
            else {
                throw new Error(`Invalid tokenProvider driver: ${config.tokenProvider.driver}`);
            }
            return new JwtGuard_1.JWTGuard(_mapping, config, Event, provider, ctx, tokenProvider);
        });
    }
}
exports.default = JwtProvider;
