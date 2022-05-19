"use strict";
/*
 * @adonisjs/auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@poppinss/utils");
const helpers_1 = require("@poppinss/utils/build/helpers");
const AbstractRedisProvider_1 = __importDefault(require("./AbstractRedisProvider"));
const ProviderToken_1 = require("@adonisjs/auth/build/src/Tokens/ProviderToken");
/**
 * Redis backed tokens provider.
 * Can't extend original TokenRedisProvider since all its methods are private,
 * so I copied it altogether from @adonisjs/auth
 */
class RefreshTokenRedisProvider extends AbstractRedisProvider_1.default {
    /**
     * Reads the token using the lookup token hash
     */
    async read(tokenId, tokenHash, tokenType) {
        /**
         * should not be provided
         */
        if (tokenId) {
            throw new Error("Should not pass tokenId");
        }
        /**
         * Find token using hash
         */
        const tokenRow = this.parseToken(await this.getRedisConnection().get(this.getKey(tokenHash, tokenType)));
        if (!tokenRow) {
            return null;
        }
        /**
         * Ensure hash of the user provided value is same as the one inside
         * the database
         */
        if (!(0, helpers_1.safeEqual)(tokenRow.token, tokenHash)) {
            return null;
        }
        const { name, [this.foreignKey]: userId, token: value, ...meta } = tokenRow;
        const token = new ProviderToken_1.ProviderToken(name, value, userId, tokenType);
        token.meta = meta;
        return token;
    }
    /**
     * Saves the token and returns the persisted token lookup id, which
     * is a cuid.
     */
    async write(token) {
        /**
         * Payload to save to the database
         */
        const payload = {
            [this.foreignKey]: token.userId,
            name: token.name,
            token: token.tokenHash,
            ...token.meta,
        };
        const ttl = token.expiresAt ? Math.ceil(token.expiresAt.diffNow("seconds").seconds) : 0;
        const tokenId = (0, helpers_1.cuid)();
        if (token.expiresAt && ttl <= 0) {
            throw new utils_1.Exception("The expiry date/time should be in the future", 500, "E_INVALID_TOKEN_EXPIRY");
        }
        if (token.expiresAt) {
            await this.getRedisConnection().setex(this.getKey(token.tokenHash, token.type), ttl, JSON.stringify(payload));
        }
        else {
            await this.getRedisConnection().set(this.getKey(token.tokenHash, token.type), JSON.stringify(payload));
        }
        return tokenId;
    }
}
exports.default = RefreshTokenRedisProvider;
