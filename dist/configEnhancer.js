"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
function enhanceConfig(config, destination) {
    return __awaiter(this, void 0, void 0, function* () {
        let authorization;
        switch (destination.Authentication) {
            case "BasicAuthentication":
                authorization = yield propertiesForBasicAuthentication(destination);
                break;
            case "OAuth2UserTokenExchange":
                authorization = yield propertiesForOAuth2UserTokenExchange(destination, config);
                break;
        }
        return Object.assign(Object.assign(Object.assign({}, config), authorization), { baseURL: destination.URL });
    });
}
exports.default = enhanceConfig;
function propertiesForBasicAuthentication(destination) {
    return __awaiter(this, void 0, void 0, function* () {
        return {
            auth: {
                username: destination.User,
                password: destination.Password
            }
        };
    });
}
function propertiesForOAuth2UserTokenExchange(destination, config) {
    return __awaiter(this, void 0, void 0, function* () {
        // the current user token should be addad in the original authorization header
        if (!config.headers["Authorization"]) {
            throw ('No JWT found in request');
        }
        const refreshTokenResponse = yield axios_1.default({
            url: destination.tokenServiceURL,
            method: 'POST',
            headers: {
                'Authorization': config.headers["Authorization"],
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: `client_id=${destination.clientId}&grant_type=user_token&scope=openid&token_format=jwt`,
        });
        // Exchange refresh token for access token
        const accessToken = (yield axios_1.default({
            url: destination.tokenServiceURL,
            method: 'POST',
            auth: {
                username: destination.clientId,
                password: destination.clientSecret
            },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: `grant_type=refresh_token&refresh_token=${refreshTokenResponse.data.refresh_token}`,
        })).data.access_token;
        return {
            headers: Object.assign(Object.assign({}, config.headers), { 'Authorization': `Bearer ${accessToken}` })
        };
    });
}
