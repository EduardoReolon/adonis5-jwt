/// <reference types="@adonisjs/application/build/adonis-typings/application" />
import { ApplicationContract } from '@ioc:Adonis/Core/Application';
export default class JwtProvider {
    protected app: ApplicationContract;
    constructor(app: ApplicationContract);
    /**
     * Register namespaces to the IoC container
     *
     * @method register
     *
     * @return {void}
     */
    register(): Promise<void>;
}
