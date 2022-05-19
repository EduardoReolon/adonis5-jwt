"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const luxon_1 = require("luxon");
/**
 * Database backend tokens provider.
 * Can't extend original TokenDatabaseProvider since all its methods are private,
 * so I copied it altogether from @adonisjs/auth
 */
class AbstractDatabaseProvider {
    constructor(config, db) {
        this.config = config;
        this.db = db;
        /**
         * The foreign key column
         */
        this.foreignKey = this.config.foreignKey || "user_id";
    }
    /**
     * Returns the query client for database queries
     */
    getQueryClient() {
        return this.config.model;
    }
    /**
     * Returns the builder query for a given token hash + type
     */
    // protected getLookupQuery(tokenHash: string, tokenType: string) {
    //     return this.getQueryClient().from(this.config.table)
    //         .where("token", tokenHash)
    //         .where("type", tokenType);
    // }
    /**
     * Define custom connection
     */
    setConnection(connection) {
        this.connection = connection;
        return this;
    }
    /**
     * Reads the token using the lookup token id
     */
    async read(_tokenId, _tokenHash, _tokenType) {
        throw new Error("Subclass should overwrite this method");
    }
    /**
     * Saves the token and returns the persisted token lookup id.
     */
    async write(_token) {
        throw new Error("Subclass should overwrite this method");
    }
    /**
     * Removes a given token
     */
    async destroyWithHash(tokenHash, tokenType) {
        if (!tokenHash) {
            throw new Error("Empty token hash passed");
        }
        if (!tokenType) {
            throw new Error("Empty token type passed");
        }
        await this.config.model.deleteOne({ token: tokenHash, type: tokenType });
    }
    /**
     * Removes a given token
     */
    async destroy(_tokenId, _tokenType) {
        throw new Error("Should not use this function");
    }
    normalizeDatetime(expiresAt) {
        let normalizedExpiryDate;
        /**
         * Parse dialect date to an instance of Luxon
         */
        if (expiresAt instanceof Date) {
            normalizedExpiryDate = luxon_1.DateTime.fromJSDate(expiresAt);
        }
        else if (expiresAt && typeof expiresAt === "string") {
            normalizedExpiryDate = luxon_1.DateTime.fromJSDate(new Date(expiresAt));
        }
        else if (expiresAt && typeof expiresAt === "number") {
            normalizedExpiryDate = luxon_1.DateTime.fromMillis(expiresAt);
        }
        return normalizedExpiryDate;
    }
}
exports.default = AbstractDatabaseProvider;
