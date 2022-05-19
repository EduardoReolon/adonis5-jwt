"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWTGuard = exports.JWTToken = void 0;
const luxon_1 = require("luxon");
const sign_1 = require("jose/jwt/sign");
const verify_1 = require("jose/jwt/verify");
const errors_1 = require("jose/util/errors");
const uuid_1 = require("uuid");
const Base_1 = require("@adonisjs/auth/build/src/Guards/Base");
const helpers_1 = require("@poppinss/utils/build/helpers");
const crypto_1 = require("crypto");
const ProviderToken_1 = require("@adonisjs/auth/build/src/Tokens/ProviderToken");
const JwtAuthenticationException_1 = __importDefault(require("../Exceptions/JwtAuthenticationException"));
const JwtProviderToken_1 = require("../ProviderToken/JwtProviderToken");
/**
 * JWT token represents a persisted token generated for a given user.
 *
 * Calling `token.toJSON()` will give you an object, that you can send back
 * as response to share the token with the client.
 */
class JWTToken {
    constructor(name, // Name associated with the token
    accessToken, // The raw token value. Only available for the first time
    refreshToken, // The raw refresh token value. Only available for the first time
    user // The user for which the token is generated
    ) {
        this.name = name;
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.user = user;
        /**
         * The type of the token. Always set to bearer
         */
        this.type = "bearer";
    }
    /**
     * Shareable version of the token
     */
    toJSON() {
        return {
            type: this.type,
            token: this.accessToken,
            refreshToken: this.refreshToken,
            ...(this.expiresAt ? { expires_at: this.expiresAt.toISO() || undefined } : {}),
            ...(this.expiresIn ? { expires_in: this.expiresIn } : {}),
        };
    }
}
exports.JWTToken = JWTToken;
/**
 * Exposes the API to generate and authenticate HTTP request using jwt tokens
 */
