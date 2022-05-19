"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtProviderToken = void 0;
const ProviderToken_1 = require("@adonisjs/auth/build/src/Tokens/ProviderToken");
/**
 * Token returned and accepted by the token providers
 */
class JwtProviderToken extends ProviderToken_1.ProviderToken {
}
exports.JwtProviderToken = JwtProviderToken;
