"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const luxon_1 = require("luxon");
const ProviderToken_1 = require("@adonisjs/auth/build/src/Tokens/ProviderToken");
const AbstractDatabaseProvider_1 = __importDefault(require("./AbstractDatabaseProvider"));
/**
 * Database backend tokens provider.
 * Can't extend original TokenDatabaseProvider since all its methods are private,
 * so I copied it altogether from @adonisjs/auth
 */
class RefreshTokenDatabaseProvider extends AbstractDatabaseProvider_1.default {
    /**
     * Reads the token using the lookup token id
     */
    async read(tokenId, tokenHash, tokenType) {
        /**
         * should not be provided
         */
        if (tokenId) {
            throw new Error("Should not pass tokenId");
        }
        if (!tokenHash) {
            throw new Error("Empty token hash passed");
        }
        if (!tokenType) {
            throw new Error("Empty token type passed");
        }
        /**
         * Find token using hash
         */
        const tokenRow = await this.getLookupQuery(tokenHash, tokenType).first();
        if (!tokenRow || !tokenRow.token) {
            return null;
        }
        const { name, [this.foreignKey]: userId, token: value, expires_at: expiresAt, type, ...meta } = tokenRow;
        /**
         * Ensure refresh token isn't expired
         */
        const normalizedExpiryDate = this.normalizeDatetime(expiresAt);
        if (normalizedExpiryDate && normalizedExpiryDate.diff(luxon_1.DateTime.local(), "milliseconds").milliseconds <= 0) {
            return null;
        }
        const token = new ProviderToken_1.ProviderToken(name, value, userId, type);
        token.expiresAt = expiresAt;
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
            expires_at: token.expiresAt ? token.expiresAt.toFormat(client.dialect.dateTimeFormat) : null,
            created_at: luxon_1.DateTime.local().toFormat(client.dialect.dateTimeFormat),
            ...token.meta,
        };
        const [persistedToken] = await client.table(this.config.table).insert(payload).returning("id");
        return String(persistedToken);
    }
}
exports.default = RefreshTokenDatabaseProvider;