class JWTGuard extends Base_1.BaseGuard {
    /**
     * constructor of class.
     */
    constructor(_name, config, emitter, provider, ctx, tokenProvider) {
        super("jwt", config, provider);
        this.config = config;
        this.emitter = emitter;
        this.ctx = ctx;
        this.tokenProvider = tokenProvider;
        this.tokenTypes = {
            refreshToken: "jwt_refresh_token",
            jwtToken: "jwt_token",
        };
        if (this.config.persistJwt) {
            this.tokenType = this.config.tokenProvider.type || this.tokenTypes.jwtToken;
        }
        else {
            this.tokenType = this.tokenTypes.refreshToken;
        }
    }
    /**
     * Verify user credentials and perform login
     */
    async attempt(uid, password, options) {
        const user = await this.verifyCredentials(uid, password);
        return this.login(user, options);
    }
    /**
     * Same as [[authenticate]] but returns a boolean over raising exceptions
     */
    async check() {
        try {
            await this.authenticate();
        }
        catch (error) {
            /**
             * Throw error when it is not an instance of the authentication
             */
            if (!(error instanceof JwtAuthenticationException_1.default) && !(error instanceof errors_1.JWTExpired)) {
                throw error;
            }
            this.ctx.logger.trace(error, "Authentication failure");
        }
        return this.isAuthenticated;
    }
    /**
     * Authenticates the current HTTP request by checking for the bearer token
     */
    async authenticate() {
        /**
         * Return early when authentication has already attempted for
         * the current request
         */
        if (this.authenticationAttempted) {
            return this.user;
        }
        this.authenticationAttempted = true;
        /**
         * Ensure the "Authorization" header value exists, and it's a valid JWT
         */
        const token = this.getBearerToken();
        const payload = await this.verifyToken(token);
        let providerToken;
        if (this.config.persistJwt) {
            /**
             * Query token and user if JWT is persisted.
             */
            providerToken = await this.getProviderToken(token);
        }
        const providerUser = await this.getUserById(payload.data);
        /**
         * Marking user as logged in
         */
        this.markUserAsLoggedIn(providerUser.user, true);
        this.tokenHash = this.generateHash(token);
        this.payload = payload.data;
        /**
         * Emit authenticate event. It can be used to track user logins.
         */
        this.emitter.emit("adonis:api:authenticate", this.getAuthenticateEventData(providerUser.user, providerToken));
        return providerUser.user;
    }
    /**
     * Generate token for a user. It is merely an alias for `login`
     */
    async generate(user, options) {
        return this.login(user, options);
    }
    /**
     * Login user using their id
     */
    async loginViaId(id, options) {
        const providerUser = await this.findById(id);
        return this.login(providerUser.user, options);
    }
    /**
     * Login user using the provided refresh token
     */
    async loginViaRefreshToken(refreshToken, options) {
        const user = await this.getUserFromRefreshToken(refreshToken);
        /**
         * Invalidate old refresh token immediately
         */
        if (this.config.persistJwt) {
            await this.tokenProvider.destroyRefreshToken(refreshToken, this.tokenTypes.refreshToken);
        }
        else {
            await this.tokenProvider.destroyWithHash(refreshToken, this.tokenType);
        }
        return this.login(user, options);
    }
    /**
     * Get user related to provided refresh token
     */
    async getUserFromRefreshToken(refreshToken) {
        let providerToken;
        if (this.config.persistJwt) {
            providerToken = await this.tokenProvider.readRefreshToken(refreshToken, this.tokenTypes.refreshToken);
        }
        else {
            providerToken = await this.tokenProvider.read("", refreshToken, this.tokenType);
        }
        if (!providerToken) {
            throw new JwtAuthenticationException_1.default("Invalid refresh token");
        }
        const providerUser = await this.findById(providerToken.userId);
        return providerUser.user;
    }
    /**
     * Login a user
     */
    async login(user, options) {
        /**
         * Normalize options with defaults
         */
        let { expiresIn, refreshTokenExpiresIn, name, payload, ...meta } = Object.assign({ name: "JWT Access Token" }, options);
        /**
         * Since the login method is not exposed to the end user, we cannot expect
         * them to instantiate and pass an instance of provider user, so we
         * create one manually.
         */
        const providerUser = await this.getUserForLogin(user, this.config.provider.identifierKey);
        /**
         * "getUserForLogin" raises exception when id is missing, so we can
         * safely assume it is defined
         */
        const userId = providerUser.getId();
        if (payload) {
            payload.userId = userId;
        }
        else {
            payload = {
                userId: userId,
                user: {
                    name: user.name,
                    email: user.email,
                },
            };
        }
        /**
         * Generate a JWT and refresh token
         */
        const tokenInfo = await this.generateTokenForPersistance(expiresIn, refreshTokenExpiresIn, payload);
        let providerToken;
        if (!this.config.persistJwt) {
            /**
             * Persist refresh token ONLY to the database.
             */
            providerToken = new ProviderToken_1.ProviderToken(name, tokenInfo.refreshTokenHash, userId, this.tokenType);
            providerToken.expiresAt = tokenInfo.refreshTokenExpiresAt;
            providerToken.meta = meta;
            await this.tokenProvider.write(providerToken);
        }
        else {
            /**
             * Persist JWT token and refresh token to the database
             */
            providerToken = new JwtProviderToken_1.JwtProviderToken(name, tokenInfo.accessTokenHash, userId, this.tokenType);
            providerToken.expiresAt = tokenInfo.expiresAt;
            providerToken.refreshToken = tokenInfo.refreshTokenHash;
            providerToken.refreshTokenExpiresAt = tokenInfo.refreshTokenExpiresAt;
            providerToken.meta = meta;
            await this.tokenProvider.write(providerToken);
        }
        /**
         * Construct a new API Token instance
         */
        const apiToken = new JWTToken(name, tokenInfo.accessToken, tokenInfo.refreshTokenHash, providerUser.user);
        apiToken.tokenHash = tokenInfo.accessTokenHash;
        apiToken.expiresAt = tokenInfo.expiresAt;
        apiToken.meta = meta;
        /**
         * Marking user as logged in
         */
        this.markUserAsLoggedIn(providerUser.user);
        this.payload = payload.data;
        this.tokenHash = tokenInfo.accessTokenHash;
        /**
         * Emit login event. It can be used to track user logins.
         */
        this.emitter.emit("adonis:api:login", this.getLoginEventData(providerUser.user, apiToken));
        return apiToken;
    }
    /**
     * Logout by removing the token from the storage
     */
    async logout(options) {
        if (!this.authenticationAttempted) {
            await this.check();
        }
        if (this.config.persistJwt) {
            /**
             * Remove JWT token from storage
             */
            await this.tokenProvider.destroyWithHash(this.tokenHash, this.tokenType);
        }
        else {
            if (!options || !options.refreshToken) {
                throw new Error("Empty or no refresh token passed");
            }
            /**
             * Revoke/remove refresh token from storage
             */
            await this.tokenProvider.destroyWithHash(options.refreshToken, this.tokenType);
        }
        this.markUserAsLoggedOut();
        this.payload = undefined;
        this.tokenHash = undefined;
    }
    /**
     * Alias for the logout method
     */
    revoke(options) {
        return this.logout(options);
    }
    /**
     * Serialize toJSON for JSON.stringify
     */
    toJSON() {
        return {
            isLoggedIn: this.isLoggedIn,
            isGuest: this.isGuest,
            authenticationAttempted: this.authenticationAttempted,
            isAuthenticated: this.isAuthenticated,
            user: this.user,
        };
    }
    /**
     * Generates a new access token + refresh token + hash's for the persistance.
     */
    async generateTokenForPersistance(expiresIn, refreshTokenExpiresIn, payload = {}) {
        if (!expiresIn) {
            expiresIn = this.config.jwtDefaultExpire;
        }
        if (!refreshTokenExpiresIn) {
            refreshTokenExpiresIn = this.config.refreshTokenDefaultExpire;
        }
        let accessTokenBuilder = new sign_1.SignJWT({ data: payload }).setProtectedHeader({ alg: "RS256" }).setIssuedAt();
        if (this.config.issuer) {
            accessTokenBuilder = accessTokenBuilder.setIssuer(this.config.issuer);
        }
        if (this.config.audience) {
            accessTokenBuilder = accessTokenBuilder.setAudience(this.config.audience);
        }
        if (expiresIn) {
            accessTokenBuilder = accessTokenBuilder.setExpirationTime(expiresIn);
        }
        const accessToken = await accessTokenBuilder.sign(this.generateKey(this.config.privateKey));
        const accessTokenHash = this.generateHash(accessToken);
        const refreshToken = (0, uuid_1.v4)();
        const refreshTokenHash = this.generateHash(refreshToken);
        return {
            accessToken,
            accessTokenHash,
            refreshToken,
            refreshTokenHash,
            expiresAt: this.getExpiresAtDate(expiresIn),
            refreshTokenExpiresAt: this.getExpiresAtDate(refreshTokenExpiresIn),
        };
    }
    /**
     * Converts key string to Buffer
     */
    generateKey(hash) {
        return (0, crypto_1.createPrivateKey)(Buffer.from(hash));
    }
    /**
     * Converts value to a sha256 hash
     */
    generateHash(token) {
        return (0, crypto_1.createHash)("sha256").update(token).digest("hex");
    }
    /**
     * Converts expiry duration to an absolute date/time value
     */
    getExpiresAtDate(expiresIn) {
        if (!expiresIn) {
            return undefined;
        }
        const milliseconds = typeof expiresIn === "string" ? helpers_1.string.toMs(expiresIn) : expiresIn;
        return luxon_1.DateTime.local().plus({ milliseconds });
    }
    /**
     * Returns the bearer token
     */
    getBearerToken() {
        /**
         * Ensure the "Authorization" header value exists
         */
        const token = this.ctx.request.header("Authorization");
        if (!token) {
            throw new JwtAuthenticationException_1.default("No Authorization header passed");
        }
        /**
         * Ensure that token has minimum of two parts and the first
         * part is a constant string named `bearer`
         */
        const [type, value] = token.split(" ");
        if (!type || type.toLowerCase() !== "bearer" || !value) {
            throw new JwtAuthenticationException_1.default("Invalid Authorization header value: " + token);
        }
        return value;
    }
    /**
     * Verify the token received in the request.
     */
    async verifyToken(token) {
        const secret = this.generateKey(this.config.privateKey);
        const { payload } = await (0, verify_1.jwtVerify)(token, secret, {
            issuer: this.config.issuer,
            audience: this.config.audience,
        });
        const { data, exp } = payload;
        if (!data) {
            throw new JwtAuthenticationException_1.default("Invalid JWT payload");
        }
        if (!data.userId) {
            throw new JwtAuthenticationException_1.default("Invalid JWT payload: missing userId");
        }
        if (exp && exp < Math.floor(luxon_1.DateTime.now().toSeconds())) {
            throw new JwtAuthenticationException_1.default("Expired JWT token");
        }
        return payload;
    }
    /**
     * Returns the token by reading it from the token provider
     */
    async getProviderToken(value) {
        const providerToken = await this.tokenProvider.read("", this.generateHash(value), this.tokenType);
        if (!providerToken) {
            throw new JwtAuthenticationException_1.default("Invalid JWT token");
        }
        return providerToken;
    }
    /**
     * Returns user from the user session id
     */
    async getUserById(payloadData) {
        const authenticatable = await this.provider.findById(payloadData.userId);
        if (!authenticatable.user) {
            throw new JwtAuthenticationException_1.default("No user found from payload");
        }
        return authenticatable;
    }
    /**
     * Returns data packet for the login event. Arguments are
     *
     * - The mapping identifier
     * - Logged in user
     * - HTTP context
     * - API token
     */
    getLoginEventData(user, token) {
        return {
            name: this.name,
            ctx: this.ctx,
            user,
            token,
        };
    }
    /**
     * Returns data packet for the authenticate event. Arguments are
     *
     * - The mapping identifier
     * - Logged in user
     * - HTTP context
     * - A boolean to tell if logged in viaRemember or not
     */
    getAuthenticateEventData(user, token) {
        return {
            name: this.name,
            ctx: this.ctx,
            user,
            token,
        };
    }
}
exports.JWTGuard = JWTGuard;
