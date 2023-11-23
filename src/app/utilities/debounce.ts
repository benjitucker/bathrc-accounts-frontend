/**
 * A collection of methods to do with debouncing for use in the paginated list and device list.
 */
import {combineLatest, map, Observable, of, switchMap, timer} from 'rxjs';

export interface DebounceOptions {
  /**
   * Function using which doDebounce will delay the passed in observable
   */
  delay: () => Observable<unknown>;
  /**
   * If the operation + delay takes less than this time the code will delay it further until it reaches this amount of time
   */
  minLoadTime?: number;
}

export function doDebounce<T>(
  debounceOpts: DebounceOptions | undefined,
  observable: Observable<T>,
): Observable<T> {
  return debounceOpts
    ? combineLatest([
      debounceOpts.delay().pipe(switchMap(() => observable)),
      debounceOpts.minLoadTime ? timer(debounceOpts.minLoadTime) : of(undefined),
    ]).pipe(map(([data]) => data))
    : observable;
}

/**
 * Provides a delay based on when the last load was attempted. Useful to debounce across multiple subscriptions
 * rather than debouncing values in a single one.
 */
export function debounceSuccessive(): (delayTime?: number) => Observable<unknown> {
  let lastLoadAttempted: number | undefined;

  return (delayTime?: number) => {
    const delayMs =
      delayTime !== undefined && lastLoadAttempted
        ? Math.max(0, delayTime - (Date.now() - lastLoadAttempted))
        : 0;

    // Always update lastLoadAttempted. If the user is scrolling through
    // lots of values we don't want it attempting a fetch every 300ms.
    lastLoadAttempted = Date.now();

    return delayMs ? timer(delayMs) : of(undefined);
  };
}
