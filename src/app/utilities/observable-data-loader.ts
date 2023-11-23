import {
  defer,
  forkJoin,
  interval,
  Observable,
  Observer,
  of,
  Subscription,
  throwError,
  timer,
} from 'rxjs';
import {catchError, shareReplay, switchMap, take} from 'rxjs/operators';
import {DebounceOptions, doDebounce} from './debounce';
import {createLog} from "./debug-helper";

const warnLog = createLog('angular-common', 'observable-data-loader', 'warn');

export type LoaderFunction<T> = (key: string) => Observable<T>;

export interface ObservableDataLoaderOptionsInternal {
  /**
   * Time after the last unsubscribe() to clear the cache.
   */
  timeout: number;
  /**
   * Time after which the next load() call will reload the cache.
   */
  expiry?: number;
  /**
   * If set to true will trigger a reload when the data expires.
   */
  reloadOnExpire: boolean;
  /**
   * If set will emit 'undefined' at the start of a reload operation.
   * Useful if you want to trigger a loading animation on reload.
   */
  broadcastUndefinedOnReload: boolean;
  /**
   * If true, ObservableDataLoader.reloadAllInstances can be used to
   * externally call. Note that the code will only stop tracking these
   * if you call clearTrackedInstances so creating dataLoaders dynamically
   * will lead to memory leaks (i.e. trackedInstances will keep growing and
   * dataLoaders won't be garbage collected).
   */
  tracked: boolean;
  /**
   * Logs a warning if more observers subscribe to a specific query than is required.
   */
  leakThreshold: number;
  /**
   * Provides a set of options to configure debouncing on new args.
   */
  debounce?: DebounceOptions;
}

export type ObservableDataLoaderOptions = Partial<ObservableDataLoaderOptionsInternal>;

// If something has more than 10 subscribers then show a warning.
const DEFAULT_LEAK_THRESHOLD = 10;

// Some default options that do caching.
const DEFAULT_OPTIONS: ObservableDataLoaderOptionsInternal = {
  // 3 minute timeout. This is an arbitrary default that works well on Itron.
  timeout: 3 * 60 * 1000,
  reloadOnExpire: false,
  broadcastUndefinedOnReload: false,
  tracked: true,
  leakThreshold: DEFAULT_LEAK_THRESHOLD,
};

interface ReplayData<T> {
  // The last time data was received from a request key.
  loadedAt?: number;
  // The observable returned to the client. Tracks the number of subscribers, manages refreshing and timeouts, and cleans up when everybody unsubscribes.
  replay?: Observable<T>;
  // The internal subscription to observable provided by the user ( loader(key) )
  subscription?: Subscription;
  // Whether or not the observable is loading currently
  loading?: boolean;

  // A timer that deletes the cached data and cleans up the data after ObservableDataLoaderOptions.timeout. Is created when everyone unsubscribes.
  expiryTimer?: Subscription;
  // A timer that periodically reloads the cached data every ObservableDataLoaderOptions.expiry.
  dataReloadTimer?: Subscription;
  // Internal flag used to mark data for reloading as soon as someone subscribes to it.
  expired?: boolean;

  observers: Observer<T>[];
  value?: T;
}

