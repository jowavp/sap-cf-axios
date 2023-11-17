import {
  readDestination,
  IHTTPDestinationConfiguration,
} from "sap-cf-destconn";
import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  Method,
} from "axios";
import NodeCache from "node-cache";
import log from "cf-nodejs-logging-support";
import enhanceConfig from "./configEnhancer";
import objectHash from "object-hash";
import BatchRequest from "./helper/BatchRequest";

declare var exports: any;
const instanceCache = new NodeCache({
  stdTTL: 12 * 60 * 60,
  checkperiod: 60 * 60,
  useClones: false,
});

declare module "axios" {
  export interface AxiosRequestConfig {
    skipCache?: boolean;
    localDebug?: boolean;
    subscribedDomain?: string;
    logger?: any;
  }
}

export interface SapCFAxiosRequestConfig extends AxiosRequestConfig {
  interceptors?: {
    request?: ((config: AxiosRequestConfig<any>) => AxiosRequestConfig<any>)[];
    response?: ((config: AxiosResponse<any>) => AxiosResponse<any>)[];
  };
}

export {
  AxiosInstance,
  AxiosPromise,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from "axios";
export { FlexsoAxiosCache } from "./cache/axiosCache";

export function getSapCfAxiosInstance(
  destination: string,
  instanceConfig?: SapCFAxiosRequestConfig,
  xsrfConfig:
    | Method
    | { method: Method; url: string; params: object } = "options"
) {
  const configHash = objectHash(instanceConfig || "default");
  const cacheKey = `${configHash}_$$_${destination}`;

  if (!instanceCache.has(cacheKey)) {
    instanceCache.set(
      cacheKey,
      SapCfAxios(destination, instanceConfig, xsrfConfig)
    );
  }
  const instance = instanceCache.get<AxiosInstance>(cacheKey);
  if (!instance) {
    const cfErr = {
      message: "unable to get the destination instance",
    };
    throw cfErr;
    //throw 'unable to get the destination instance';
  }
  return instance;
}

export function flushCache() {
  return instanceCache.flushAll();
}

export default function SapCfAxios(
  destination: string,
  instanceConfig?: SapCFAxiosRequestConfig,
  xsrfConfig:
    | Method
    | { method: Method; url: string; params: object } = "options"
) {
  return createInstance(destination, instanceConfig, xsrfConfig);
}
// exports = SapCfAxios;

function createInstance(
  destinationName: string,
  instanceConfig?: SapCFAxiosRequestConfig,
  xsrfConfig:
    | Method
    | { method: Method; url: string; params: object } = "options"
) {
  // keep the interceptors to register on the instance
  const interceptors = instanceConfig?.interceptors;
  if (instanceConfig) delete instanceConfig.interceptors;

  const instance = axios.create(instanceConfig);
  // we will add an interceptor to axios that will take care of the destination configuration
  // we return the destination configuration in the response.
  instance.interceptors.request.use(async (config) => {
    // enhance config object with destination information
    //@ts-ignore
    const logger: ILogger = config.logger || log || console;

    const auth = <string | undefined>(
      (config.headers?.Authorization || config.headers?.authorization)
    );
    try {
      const destination = await readDestination<IHTTPDestinationConfiguration>(
        destinationName,
        auth,
        (instanceConfig || {}).subscribedDomain
      );
      const newConfig = await enhanceConfig(config, destination);

      if (
        newConfig.xsrfHeaderName &&
        newConfig.xsrfHeaderName !== "X-XSRF-TOKEN" &&
        newConfig.headers?.[newConfig.xsrfHeaderName] !== "Fetch"
      ) {
        // handle x-csrf-Token
        const csrfMethod =
          typeof xsrfConfig === "string"
            ? xsrfConfig
            : xsrfConfig.method || "options";
        const csrfUrl =
          typeof xsrfConfig === "string" ? newConfig.url : xsrfConfig.url;
        const csrfParams =
          typeof xsrfConfig === "string" ? {} : xsrfConfig.params;

        var tokenReq: AxiosRequestConfig = {
          url: csrfUrl,
          method: csrfMethod,
          headers: {
            ...(auth && { authorization: auth }),
            [newConfig.xsrfHeaderName]: "Fetch",
          },
          params: csrfParams,
        };
        try {
          const { headers } = await instance(tokenReq);
          const cookies = headers["set-cookie"]; // get cookie from request

          // req.headers = {...req.headers, [req.xsrfHeaderName]: headers[req.xsrfHeaderName]}
          if (headers) {
            if (!newConfig.headers) newConfig.headers = {};
            if (cookies) newConfig.headers.cookie = cookies.join("; ");
            if (headers[newConfig.xsrfHeaderName]) {
              newConfig.headers[newConfig.xsrfHeaderName] =
                headers[newConfig.xsrfHeaderName];
            }
          }
        } catch (err) {
          logAxiosError(err, logger);
          if (err instanceof Error) {
            throw {
              ...err,
              request: "<hidden>",
              "sap-cf-axios": {
                message: "sap-cf-axios: Error while getting token",
                tokenMethod: tokenReq.method,
                tokenUrl: tokenReq.url,
              },
            };
          }
          throw err;
        }
      }

      return newConfig;
    } catch (e) {
      if (e instanceof Error) {
        logger?.error?.("unable to connect to the destination", e);
        throw {
          ...e,
          request: "<hidden>",
          "sap-cf-axios": {
            message: "sap-cf-axios: unable to connect to the destination",
          },
        };
      }
      throw e;
    }
  });

  // if there are interceptors, add them only once to the instance!!!
  if (interceptors) {
    if (interceptors.request) {
      (interceptors.request || []).forEach((interceptorFn) =>
        instance.interceptors.request.use(interceptorFn)
      );
    }
    if (interceptors.response) {
      (interceptors.response || []).forEach((interceptorFn) =>
        instance.interceptors.response.use(interceptorFn)
      );
    }
  }

  return instance;
}

export function logAxiosError(error, logger1: any) {
  const logger = typeof logger1?.error === "function" ? logger1 : log;
  try {
    logger.error("Error", error.message);
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      logger.error(
        JSON.stringify({
          data: error.response.data,
          status: error.response.status,
          headers: error.response.headers,
        })
      );
    } else {
      logger.error(JSON.stringify(error.toJSON()));
    }
  } catch (error1) {
    console.error("Cannot log errors with the given logger", error1);
    console.error(error);
  }
}
