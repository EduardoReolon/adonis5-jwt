/// <reference types="@adonisjs/events/build/adonis-typings" />
/// <reference types="@adonisjs/auth" />
/// <reference types="@adonisjs/http-server/build/adonis-typings" />
import { DateTime } from "luxon";
import { GetProviderRealUser, UserProviderContract } from "@ioc:Adonis/Addons/Auth";
import { BaseGuard } from "@adonisjs/auth/build/src/Guards/Base";
import { EmitterContract } from "@ioc:Adonis/Core/Event";
import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import { JWTGuardConfig, JWTGuardContract, JWTLoginOptions, JWTCustomPayload, JWTCustomPayloadData, JWTTokenContract, RefreshTokenProviderContract, JwtProviderContract, JWTLogoutOptions } from "@ioc:Adonis/Addons/Jwt";
/**
 * JWT token represents a persisted token generated for a given user.
 *
 * Calling `token.toJSON()` will give you an object, that you can send back
 * as response to share the token with the client.
 */
export declare class JWTToken implements JWTTokenContract<any> {
    name: string;
    accessToken: string;
    refreshToken: string;
    user: any;
    /**
     * The type of the token. Always set to bearer
     */
    type: "bearer";
    /**
     * The datetime in which the token will expire
     */
    expiresAt?: DateTime;
    /**
     * Time left until token gets expired
     */
    expiresIn?: number;
    /**
     * Any meta data attached to the token
     */
    meta: any;
    /**
     * Hash of the token saved inside the database. Make sure to never share
     * this with the client
     */
    tokenHash: string;
    constructor(name: string, // Name associated with the token
    accessToken: string, // The raw token value. Only available for the first time
    refreshToken: string, // The raw refresh token value. Only available for the first time
    user: any);
    /**
     * Shareable version of the token
     */
    toJSON(): {
        expires_in?: number | undefined;
        expires_at?: string | undefined;
        type: "bearer";
        token: string;
        refreshToken: string;
    };
}
/**
 * Exposes the API to generate and authenticate HTTP request using jwt tokens
 */
export declare class JWTGuard extends BaseGuard<"jwt"> implements JWTGuardContract<any, "jwt"> {
    config: JWTGuardConfig<any>;
    private emitter;
    private ctx;
    tokenProvider: JwtProviderContract | RefreshTokenProviderContract;
    private tokenTypes;
    /**
     * The payload of the authenticated user
     */
    payload?: JWTCustomPayloadData;
    /**
     * Reference to the parsed token
     */
    private tokenHash;
    /**
     * Token type for the persistance store
     */
    private tokenType;
    /**
     * constructor of class.
     */
    constructor(_name: string, config: JWTGuardConfig<any>, emitter: EmitterContract, provider: UserProviderContract<any>, ctx: HttpContextContract, tokenProvider: JwtProviderContract | RefreshTokenProviderContract);
    /**
     * Verify user credentials and perform login
     */
    attempt(uid: string, password: string, options?: JWTLoginOptions): Promise<any>;
    /**
     * Same as [[authenticate]] but returns a boolean over raising exceptions
     */
    check(): Promise<boolean>;
    /**
     * Authenticates the current HTTP request by checking for the bearer token
     */
    authenticate(): Promise<GetProviderRealUser<any>>;
    /**
     * Generate token for a user. It is merely an alias for `login`
     */
    generate(user: any, options?: JWTLoginOptions): Promise<JWTTokenContract<any>>;
    /**
     * Login user using their id
     */
    loginViaId(id: string | number, options?: JWTLoginOptions): Promise<any>;
    /**
     * Login user using the provided refresh token
     */
    loginViaRefreshToken(refreshToken: string, options?: JWTLoginOptions): Promise<any>;
    /**
     * Get user related to provided refresh token
     */
    getUserFromRefreshToken(refreshToken: string): Promise<any>;
    /**
     * Login a user
     */
    login(user: GetProviderRealUser<any>, options?: JWTLoginOptions): Promise<any>;
    /**
     * Logout by removing the token from the storage
     */
    logout(options?: JWTLogoutOptions): Promise<void>;
    /**
     * Alias for the logout method
     */
    revoke(options?: JWTLogoutOptions): Promise<void>;
    /**
     * Serialize toJSON for JSON.stringify
     */
    toJSON(): any;
    /**
     * Generates a new access token + refresh token + hash's for the persistance.
     */
    private generateTokenForPersistance;
    /**
     * Converts key string to Buffer
     */
    private generateKey;
    /**
     * Converts value to a sha256 hash
     */
    private generateHash;
    /**
     * Converts expiry duration to an absolute date/time value
     */
    private getExpiresAtDate;
    /**
     * Returns the bearer token
     */
    getBearerToken(): string;
    /**
     * Verify the token received in the request.
     */
    verifyToken(token: string): Promise<JWTCustomPayload>;
    /**
     * Returns the token by reading it from the token provider
     */
    private getProviderToken;
    /**
     * Returns user from the user session id
     */
    private getUserById;
    /**
     * Returns data packet for the login event. Arguments are
     *
     * - The mapping identifier
     * - Logged in user
     * - HTTP context
     * - API token
     */
    private getLoginEventData;
    /**
     * Returns data packet for the authenticate event. Arguments are
     *
     * - The mapping identifier
     * - Logged in user
     * - HTTP context
     * - A boolean to tell if logged in viaRemember or not
     */
    private getAuthenticateEventData;
}