// This class is an equivalent of https://github.com/graphql/dataloader
// It allows multiple requests to the same resource to be de-duplicated.
// Useful for when a header and sub-tabs need data.
// This variant also allows expiring a request after a max age.
// Below is a list of nuances that define the behaviour of this class:
// * load() calls to the same key will be de-duplicated.
// * By default as per DataLoader, data does not expire,
// * If options.expiry is set subsequent load() calls will re-fetch the data if it has expired.
// * After reload() has been started subsequent load() calls wait for the new value.
// * reload() will always return the reloaded value, not the cached one.
// * The class caches the most recently fetched value.
// * If there are no subscribers to a key then reload() will return Observable<undefined>.
//   Reload will then be performed on the next subscription.
// * If there are no subscribers for options.timeout then the instance and cached value
//   will be deleted from the map. Reload calls will return Observable<undefined>.
// * If options.expiry AND options.reloadOnExpire then when the data expires it will be
//   automatically reloaded and broadcast to any subscribers.
// * If load() is called during an auto-reload it will block until the new value is received.
// * If reload() is called will options.reloadOnExpire is set then the expiry timer is reset.
// * By default this class will STATICALLY track all INSTANCES of itself. So every time the
//   the constructor is called an instance will continue to exist until the page is navigated
//   away from. This allows you to statically call ObservableDataLoader.reloadAll() to reload
//   every key of every created ObservableDataLoader.
// * Each INSTANCE of ObservableDataLoader tracks multiple keys. Keys are not statically tracked
//   and have sensible lifetimes are described above. Each load() call returns an object that
//   follows normal JS lifetimes, they are NOT statically tracked and may be discarded and created
//   as much as necessary.
export class ObservableDataLoader<T> {
  private static trackedInstances: ObservableDataLoader<unknown>[] = [];

  // @dynamic
  // Lambda functions are not supported in static functions and lead to compiler error
  // Flag above suppress angular from firing that error
  // https://github.com/ng-packagr/ng-packagr/issues/696
  public static reloadAllInstances(): Observable<unknown[][]> {
    const instancesObservables = ObservableDataLoader.trackedInstances.map((instance) =>
      instance.reloadAll(),
    );
    // This check is required as empty array never completes
    // (as there is nothing to complete)
    // and code gets stuck inside forkJoin
    // The same rule applies to reloadAll() and reloadAllWhere()
    if (instancesObservables.length) {
      return forkJoin(instancesObservables);
    }
    return of([[]]);
  }

  public static clearTrackedInstances(): void {
    ObservableDataLoader.trackedInstances = [];
  }

  private map: Map<string, ReplayData<T>>;
  private loader: LoaderFunction<T>;
  private options: ObservableDataLoaderOptionsInternal;

  public constructor(loader: LoaderFunction<T>, options?: ObservableDataLoaderOptions) {
    this.loader = loader;
    this.options = options ? {...DEFAULT_OPTIONS, ...options} : DEFAULT_OPTIONS;
    this.map = new Map<string, ReplayData<T>>();

    if (this.options.tracked) {
      ObservableDataLoader.trackedInstances.push(this as ObservableDataLoader<unknown>);
    }
  }

  public reloadAll(): Observable<(T | undefined)[]> {
    const keys = Array.from(this.map.keys());
    if (keys.length) {
      return forkJoin(keys.map((key) => this.reload(key)));
    }
    return of([]);
  }

  public reloadAllWhere(matcher: (key: string) => boolean): Observable<(T | undefined)[]> {
    const matchingKeys = Array.from(this.map.keys()).filter((key) => matcher(key));
    const keysObservables = matchingKeys.map((existingKey) => this.reload(existingKey));
    if (keysObservables.length) {
      return forkJoin(keysObservables);
    }
    return of([]);
  }

  public reload(key: string): Observable<T | undefined> {
    const existing = this.map.get(key);
    if (existing) {
      // We only want to start the reload timer if someone is subscribed as it shouldn't be running
      // when no one is. It will be reset when the next person subscribes instead.
      if (existing.observers.length) {
        this.resetDataReload(key);
        // When reloading, the observable should complete once the reload has finished.
        // If the thing that is trying to be reloaded errors, the reload observable should not error
        // as the purpose of the return value is to inform you that the reload has finished, rather
        // than to get the value.
        return this.reloadRawData(key).pipe(
          catchError(() => of(undefined)),
          take(1),
        );
      } else {
        // We only need to reload immediately if there are members subscribed to the data.
        // otherwise we can mark the data as expired to allow for lazy reloading.
        // For this form we should also reset the the entire observable chain because we
        // no longer care about the cached value and all auto-reloading is cancelled.
        this.delete(key);
        return of(undefined);
      }
    }
    return of(undefined);
  }

