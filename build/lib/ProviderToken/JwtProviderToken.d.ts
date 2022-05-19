import { DateTime } from 'luxon';
import { ProviderToken } from '@adonisjs/auth/build/src/Tokens/ProviderToken';
import { JwtProviderTokenContract } from '@ioc:Adonis/Addons/Jwt';
/**
 * Token returned and accepted by the token providers
 */
export declare class JwtProviderToken extends ProviderToken implements JwtProviderTokenContract {
    refreshToken: string;
    refreshTokenExpiresAt: DateTime;
}
