/// <reference types="@adonisjs/auth" />
import { ProviderTokenContract } from "@ioc:Adonis/Addons/Auth";
import { ProviderToken } from "@adonisjs/auth/build/src/Tokens/ProviderToken";
import AbstractDatabaseProvider from "./AbstractDatabaseProvider";
import { RefreshTokenProviderContract } from "@ioc:Adonis/Addons/Jwt";
/**
 * Database backend tokens provider.
 * Can't extend original TokenDatabaseProvider since all its methods are private,
 * so I copied it altogether from @adonisjs/auth
 */
export default class RefreshTokenDatabaseProvider extends AbstractDatabaseProvider implements RefreshTokenProviderContract {
    /**
     * Reads the token using the lookup token id
     */
    read(tokenId: string, tokenHash: string, tokenType: string): Promise<ProviderTokenContract | null>;
    /**
     * Saves the token and returns the persisted token lookup id.
     */
    write(token: ProviderToken): Promise<string>;
}
