/// <reference types="@adonisjs/auth" />
import { JwtProviderTokenContract, JwtProviderContract } from "@ioc:Adonis/Addons/Jwt";
import { JwtProviderToken } from "../ProviderToken/JwtProviderToken";
import AbstractRedisProvider from "./AbstractRedisProvider";
import { ProviderTokenContract } from "@ioc:Adonis/Addons/Auth";
/**
 * Redis backed tokens provider.
 * Can't extend original TokenRedisProvider since all its methods are private,
 * so I copied it altogether from @adonisjs/auth
 */
export default class JwtRedisProvider extends AbstractRedisProvider implements JwtProviderContract {
    /**
     * Reads the token using the lookup token hash
     */
    read(tokenId: string, tokenHash: string, tokenType: string): Promise<JwtProviderTokenContract | null>;
    /**
     * Reads the refresh token using the token hash
     */
    readRefreshToken(userRefreshToken: string, tokenType: string): Promise<ProviderTokenContract | null>;
    /**
     * Saves the token and returns the persisted token lookup id, which
     * is a cuid.
     */
    write(token: JwtProviderToken): Promise<string>;
    /**
     * Removes a given token using hash
     */
    destroyRefreshToken(tokenHash: string, tokenType: string): Promise<void>;
}
