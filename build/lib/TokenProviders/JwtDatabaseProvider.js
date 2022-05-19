"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@poppinss/utils");
const luxon_1 = require("luxon");
const AbstractDatabaseProvider_1 = __importDefault(require("./AbstractDatabaseProvider"));
const JwtProviderToken_1 = require("../ProviderToken/JwtProviderToken");
const ProviderToken_1 = require("@adonisjs/auth/build/src/Tokens/ProviderToken");
/**
 * Database backend tokens provider.
 * Can't extend original TokenDatabaseProvider since all its methods are private,
 * so I copied it altogether from @adonisjs/auth
 */
class JwtDatabaseProvider extends AbstractDatabaseProvider_1.default {
    /**
     * Reads the token using the lookup token hash
     */
    async read(tokenId, tokenHash, tokenType) {
        /**
         * should not be provided
         */
        if (tokenId) {
            throw new utils_1.Exception("Should not pass tokenId");
        }
        if (!tokenHash) {
            throw new utils_1.Exception("Empty token hash passed");
        }
        if (!tokenType) {
            throw new utils_1.Exception("Empty token type passed");
        }
        /**
         * Find token using hash
         */
        const tokenRow = await this.getLookupQuery(tokenHash, tokenType).first();
        if (!tokenRow || !tokenRow.token) {
            return null;
        }
        const { name, [this.foreignKey]: userId, token: value, refresh_token: refreshToken, refresh_token_expires_at: refreshTokenExpiresAt, type, ...meta } = tokenRow;
        /**
         * token.expiresAt is not filled since JWT already contains an expiration date.
         */
        const token = new JwtProviderToken_1.JwtProviderToken(name, value, userId, type);
        token.meta = meta;
        token.refreshToken = refreshToken;
        token.refreshTokenExpiresAt = refreshTokenExpiresAt;
        return token;
    }
    /**
     * Returns the builder query for a given refresh token hash
     */
    getRefreshTokenLookupQuery(tokenHash) {
        return this.getQueryClient().from(this.config.table).where("refresh_token", tokenHash);
    }
    /**
     * Reads the refresh token using the token hash
     */
    async readRefreshToken(userRefreshToken, _tokenType) {
        /**
         * Find token using hash
         */
        const tokenRow = await this.getRefreshTokenLookupQuery(userRefreshToken).first();
        if (!tokenRow || !tokenRow.token) {
            return null;
        }
        const { name, [this.foreignKey]: userId, token: value, refresh_token: refreshToken, refresh_token_expires_at: refreshTokenExpiresAt, type, ...meta } = tokenRow;
        /**
         * Ensure refresh token isn't expired
         */
        const normalizedExpiryDate = this.normalizeDatetime(refreshTokenExpiresAt);
        if (normalizedExpiryDate && normalizedExpiryDate.diff(luxon_1.DateTime.local(), "milliseconds").milliseconds <= 0) {
            return null;
        }
        /**
         * This is a ProviderToken with refresh token only (no JWT)
         */
        const token = new ProviderToken_1.ProviderToken(name, refreshToken, userId, type);
        token.meta = meta;
        return token;
    }
    /**
     * Saves the token and returns the persisted token lookup id.
     */
    async write(token) {
        const client = this.getQueryClient();
        /**
         * Payload to save to the database
         */
        const payload = {
            [this.foreignKey]: token.userId,
            name: token.name,
            token: token.tokenHash,
            type: token.type,
            refresh_token: token.refreshToken,
            refresh_token_expires_at: token.refreshTokenExpiresAt?.toFormat(client.dialect.dateTimeFormat),
            expires_at: token.expiresAt ? token.expiresAt.toFormat(client.dialect.dateTimeFormat) : null,
            created_at: luxon_1.DateTime.local().toFormat(client.dialect.dateTimeFormat),
            ...token.meta,
        };
        const [persistedToken] = await client.table(this.config.table).insert(payload).returning("id");
        return String(persistedToken);
    }
    /**
     * Removes a given token using hash
     */
    async destroyRefreshToken(tokenHash, tokenType) {
        if (!tokenHash) {
            throw new Error("Empty token hash passed");
        }
        if (!tokenType) {
            throw new Error("Empty token type passed");
        }
        await this.getRefreshTokenLookupQuery(tokenHash).delete();
    }
}
exports.default = JwtDatabaseProvider;
