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
        if (!this.connection) {
            return this.db.connection(this.config.connection);
        }
        return typeof this.connection === "string" ? this.db.connection(this.connection) : this.connection;
    }
    /**
     * Returns the builder query for a given token hash + type
     */
    getLookupQuery(tokenHash, tokenType) {
        return this.getQueryClient().from(this.config.table)
            .where("token", tokenHash)
            .where("type", tokenType);
    }
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
        await this.getLookupQuery(tokenHash, tokenType).delete();
    }
    /**
     * Removes a given token
     */
    async destroy(_tokenId, _tokenType) {
        throw new Error("Should not use this function");
    }
    normalizeDatetime(expiresAt) {
        const client = this.getQueryClient();
        let normalizedExpiryDate;
        /**
         * Parse dialect date to an instance of Luxon
         */
        if (expiresAt instanceof Date) {
            normalizedExpiryDate = luxon_1.DateTime.fromJSDate(expiresAt);
        }
        else if (expiresAt && typeof expiresAt === "string") {
            normalizedExpiryDate = luxon_1.DateTime.fromFormat(expiresAt, client.dialect.dateTimeFormat);
        }
        else if (expiresAt && typeof expiresAt === "number") {
            normalizedExpiryDate = luxon_1.DateTime.fromMillis(expiresAt);
        }
        return normalizedExpiryDate;
    }
}
exports.default = AbstractDatabaseProvider;
