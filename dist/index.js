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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const destination_1 = require("./destination");
const axios_1 = __importDefault(require("axios"));
const axios_cookiejar_support_1 = __importDefault(require("axios-cookiejar-support"));
const tough = __importStar(require("tough-cookie"));
function sapCfAxios(destination) {
    return __awaiter(this, void 0, void 0, function* () {
        // we will add an interceptor to axios that will take care of the destination configuration
        const destinationConfiguration = typeof destination === 'string' ? yield destination_1.readDestination(destination) : destination;
        const instance = axios_1.default.create();
        axios_cookiejar_support_1.default(instance);
        instance.defaults.jar = new tough.CookieJar(); // tough.CookieJar or boolean
        instance.defaults.withCredentials = true;
        // we return the destination configuration in the response.
        instance.interceptors.request.use((config) => __awaiter(this, void 0, void 0, function* () {
            // enhance config object with destination information
            return enhanceConfig(config, destinationConfiguration);
        }));
        return instance;
    });
}
exports.default = sapCfAxios;
function enhanceConfig(config, destination) {
    return __awaiter(this, void 0, void 0, function* () {
        let authorization = {};
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
