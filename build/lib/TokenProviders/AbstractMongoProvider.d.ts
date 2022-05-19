/// <reference types="@adonisjs/lucid" />
/// <reference types="@adonisjs/auth" />
import { DateTime } from "luxon";
import { DatabaseContract, QueryClientContract } from "@ioc:Adonis/Lucid/Database";
import { TokenProviderContract, ProviderTokenContract } from "@ioc:Adonis/Addons/Auth";
import { MongoTokenProviderConfig } from "@ioc:Adonis/Addons/Jwt";
import { ProviderToken } from "@adonisjs/auth/build/src/Tokens/ProviderToken";
/**
 * Database backend tokens provider.
 * Can't extend original TokenDatabaseProvider since all its methods are private,
 * so I copied it altogether from @adonisjs/auth
 */
export default class AbstractDatabaseProvider implements TokenProviderContract {
    protected config: MongoTokenProviderConfig;
    protected db: DatabaseContract;
    constructor(config: MongoTokenProviderConfig, db: DatabaseContract);
    /**
     * Custom connection or query client
     */
    protected connection?: string | QueryClientContract;
    /**
     * Returns the query client for database queries
     */
    protected getQueryClient(): {
        find: Function;
        findOne: Function;
        deleteOne: Function;
        create: Function;
    };
    /**
     * The foreign key column
     */
    protected foreignKey: string;
    /**
     * Returns the builder query for a given token hash + type
     */
    /**
     * Define custom connection
     */
    setConnection(connection: string | QueryClientContract): this;
    /**
     * Reads the token using the lookup token id
     */
    read(_tokenId: string, _tokenHash: string, _tokenType: string): Promise<ProviderTokenContract | null>;
    /**
     * Saves the token and returns the persisted token lookup id.
     */
    write(_token: ProviderToken): Promise<string>;
    /**
     * Removes a given token
     */
    destroyWithHash(tokenHash: string, tokenType: string): Promise<void>;
    /**
     * Removes a given token
     */
    destroy(_tokenId: string, _tokenType: string): Promise<void>;
    protected normalizeDatetime(expiresAt: any): DateTime | undefined;
}
