import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type { HYRequestConfig } from './type';
import { ElNotification } from 'element-plus';

const DEFAULT_RETRY_CONFIG = {
  retries: 20,
  retryDelay: 8000, // 8 seconds
};

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryRequest<T>(fn: () => Promise<T>, retries: number, retryDelay: number): Promise<T> {
  let retryCount = 0;
  while (retryCount < retries) {
    try {
      return await fn();
    } catch (err: any) {
      if (err.response && [429, 500, 503].includes(err.response.status)) {
        retryCount++;
        const delay = retryDelay + (retryCount - 1) * 1000; // 线性退避时间，每次增加1秒
        ElNotification({
          title: 'Hold on...',
          message: `Request failed with status ${err.response.status}. Retrying... Attempt ${retryCount}`,
          type: 'warning',
        });
        await sleep(delay);
        if (retryCount >= retries) {
          ElNotification({
            title: 'Request Failed',
            message: `Request failed after ${retryCount} attempts`,
            type: 'error',
          });
          return Promise.reject(err);
        }
      } else {
        return Promise.reject(err);
      }
    }
  }
  throw new Error('Max retries reached');
}

class HYRequest {
  instance: AxiosInstance;
  retryConfig: { retries: number; retryDelay: number };

  constructor(config: HYRequestConfig) {
    this.instance = axios.create(config);
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config.retryConfig };

    this.setupInterceptors(config);
  }

  private setupInterceptors(config: HYRequestConfig) {
    this.instance.interceptors.request.use(
      (config) => config,
      (err) => Promise.reject(err)
    );

    this.instance.interceptors.response.use(
      (res) => res.data,
      (err) => Promise.reject(err)
    );

    if (config.interceptors) {
      this.instance.interceptors.request.use(
        config.interceptors.requestSuccessFn,
        config.interceptors.requestFailureFn
      );
      this.instance.interceptors.response.use(
        config.interceptors.responseSuccessFn,
        config.interceptors.responseFailureFn
      );
    }
  }

  async request<T = any>(config: HYRequestConfig<T>): Promise<T> {
    const requestFn = () => {
      if (config.interceptors?.requestSuccessFn) {
        config = config.interceptors.requestSuccessFn(config);
      }

      return new Promise<T>((resolve, reject) => {
        this.instance
          .request<any, T>(config)
          .then((res) => {
            if (config.interceptors?.responseSuccessFn) {
              res = config.interceptors.responseSuccessFn(res);
            }
            resolve(res);
          })
          .catch((err) => {
            reject(err);
          });
      });
    };

    return retryRequest(requestFn, this.retryConfig.retries, this.retryConfig.retryDelay);
  }

  get<T = any>(config: HYRequestConfig<T>) {
    return this.request({ ...config, method: 'GET' });
  }

  post<T = any>(config: HYRequestConfig<T>) {
    return this.request({ ...config, method: 'POST' });
  }

  delete<T = any>(config: HYRequestConfig<T>) {
    return this.request({ ...config, method: 'DELETE' });
  }

  patch<T = any>(config: HYRequestConfig<T>) {
    return this.request({ ...config, method: 'PATCH' });
  }
}

export default HYRequest;
