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
      const response = await fn();
      if (typeof response === 'object' && response !== null && 'err_code' in response && response.err_code === 40004) {
        throw new Error('40004');
      }
      return response;
    } catch (err: any) {
      retryCount++;
      if (err.message === '40004') {
        continue;
      } else if (err.response && [429, 500, 503].includes(err.response.status)) {
        // Apply delay and show notification for other errors
        const delay = retryDelay + (retryCount - 1) * 1000; // Linear backoff time, increase by 1 second each time
        ElNotification({
          title: 'Hold on...',
          message: `Request failed with status ${err.response.status}. Retrying... Attempt ${retryCount}`,
          type: 'warning',
          duration: 3000,
        });
        await sleep(delay);
      } else {
        return Promise.reject(err);
      }

      if (retryCount >= retries) {
        ElNotification({
          title: 'Request Failed',
          message: `Request failed after ${retryCount} attempts`,
          type: 'error',
        });
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
