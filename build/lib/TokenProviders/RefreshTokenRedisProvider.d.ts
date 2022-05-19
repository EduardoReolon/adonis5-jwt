/// <reference types="@adonisjs/auth" />
import { RefreshTokenProviderContract } from "@ioc:Adonis/Addons/Jwt";
import AbstractRedisProvider from "./AbstractRedisProvider";
import { ProviderTokenContract } from "@ioc:Adonis/Addons/Auth";
import { ProviderToken } from "@adonisjs/auth/build/src/Tokens/ProviderToken";
/**
 * Redis backed tokens provider.
 * Can't extend original TokenRedisProvider since all its methods are private,
 * so I copied it altogether from @adonisjs/auth
 */
export default class RefreshTokenRedisProvider extends AbstractRedisProvider implements RefreshTokenProviderContract {
    /**
     * Reads the token using the lookup token hash
     */
    read(tokenId: string, tokenHash: string, tokenType: string): Promise<ProviderTokenContract | null>;
    /**
     * Saves the token and returns the persisted token lookup id, which
     * is a cuid.
     */
    write(token: ProviderToken): Promise<string>;
}
