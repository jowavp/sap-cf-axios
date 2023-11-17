import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { v4 as uuidv4 } from "uuid";
export { AxiosInstance, AxiosResponse } from "axios";

const maxNumberOfBatchRequests = 40;

async function waitFor(milliSeconds: number): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(true), milliSeconds);
  });
}

export interface IBatchRequestBodyRequest {
  method?: string;
  url: string;
  userid?: string;
  body?: string;
}

interface IBatchRequest {
  contentType: string;
  payload: string;
}

export function chunkArray<T>(
  arr: T[],
  size = maxNumberOfBatchRequests
): T[][] {
  return arr.length > size
    ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)]
    : [arr];
}

export default class BatchRequest {
  batchRequests: IBatchRequest[];
  requests: IBatchRequestBodyRequest[][];

  constructor(
    reqs: IBatchRequestBodyRequest[],
    private logger: any,
    size = maxNumberOfBatchRequests
  ) {
    this.requests = reqs.length > 0 ? chunkArray(reqs, size) : [];
    this.batchRequests = this.generateBatchRequests();
  }

  private generateBatchRequests(): IBatchRequest[] {
    return this.requests.map((reqs) => {
      const batchId = uuidv4();
      // at this point, no changesets are supported, only GET calls.
      const payload = reqs
        .map(
          (r) => `--batch_${batchId}
Content-Type: application/http
Content-Transfer-Encoding:binary

${r.method || "GET"} ${r.url} HTTP/1.1

${r.body || ""}`
        )
        .join("\n");

      return {
        contentType: `multipart/mixed; boundary=batch_${batchId}`,
        payload: `${payload}
--batch_${batchId}--`,
      };
    });
  }

  async doBatchRequests<T>(
    url: string,
    axiosInstance: AxiosInstance, // <T>(req: AxiosRequestConfig) => Promise<AxiosResponse<T>>,
    doWait = true
  ) {
    let wait = Promise.resolve(true);
    let responses: Map<IBatchRequestBodyRequest, T> = new Map();

    for (let i = 0; i < this.batchRequests.length && (await wait); i++) {
      try {
        const result = <AxiosResponse<string>>await axiosInstance({
          method: "POST",
          url,
          data: this.batchRequests[i].payload,
          headers: {
            "Content-Type": this.batchRequests[i].contentType,
          },
        });
        // next call for LMS can be done in 500 mseconds ... start counting
        if (doWait) wait = waitFor(500);

        this.getBatchResponses<T>(result).forEach((resp, idx) => {
          responses.set(this.requests[i][idx], resp);
        });
      } catch (error) {
        throw error;
      }
    }
    return responses;
  }

  async doBatchRequestsParallel<T>(url: string, axiosInstance: AxiosInstance) {
    const requests = this.batchRequests.map((b) =>
      axiosInstance({
        method: "POST",
        url,
        data: b.payload,
        headers: {
          "Content-Type": b.contentType,
        },
      })
    );

    try {
      return (await Promise.all(requests)).reduce((acc, resp, i) => {
        this.getBatchResponses<T>(resp).forEach((resp, idx) => {
          acc.set(this.requests[i][idx], resp);
        });
        return acc;
      }, new Map<IBatchRequestBodyRequest, T>());
    } catch (error) {
      this.logger?.error?.(error);
      throw error;
    }
  }

  private getBatchResponses<T>(resp: AxiosResponse<string>): T[] {
    const match = (resp.headers["content-type"] || "")
      .replace(/\s/g, "")
      .match(/^multipart\/mixed;boundary=(.*)$/i);
    let boundary = match && match.pop();
    if (!boundary) {
      throw `This is not a response of a batch request`;
    }

    return resp.data
      ?.split(`--${boundary}`)
      .filter((t) => t && !t.startsWith("--"))
      .map((t) => t.split(t.includes("\r\n") ? "\r\n" : "\n").filter((t) => t))
      .map((a) => a.slice(-1)[0])
      .map((j) => JSON.parse(j) as T);
  }
}