  public load(key: string, reload = false): Observable<T> {
    // Defer creates an observable that runs loadInternal any time that someone subscribes to it.
    // This is necessary because loadInternal includes state dependent code outside of the returned
    // observable that should run any time someone tries to load a value, which would not happen should
    // they subscribe to the result of a single loadInternal() call multiple times. This includes code
    // to check for data expiry, and to check if the map entry still exists.
    return defer(() => this.loadInternal(key, reload));
  }

  private loadInternal(key: string, reload: boolean): Observable<T> {
    const existing = this.map.get(key);
    if (existing?.replay) {
      if (
        reload ||
        // If the data has loaded in the past, isn't currently reloading and has expired, then force a reload.
        (this.options.expiry !== undefined &&
          existing.loadedAt !== undefined &&
          !existing.loading &&
          Date.now() > existing.loadedAt + this.options.expiry)
      ) {
        existing.expired = true;
      } else if (!existing.dataReloadTimer) {
        // If the data hasn't expired but all subscribers previously unsubscribed
        // then reset the reload timer to trigger the future reload.
        this.resetDataReload(key);
      }
      // Make sure to always return existing.replay instead of the data.value replaySubject (that is returned by reloadRawData) itself
      // as existing.replay includes logic to count the number of people subscribed and to do cleanup.
      return existing.replay;
    }

    const data: ReplayData<T> = {
      observers: [],
    };

    // If no one has subscribed to the value yet, (or everyone unsubscribed, the timeout ran up and the data was cleaned up)
    // Initialize the replay observable that gets returned to the user.
    // What this does:
    //  - keeps track of how many subscribers there are by pushing/popping them on subscribe/unsubscribe
    //  - loads the raw data from the endpoint if not yet loaded.
    //  - when all users have unsubscribed, wait until the timeout period has finished and then clean up the cached data.
    // Note that this callback is called every time a user subscribes, not on creation.
    data.replay = new Observable((observer: Observer<T>) => {
      data.observers.push(observer);

      if (data.observers.length > this.options.leakThreshold) {
        warnLog('Possible subscription leak: key: %o, refCount: %d', key, data.observers.length);
      }

      // On subscription cancel the expiry timer if it exists.
      // This is the timer that marks this instance for destruction.
      if (data.expiryTimer) {
        data.expiryTimer.unsubscribe();
        data.expiryTimer = undefined;
      }

      // If it's not loading and has either never loaded or expired, then reload.
      if (!data.loading && (data.loadedAt === undefined || data.expired)) {
        this.resetDataReload(key);
        // eslint-disable-next-line rxjs/no-ignored-observable
        this.reloadRawData(key);
        // For this branch the reloadRawData takes charge of emitting the value to
        // the observer.
      } else if (data.loadedAt !== undefined) {
        // If a reload is not expired then broadcast the cached value.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        observer.next(data.value!);
      }
      // Otherwise if none of the above is true it's currently loading and will be broadcast
      // when its done fetching.

      // When a subscriber unsubscribes from data.replay (observableDataLoader.load), this callback is called.
      return (): void => {
        // Remove this subscription.
        const index = data.observers.indexOf(observer);
        if (index >= 0) {
          data.observers.splice(index, 1);
        }
        // If everything's unsubscribed but there's still a HTTP request,
        // then cancel it or clean it up.
        if (data.observers.length === 0) {
          // Stop reloading while nobody's subscribed.
          if (data.dataReloadTimer) {
            data.dataReloadTimer.unsubscribe();
            data.dataReloadTimer = undefined;
          }

          // begin the expiry timer
          data.expiryTimer = timer(this.options.timeout).subscribe(() => this.delete(key));
        }
      };
    });

    // Store the replay observable and count etc. in the map with the key.
    this.map.set(key, data);

    return data.replay;
  }

  public delete(key: string): void {
    // Make sure to kick everyone off and clean up any subscriptions before the key is deleted
    const existing = this.map.get(key);
    if (existing) {
      // Must clone it because if they unsubscribe as soon as they complete
      // then the observers array will be modified.
      for (const observer of [...existing.observers]) {
        observer.complete();
      }
      existing.subscription?.unsubscribe();
      existing.subscription = undefined;
      existing.dataReloadTimer?.unsubscribe();
      existing.dataReloadTimer = undefined;
      existing.expiryTimer?.unsubscribe();
      existing.expiryTimer = undefined;
    }
    this.map.delete(key);
  }

