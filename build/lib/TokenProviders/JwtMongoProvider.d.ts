/// <reference types="@adonisjs/auth" />
import AbstractMongoProvider from "./AbstractMongoProvider";
import { JwtProviderToken } from "../ProviderToken/JwtProviderToken";
import { JwtProviderTokenContract, JwtProviderContract } from "@ioc:Adonis/Addons/Jwt";
import { ProviderTokenContract } from "@ioc:Adonis/Addons/Auth";
/**
 * Database backend tokens provider.
 * Can't extend original TokenDatabaseProvider since all its methods are private,
 * so I copied it altogether from @adonisjs/auth
 */
export default class JwtMongoProvider extends AbstractMongoProvider implements JwtProviderContract {
    /**
     * Reads the token using the lookup token hash
     */
    read(tokenId: string, tokenHash: string, tokenType: string): Promise<JwtProviderTokenContract | null>;
    /**
     * Returns the builder query for a given refresh token hash
     */
    /**
     * Reads the refresh token using the token hash
     */
    readRefreshToken(userRefreshToken: string, _tokenType: string): Promise<ProviderTokenContract | null>;
    /**
     * Saves the token and returns the persisted token lookup id.
     */
    write(token: JwtProviderToken): Promise<string>;
    /**
     * Removes a given token using hash
     */
    destroyRefreshToken(tokenHash: string, tokenType: string): Promise<void>;
}
