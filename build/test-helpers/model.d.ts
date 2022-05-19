import { BaseModel } from "@ioc:Adonis/Lucid/Orm";
export declare class User extends BaseModel {
    password: string;
    email: string;
    rememberMeToken: string;
}