  private broadcastValue(existing: ReplayData<T>): void {
    // If there's no data loaded then don't broadcast.
    if (existing.loadedAt === undefined) {
      return;
    }
    // If loading then don't broadcast. Wait until loading is done.
    if (existing.loading) {
      return;
    }
    // If expired, then don't broadcast. Wait for reload.
    if (existing.expired) {
      return;
    }
    // Must clone it because if they unsubscribe as soon as they receive a value
    // then the observers array will be modified.
    for (const observer of [...existing.observers]) {
      // We're saying here that if it's loaded then value has been set.
      // Value however may be set to undefined which is valid.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      observer.next(existing.value!);
    }
  }

  private broadcastError(existing: ReplayData<T>, error: Error): void {
    // Must clone it because if they unsubscribe as soon as they receive a value
    // then the observers array will be modified.
    for (const observer of [...existing.observers]) {
      observer.error(error);
    }
  }

  // Initialises/Resets the reload timer, that re-fetches the raw data from the endpoint every
  // this.options.expiry milliseconds.
  private resetDataReload(key: string): void {
    if (!this.options.reloadOnExpire) {
      return;
    }
    if (this.options.expiry === undefined) {
      throw new Error("Can't auto-reload when expiry is undefined");
    }

    const existing = this.map.get(key);
    if (!existing) {
      throw new Error(`Can't setup auto-reload. Key doesn't exist: ${key}`);
    }
    if (existing.dataReloadTimer) {
      existing.dataReloadTimer.unsubscribe();
    }

    // We want it to refresh every expiry period, so use interval (or timer(this.options.expiry, this.options.expiry))
    existing.dataReloadTimer = interval(this.options.expiry).subscribe(() => {
      // Only auto-reload if not already loading.
      if (!existing.loading) {
        // eslint-disable-next-line rxjs/no-ignored-observable
        this.reloadRawData(key);
      }
    });
  }

  // Subscribes to the user provided observable retured by loader(key)
  // When it updates, update the replay subject that is used to cache the data and all external users are subscribed to through data.replay.
  // If the subscription already exists, delete it and reset it.
  private reloadRawData(key: string): Observable<T> {
    const existing = this.map.get(key);
    if (!existing) {
      throw new Error(`Can't reload. Key doesn't exist: ${key}`);
    }

    // If already reloading then cancel the original.
    if (existing.loading) {
      existing.subscription?.unsubscribe();
    }

    if (this.options.broadcastUndefinedOnReload) {
      existing.value = undefined;
      this.broadcastValue(existing);
    }

    const loaderObservable = doDebounce(this.options.debounce, this.loader(key)).pipe(
      take(1),
      // For the same reason as above also delay errors by a tick.
      catchError((err: Error) => {
        return (of<T | undefined>(undefined) as Observable<T>).pipe(
          switchMap(() => throwError(() => err)),
        );
      }),
      // Our eslint rules force us to specify a shareReplay config with refCount for clarity
      // since the default functionality of shareReplay changed in version 5.5.0-beta.4
      shareReplay({
        bufferSize: 1,
        // Whether to unsubscribe from loader when no one is subscribing to us
        refCount: true,
      }),
    );

    existing.loading = true;
    existing.subscription = loaderObservable.subscribe({
      next: (res) => {
        existing.loadedAt = Date.now();
        // Mark as no longer loading. Auto-unsubscribes self because of take(1).
        existing.loading = false;
        // No longer expired. Will still be recalculated based off of loadedAt.
        existing.expired = false;
        existing.value = res;
        this.broadcastValue(existing);
      },
      error: (err: Error) => {
        // Mark as no longer loading. Auto-unsubscribes self because of take(1).
        existing.loading = false;
        // Don't cache error results. Causes infinite loops with async pipes.
        existing.expired = true;
        this.broadcastError(existing, err);
      },
    });

    return loaderObservable;
  }
}
