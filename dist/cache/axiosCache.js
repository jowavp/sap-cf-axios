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
exports.FlexsoAxiosCache = void 0;
const axios_1 = __importDefault(require("axios"));
const object_hash_1 = __importDefault(require("object-hash"));
function isRunningLocal(localdebug) {
    return localdebug && process.env.NODE_ENV === 'local';
}
class FlexsoAxiosCache {
    constructor(cacheFn, defaultAdapter = axios_1.default.defaults.adapter) {
        this.cacheFn = cacheFn;
        this.defaultAdapter = defaultAdapter;
    }
    adapter(config) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const localDebug = config.localDebug || false;
            // check if this config is available in the cahe.
            let saveToCache = (res) => res;
            let start = new Date().getTime();
            if (!config.skipCache && ((_a = config.method) === null || _a === void 0 ? void 0 : _a.toLocaleLowerCase()) === "get") {
                const cache = this.cacheFn(config);
                // metadata is the same for all users.
                const cacheKey = ((_b = config.url) === null || _b === void 0 ? void 0 : _b.includes("$metadata")) ? (0, object_hash_1.default)(axios_1.default.getUri(config)) : (0, object_hash_1.default)(config);
                saveToCache = (res) => {
                    cache.set(config.subscribedDomain || "default", cacheKey, res);
                    return res;
                };
                if (cache) {
                    const resultPromise = cache.getSync(config.subscribedDomain || "default", cacheKey);
                    if (resultPromise) {
                        const result = yield resultPromise;
                        if (result.status > 199 && result.status < 300) {
                            if (isRunningLocal(localDebug)) {
                                const end = new Date().getTime();
                                console.info(`Cached request: ${config.url}: ${end - start} ms`);
                            }
                            return resultPromise;
                        }
                    }
                }
            }
            // nothing in the cache, continue with de default adapter.
            try {
                if (this.defaultAdapter) {
                    const result = this.defaultAdapter(config);
                    return saveToCache(result).then(result => {
                        if (isRunningLocal(localDebug)) {
                            const end = new Date().getTime();
                            // const url =  axios.getUri(config);
                            console.info(`${config.method} request: ${config.url}: ${end - start} ms`);
                        }
                        return result;
                    }, (error) => {
                        console.error(`Error request: ${config.url}`);
                        throw error;
                    });
                }
                else {
                    throw ('No default adapter');
                }
            }
            catch (err) {
                throw err;
            }
        });
    }
}
exports.FlexsoAxiosCache = FlexsoAxiosCache;
