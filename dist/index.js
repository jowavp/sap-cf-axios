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
exports.logAxiosError = exports.flushCache = exports.getSapCfAxiosInstance = exports.FlexsoAxiosCache = exports.AxiosError = void 0;
const sap_cf_destconn_1 = require("sap-cf-destconn");
const axios_1 = __importStar(require("axios"));
const node_cache_1 = __importDefault(require("node-cache"));
const cf_nodejs_logging_support_1 = __importDefault(require("cf-nodejs-logging-support"));
const configEnhancer_1 = __importDefault(require("./configEnhancer"));
const object_hash_1 = __importDefault(require("object-hash"));
const instanceCache = new node_cache_1.default({
    stdTTL: 12 * 60 * 60,
    checkperiod: 60 * 60,
    useClones: false,
});
var axios_2 = require("axios");
Object.defineProperty(exports, "AxiosError", { enumerable: true, get: function () { return axios_2.AxiosError; } });
var axiosCache_1 = require("./cache/axiosCache");
Object.defineProperty(exports, "FlexsoAxiosCache", { enumerable: true, get: function () { return axiosCache_1.FlexsoAxiosCache; } });
function getSapCfAxiosInstance(destination, instanceConfig, xsrfConfig = "options") {
    const configHash = (0, object_hash_1.default)(instanceConfig || "default");
    const cacheKey = `${configHash}_$$_${destination}`;
    if (!instanceCache.has(cacheKey)) {
        instanceCache.set(cacheKey, SapCfAxios(destination, instanceConfig, xsrfConfig));
    }
    const instance = instanceCache.get(cacheKey);
    if (!instance) {
        const cfErr = {
            message: "unable to get the destination instance",
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
function SapCfAxios(destination, instanceConfig, xsrfConfig = "options") {
    return createInstance(destination, instanceConfig, xsrfConfig);
}
exports.default = SapCfAxios;
// exports = SapCfAxios;
function createInstance(destinationName, instanceConfig, xsrfConfig = "options") {
    // keep the interceptors to register on the instance
    const interceptors = instanceConfig === null || instanceConfig === void 0 ? void 0 : instanceConfig.interceptors;
    if (instanceConfig)
        delete instanceConfig.interceptors;
    const instance = axios_1.default.create(instanceConfig);
    // we will add an interceptor to axios that will take care of the destination configuration
    // we return the destination configuration in the response.
    instance.interceptors.request.use((config) => __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        // enhance config object with destination information
        const logger = config.logger || cf_nodejs_logging_support_1.default || console;
        const auth = ((((_a = config.headers) === null || _a === void 0 ? void 0 : _a.Authorization) || ((_b = config.headers) === null || _b === void 0 ? void 0 : _b.authorization)));
        try {
            const destination = yield (0, sap_cf_destconn_1.readDestination)(destinationName, auth, (instanceConfig || {}).subscribedDomain);
            const newConfig = yield (0, configEnhancer_1.default)(config, destination);
            if (newConfig.xsrfHeaderName &&
                newConfig.xsrfHeaderName !== "X-XSRF-TOKEN" &&
                ((_c = newConfig.headers) === null || _c === void 0 ? void 0 : _c[newConfig.xsrfHeaderName]) !== "Fetch") {
                // handle x-csrf-Token
                const csrfMethod = typeof xsrfConfig === "string"
                    ? xsrfConfig
                    : xsrfConfig.method || "options";
                const csrfUrl = typeof xsrfConfig === "string" ? newConfig.url : xsrfConfig.url;
                const csrfParams = typeof xsrfConfig === "string" ? {} : xsrfConfig.params;
                var tokenReq = {
                    url: csrfUrl,
                    method: csrfMethod,
                    headers: new axios_1.AxiosHeaders(Object.assign(Object.assign({}, (auth && { authorization: auth })), { [newConfig.xsrfHeaderName]: "Fetch" })),
                    params: csrfParams,
                };
                try {
                    const { headers } = yield instance(tokenReq);
                    const cookies = headers["set-cookie"]; // get cookie from request
                    // req.headers = {...req.headers, [req.xsrfHeaderName]: headers[req.xsrfHeaderName]}
                    if (headers) {
                        if (!newConfig.headers)
                            newConfig.headers = new axios_1.AxiosHeaders({});
                        if (cookies)
                            newConfig.headers.cookie = cookies.join("; ");
                        if (headers[newConfig.xsrfHeaderName]) {
                            newConfig.headers[newConfig.xsrfHeaderName] =
                                headers[newConfig.xsrfHeaderName];
                        }
                    }
                }
                catch (err) {
                    logAxiosError(err, logger);
                    if (err instanceof Error) {
                        throw Object.assign(Object.assign({}, err), { request: "<hidden>", "sap-cf-axios": {
                                message: "sap-cf-axios: Error while getting token",
                                tokenMethod: tokenReq.method,
                                tokenUrl: tokenReq.url,
                            } });
                    }
                    throw err;
                }
            }
            return newConfig;
        }
        catch (e) {
            if (e instanceof Error) {
                (_d = logger === null || logger === void 0 ? void 0 : logger.error) === null || _d === void 0 ? void 0 : _d.call(logger, "unable to connect to the destination", e);
                throw Object.assign(Object.assign({}, e), { request: "<hidden>", "sap-cf-axios": {
                        message: "sap-cf-axios: unable to connect to the destination",
                    } });
            }
            throw e;
        }
    }));
    // if there are interceptors, add them only once to the instance!!!
    if (interceptors) {
        if (interceptors.request) {
            (interceptors.request || []).forEach((interceptorFn) => instance.interceptors.request.use(interceptorFn));
        }
        if (interceptors.response) {
            (interceptors.response || []).forEach((interceptorFn) => instance.interceptors.response.use(interceptorFn));
        }
    }
    return instance;
}
function logAxiosError(error, logger1) {
    const logger = typeof (logger1 === null || logger1 === void 0 ? void 0 : logger1.error) === "function" ? logger1 : cf_nodejs_logging_support_1.default;
    try {
        logger.error("Error", error.message);
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            logger.error(JSON.stringify({
                data: error.response.data,
                status: error.response.status,
                headers: error.response.headers,
            }));
        }
        else {
            logger.error(JSON.stringify(error.toJSON()));
        }
    }
    catch (error1) {
        console.error("Cannot log errors with the given logger", error1);
        console.error(error);
    }
}
exports.logAxiosError = logAxiosError;
