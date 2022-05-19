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
const JwtProviderToken_1 = require("../ProviderToken/JwtProviderToken");
const AbstractRedisProvider_1 = __importDefault(require("./AbstractRedisProvider"));
const ProviderToken_1 = require("@adonisjs/auth/build/src/Tokens/ProviderToken");
/**
 * Redis backed tokens provider.
 * Can't extend original TokenRedisProvider since all its methods are private,
 * so I copied it altogether from @adonisjs/auth
 */
class JwtRedisProvider extends AbstractRedisProvider_1.default {
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
        const token = new JwtProviderToken_1.JwtProviderToken(name, value, userId, tokenType);
        token.meta = meta;
        return token;
    }
    /**
     * Reads the refresh token using the token hash
     */
    async readRefreshToken(userRefreshToken, tokenType) {
        /**
         * Find token using hash
         */
        const tokenRow = this.parseToken(await this.getRedisConnection().get(this.getKey(userRefreshToken, tokenType)));
        if (!tokenRow) {
            return null;
        }
        const { name, [this.foreignKey]: userId, token: refreshToken, type, ...meta } = tokenRow;
        /**
         * Check if refresh token in redis key matches the provided refresh token
         */
        if (userRefreshToken !== refreshToken) {
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
     * Saves the token and returns the persisted token lookup id, which
     * is a cuid.
     */
    async write(token) {
        /**
         * Payload to save to the database
         */
        const jwtPayload = {
            [this.foreignKey]: token.userId,
            name: token.name,
            token: token.tokenHash,
            ...token.meta,
        };
        const jwtKeyTTL = token.expiresAt ? Math.ceil(token.expiresAt.diffNow("seconds").seconds) : 0;
        if (token.expiresAt && jwtKeyTTL <= 0) {
            throw new utils_1.Exception("The JWT expiry date/time should be in the future", 500, "E_INVALID_TOKEN_EXPIRY");
        }
        const refreshTokenKeyTTL = token.refreshTokenExpiresAt ? Math.ceil(token.refreshTokenExpiresAt.diffNow("seconds").seconds) : 0;
        if (token.expiresAt && refreshTokenKeyTTL <= 0) {
            throw new utils_1.Exception("The refresh token expiry date/time should be in the future", 500, "E_INVALID_TOKEN_EXPIRY");
        }
        /**
         * Store JWT in redis
         */
        const jwtId = (0, helpers_1.cuid)();
        if (token.expiresAt) {
            await this.getRedisConnection().setex(this.getKey(token.tokenHash, token.type), jwtKeyTTL, JSON.stringify(jwtPayload));
        }
        else {
            await this.getRedisConnection().set(this.getKey(token.tokenHash, token.type), JSON.stringify(jwtPayload));
        }
        const refreshTokenPayload = {
            [this.foreignKey]: token.userId,
            name: token.name,
            token: token.refreshToken,
            ...token.meta,
        };
        /**
         * Store refresh token in redis
         */
        if (token.refreshTokenExpiresAt) {
            await this.getRedisConnection().setex(this.getKey(token.refreshToken, "jwt_refresh_token"), refreshTokenKeyTTL, JSON.stringify(refreshTokenPayload));
        }
        else {
            await this.getRedisConnection().set(this.getKey(token.refreshToken, "jwt_refresh_token"), JSON.stringify(refreshTokenPayload));
        }
        return jwtId;
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
        await this.getRedisConnection().del(this.getKey(tokenHash, tokenType));
    }
}
exports.default = JwtRedisProvider;
