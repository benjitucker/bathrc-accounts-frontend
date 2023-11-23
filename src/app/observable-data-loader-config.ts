import { HttpClient } from '@angular/common/http';
import { UiError } from './shared/ui-error';
import { MonoTypeOperatorFunction } from 'rxjs';
import { delay, map, retryWhen, scan } from 'rxjs/operators';
import {ObservableDataLoader, ObservableDataLoaderOptions} from "./utilities/observable-data-loader";
import {HttpStatusCodes} from "./shared/http-status-codes";

export const DATA_LOADER_CONFIG: ObservableDataLoaderOptions = {
  // Default timeout of 3 minutes, no override.
  // Expire the data after a minute. After which subsequent load calls reload the data.
  expiry: 60 * 1000,
  // Reload the data when it expires, if there are subscribers.
  reloadOnExpire: true,
};

export const DATA_LOADER_CONFIG_SHORT: ObservableDataLoaderOptions = {
  // For single objects, reload every 30s.
  expiry: 30 * 1000,
};

// In page loading retry count
const NET_FAIL_MAX_RETRIES = 10;
const NET_FAIL_RETRY_INTERVAL = 3000;

function networkFailRetryHandler<T>(
  retryInterval: number,
  maxRetries: number,
): MonoTypeOperatorFunction<T> {
  return retryWhen(error =>
    error.pipe(
      scan((retryCount, err) => {
        if (err instanceof Error && err.name === 'UiError') {
          const uiError = err as UiError;
          if (
            (uiError.status === HttpStatusCodes.ConnectionError ||
              uiError.status === HttpStatusCodes.GatewayTimeout ||
              uiError.status === HttpStatusCodes.BadGateway) &&
            retryCount < maxRetries
          ) {
            return retryCount + 1;
          }
        }
        console.error('Retries exhausted');
        throw err;
      }, 0),
      delay(retryInterval),
    ),
  );
}

export function createGetLoader<T = any>(
  httpClient: HttpClient,
  options?: ObservableDataLoaderOptions,
): ObservableDataLoader<T> {
  return new ObservableDataLoader(
    key => {
      return httpClient
        .get<T>(key)
        .pipe(networkFailRetryHandler(NET_FAIL_RETRY_INTERVAL, NET_FAIL_MAX_RETRIES));
    },
    { ...DATA_LOADER_CONFIG, ...(options || {}) },
  );
}

export function createCountLoader(
  httpClient: HttpClient,
  options?: ObservableDataLoaderOptions,
): ObservableDataLoader<number> {
  return new ObservableDataLoader(
    key => {
      return httpClient.head(key, { observe: 'response' }).pipe(
        networkFailRetryHandler(NET_FAIL_RETRY_INTERVAL, NET_FAIL_MAX_RETRIES),
        map(resp => Number(resp.headers.get('x-count'))),
      );
    },
    { ...DATA_LOADER_CONFIG, ...(options || {}) },
  );
}
