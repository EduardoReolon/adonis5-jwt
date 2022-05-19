"use strict";
/*
 * @adonisjs/auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@poppinss/utils");
/**
 * Redis backed tokens provider.
 * Can't extend original TokenRedisProvider since all its methods are private,
 * so I copied it altogether from @adonisjs/auth
 */
class AbstractRedisProvider {
    constructor(config, redis) {
        this.config = config;
        this.redis = redis;
        /**
         * The foreign key column
         */
        this.foreignKey = this.config.foreignKey || "user_id";
    }
    /**
     * Returns the singleton instance of the redis connection
     */
    getRedisConnection() {
        /**
         * Use custom connection if defined
         */
        if (this.connection) {
            return typeof this.connection === "string" ? this.redis.connection(this.connection) : this.connection;
        }
        /**
         * Config must have a connection defined
         */
        if (!this.config.redisConnection) {
            throw new utils_1.Exception('Missing "redisConnection" property for auth redis provider inside "config/auth" file', 500, "E_INVALID_AUTH_REDIS_CONFIG");
        }
        return this.redis.connection(this.config.redisConnection);
    }
    /**
     * Parse the stringified redis token value to an object
     */
    parseToken(token) {
        if (!token) {
            return null;
        }
        try {
            const tokenRow = JSON.parse(token);
            if (!tokenRow.token || !tokenRow.name || !tokenRow[this.foreignKey]) {
                return null;
            }
            return tokenRow;
        }
        catch {
            return null;
        }
    }
    /**
     * Define custom connection
     */
    setConnection(connection) {
        this.connection = connection;
        return this;
    }
    /**
     * Compose Redis key using hash
     */
    getKey(tokenHash, tokenType) {
        return `${tokenType}:${tokenHash}`;
    }
    /**
     * Reads the token using the lookup token hash
     */
    async read(_tokenId, _tokenHash, _tokenType) {
        throw new Error("Subclass should overwrite this method");
    }
    /**
     * Saves the token and returns the persisted token lookup id, which
     * is a cuid.
     */
    async write(_token) {
        throw new Error("Subclass should overwrite this method");
    }
    /**
     * Removes a given token
     */
    async destroy(_tokenId, _tokenType) {
        throw new Error("Should not use this function");
    }
    /**
     * Removes a given token using hash
     */
    async destroyWithHash(tokenHash, tokenType) {
        await this.getRedisConnection().del(this.getKey(tokenHash, tokenType));
    }
}
exports.default = AbstractRedisProvider;
