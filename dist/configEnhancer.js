"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importStar(require("axios"));
const sap_cf_destconn_1 = require("sap-cf-destconn");
const tokenCache = {};
function enhanceConfig(config, destination) {
    var _a, _b, _c, _d;
    return __awaiter(this, void 0, void 0, function* () {
        // add auth header
        const destinationConfiguration = destination.destinationConfiguration;
        if (destination.authTokens &&
            destination.authTokens[0] &&
            !destination.authTokens[0].error) {
            if (destination.authTokens[0].error) {
                throw new Error(destination.authTokens[0].error);
            }
            if (destination.authTokens[0].type &&
                destination.authTokens[0].type.toLocaleLowerCase() === "bearertoken")
                destination.authTokens[0].type = "Bearer";
            if (destination.authTokens[0].type &&
                destination.authTokens[0].type.toLowerCase() === "bearer")
                // some applications fail on bearer
                destination.authTokens[0].type = "Bearer";
            config.headers = new axios_1.AxiosHeaders(Object.assign(Object.assign({}, config.headers), { Authorization: `${destination.authTokens[0].type} ${destination.authTokens[0].value}` }));
        }
        else if (destinationConfiguration.Authentication === "OAuth2ClientCredentials") {
            if (destination.authTokens &&
                destination.authTokens[0] &&
                destination.authTokens[0].error) {
                /*
                console.warn(destination.authTokens[0].error);
                console.warn(
                  `Token cannot be delivered by the destination service. I will try to do it myself by adding some parameters.`
                );
                */
            }
            const clientCredentialsToken = yield createToken(destinationConfiguration);
            config.headers = new axios_1.AxiosHeaders(Object.assign(Object.assign({}, config.headers), { Authorization: `Bearer ${clientCredentialsToken}` }));
        }
        if (destinationConfiguration.ProxyType.toLowerCase() === "onpremise") {
            // connect over the cloud connector
            const authHeader = ((((_a = config.headers) === null || _a === void 0 ? void 0 : _a["Authorization"]) || ((_b = config.headers) === null || _b === void 0 ? void 0 : _b["authorization"])));
            const connectivityValues = destinationConfiguration.Authentication === "PrincipalPropagation"
                ? yield (0, sap_cf_destconn_1.readConnectivity)(destinationConfiguration.CloudConnectorLocationId, authHeader, true)
                : yield (0, sap_cf_destconn_1.readConnectivity)(destinationConfiguration.CloudConnectorLocationId, undefined, false);
            config = Object.assign(Object.assign({}, config), { proxy: connectivityValues.proxy, headers: new axios_1.AxiosHeaders(Object.assign(Object.assign({}, config.headers), connectivityValues.headers)) });
            // if it is principal propagation ... remove the original authentication header ...
            // for principal propagation, Proxy-Authorization header will be used to generate the logon ticket
            if (destinationConfiguration.Authentication === "PrincipalPropagation") {
                (_c = config.headers) === null || _c === void 0 ? true : delete _c.Authorization;
                (_d = config.headers) === null || _d === void 0 ? true : delete _d.authorization;
            }
        }
        return Object.assign(Object.assign({}, config), { baseURL: destinationConfiguration.URL });
    });
}
exports.default = enhanceConfig;
function createToken(dc) {
    return __awaiter(this, void 0, void 0, function* () {
        const scope = convertScope(dc.Scope || dc.scope);
        const additionalOauthProperties = Object.entries(dc)
            .filter(([key]) => key.startsWith(`oauth_`))
            .reduce((acc, [key, value]) => {
            const newKey = key.replace(`oauth_`, "");
            if (newKey) {
                acc = Object.assign(Object.assign({}, acc), { [newKey]: value });
            }
            return acc;
        }, undefined);
        let token;
        const cacheKey = `${dc.Name}_${dc.tokenServiceURL}`;
        if (tokenCache[cacheKey] &&
            tokenCache[cacheKey].expires.getTime() > new Date().getTime()) {
            return tokenCache[cacheKey].value;
        }
        if (scope || additionalOauthProperties) {
            token = (yield (0, axios_1.default)({
                url: `${dc.tokenServiceURL}`,
                method: "POST",
                responseType: "json",
                data: Object.assign(Object.assign({ grant_type: "client_credentials" }, additionalOauthProperties), { scope: scope }),
                headers: { "Content-Type": "application/json" },
                auth: {
                    username: dc.clientId,
                    password: dc.clientSecret,
                },
            })).data;
        }
        else {
            token = (yield (0, axios_1.default)({
                url: `${dc.tokenServiceURL}`,
                method: "POST",
                responseType: "json",
                data: `client_id=${encodeURIComponent(dc.clientId)}&client_secret=${encodeURIComponent(dc.clientSecret)}&grant_type=client_credentials`,
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                auth: {
                    username: dc.clientId,
                    password: dc.clientSecret,
                },
            })).data;
        }
        // cache the token
        const timeObject = new Date();
        tokenCache[cacheKey] = {
            value: token.access_token,
            expires: new Date(timeObject.getTime() + 1000 * token.expires_in),
        };
        return token.access_token;
    });
}
function convertScope(scope) {
    if (!scope)
        return undefined;
    return scope
        .split(" ")
        .map((sc) => sc.split(":"))
        .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
    }, {});
}
