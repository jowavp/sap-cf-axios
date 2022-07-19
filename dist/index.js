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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAxiosError = exports.flushCache = exports.getSapCfAxiosInstance = exports.AxiosError = void 0;
const sap_cf_destconn_1 = require("sap-cf-destconn");
const axios_1 = __importDefault(require("axios"));
const node_cache_1 = __importDefault(require("node-cache"));
const log = __importStar(require("cf-nodejs-logging-support"));
const configEnhancer_1 = __importDefault(require("./configEnhancer"));
const instanceCache = new node_cache_1.default({ stdTTL: 12 * 60 * 60, checkperiod: 60 * 60 });
var axios_2 = require("axios");
Object.defineProperty(exports, "AxiosError", { enumerable: true, get: function () { return axios_2.AxiosError; } });
function getSapCfAxiosInstance(destination, instanceConfig, xsrfConfig = 'options') {
    const cacheKey = `${instanceConfig && instanceConfig.subscribedDomain}_$$_${destination}`;
    if (!instanceCache.has(cacheKey)) {
        instanceCache.set(cacheKey, SapCfAxios(destination, instanceConfig, xsrfConfig));
    }
    const instance = instanceCache.get(cacheKey);
    if (!instance) {
        const cfErr = {
            message: 'unable to get the destination instance',
        };
        throw cfErr;
        //throw 'unable to get the destination instance';
    }
    return instance;
}
exports.getSapCfAxiosInstance = getSapCfAxiosInstance;
function flushCache() {
    return instanceCache.flushAll();
}
exports.flushCache = flushCache;
function SapCfAxios(destination, instanceConfig, xsrfConfig = 'options') {
    return createInstance(destination, instanceConfig, xsrfConfig);
}
exports.default = SapCfAxios;
// exports = SapCfAxios;
function createInstance(destinationName, instanceConfig, xsrfConfig = 'options') {
    // we will add an interceptor to axios that will take care of the destination configuration
    const instance = axios_1.default.create(instanceConfig);
    // we return the destination configuration in the response.
    instance.interceptors.request.use((config) => __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        // enhance config object with destination information
        //@ts-ignore
        const logger = config.logger || log || console;
        const auth = (((_a = config.headers) === null || _a === void 0 ? void 0 : _a.Authorization) || ((_b = config.headers) === null || _b === void 0 ? void 0 : _b.authorization));
        try {
            const destination = yield (0, sap_cf_destconn_1.readDestination)(destinationName, auth, (instanceConfig || {}).subscribedDomain);
            const newConfig = yield (0, configEnhancer_1.default)(config, destination);
            if (newConfig.xsrfHeaderName && newConfig.xsrfHeaderName !== 'X-XSRF-TOKEN' && ((_c = newConfig.headers) === null || _c === void 0 ? void 0 : _c[newConfig.xsrfHeaderName]) !== 'Fetch') {
                // handle x-csrf-Token
                const csrfMethod = typeof xsrfConfig === 'string' ? xsrfConfig : (xsrfConfig.method || 'options');
                const csrfUrl = typeof xsrfConfig === 'string' ? newConfig.url : xsrfConfig.url;
                const csrfParams = typeof xsrfConfig === 'string' ? {} : xsrfConfig.params;
                var tokenReq = {
                    url: csrfUrl,
                    method: csrfMethod,
                    headers: {
                        [newConfig.xsrfHeaderName]: "Fetch"
                    },
                    params: csrfParams
                };
                try {
                    const { headers } = yield instance(tokenReq);
                    const cookies = headers["set-cookie"]; // get cookie from request
                    // req.headers = {...req.headers, [req.xsrfHeaderName]: headers[req.xsrfHeaderName]}
                    if (headers) {
                        if (!newConfig.headers)
                            newConfig.headers = {};
                        if (cookies)
                            newConfig.headers.cookie = cookies.join('; ');
                        if (headers[newConfig.xsrfHeaderName]) {
                            newConfig.headers[newConfig.xsrfHeaderName] = headers[newConfig.xsrfHeaderName];
                        }
                    }
                }
                catch (err) {
                    logAxiosError(err, logger);
                    if (err instanceof Error) {
                        throw Object.assign(Object.assign({}, err), { 'sap-cf-axios': {
                                message: 'sap-cf-axios: Error while getting token',
                                tokenMethod: tokenReq.method,
                                tokenUrl: tokenReq.url
                            } });
                    }
                    throw err;
                }
            }
            return newConfig;
        }
        catch (e) {
            if (e instanceof Error) {
                logger.error('unable to connect to the destination', e);
                throw Object.assign(Object.assign({}, e), { 'sap-cf-axios': {
                        message: 'sap-cf-axios: unable to connect to the destination'
                    } });
            }
            throw e;
        }
    }));
    return instance;
}
function logAxiosError(error, logger1) {
    const logger = typeof (logger1 === null || logger1 === void 0 ? void 0 : logger1.error) === "function" ? logger1 : log;
    try {
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            logger.error(error.response.data);
            logger.error(error.response.status);
            logger.error(error.response.headers);
        }
        else if (error.request) {
            // The request was made but no response was received
            // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
            // http.ClientRequest in node.js
            logger.error(JSON.stringify(error.request));
        }
        else if (error.message) {
            // Something happened in setting up the request that triggered an Error
            logger.error('Error', error.message);
        }
        else {
            try {
                logger.error(JSON.stringify(error));
            }
            catch (err) {
                logger.error(error);
            }
        }
        if (error.config) {
            logger.error(JSON.stringify(error.config));
        }
    }
    catch (error) {
        console.error('Cannot log errors with the given logger');
        console.error(JSON.stringify(error));
    }
}
exports.logAxiosError = logAxiosError;
