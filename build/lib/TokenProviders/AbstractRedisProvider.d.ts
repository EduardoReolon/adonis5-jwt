/// <reference types="@adonisjs/auth" />
/// <reference types="@adonisjs/redis" />
import { RedisManagerContract, RedisConnectionContract, RedisClusterConnectionContract } from "@ioc:Adonis/Addons/Redis";
import { RedisTokenProviderConfig, TokenProviderContract } from "@ioc:Adonis/Addons/Auth";
import { ProviderToken } from '@adonisjs/auth/build/src/Tokens/ProviderToken';
import { ProviderTokenContract } from "@ioc:Adonis/Addons/Auth";
/**
 * Shape of the data persisted inside redis
 */
declare type PersistedToken = {
    name: string;
    token: string;
    [key: string]: any;
};
/**
 * Redis backed tokens provider.
 * Can't extend original TokenRedisProvider since all its methods are private,
 * so I copied it altogether from @adonisjs/auth
 */
export default class AbstractRedisProvider implements TokenProviderContract {
    private config;
    private redis;
    constructor(config: RedisTokenProviderConfig, redis: RedisManagerContract);
    /**
     * Custom connection or query client
     */
    protected connection?: string | RedisConnectionContract | RedisClusterConnectionContract;
    /**
     * Returns the singleton instance of the redis connection
     */
    protected getRedisConnection(): RedisConnectionContract | RedisClusterConnectionContract;
    /**
     * The foreign key column
     */
    protected foreignKey: string;
    /**
     * Parse the stringified redis token value to an object
     */
    protected parseToken(token: string | null): null | PersistedToken;
    /**
     * Define custom connection
     */
    setConnection(connection: string | RedisConnectionContract | RedisClusterConnectionContract): this;
    /**
     * Compose Redis key using hash
     */
    protected getKey(tokenHash: string, tokenType: string): string;
    /**
     * Reads the token using the lookup token hash
     */
    read(_tokenId: string, _tokenHash: string, _tokenType: string): Promise<ProviderTokenContract | null>;
    /**
     * Saves the token and returns the persisted token lookup id, which
     * is a cuid.
     */
    write(_token: ProviderToken): Promise<string>;
    /**
     * Removes a given token
     */
    destroy(_tokenId: string, _tokenType: string): Promise<void>;
    /**
     * Removes a given token using hash
     */
    destroyWithHash(tokenHash: string, tokenType: string): Promise<void>;
}
export {};
