import {HttpParams} from '@angular/common/http';
import {ActivatedRouteSnapshot} from '@angular/router';
import {createLog} from './debug-helper';

const warnLog = createLog('angular-common', 'param-utils', 'warn');

type ParamBaseTypes = string | number | boolean;

interface ParamType {
  key?: string;
  value: ParamBaseTypes;
}

// Note: We have to use any here because https://github.com/microsoft/TypeScript/issues/15300 - otherwise we'd
// have to change every interface we use to extend Record<string, unknown>.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ParamsDict = Record<string, any>;

export function getParam(snapshot: ActivatedRouteSnapshot, name: string): string | undefined {
  let level: ActivatedRouteSnapshot | null = snapshot;
  while (level) {
    if (level.params[name]) {
      return level.params[name] as string;
    }
    level = level.parent;
  }

  warnLog('Failed to find route parameter: %o', name);
  return undefined;
}

export function getParamError(snapshot: ActivatedRouteSnapshot, name: string): string {
  const param = getParam(snapshot, name);
  if (!param) {
    throw new Error(`Failed to find route parameter: ${name}`);
  }
  return param;
}

export function isRootRoute(base: string, route: string): boolean {
  // If there's no ? it checks against the root route.
  // If it's a sub-route then it can't be equal.
  // If it has query parameters, they're discarded.
  return route.split('?')[0] === base;
}

export function flattenParams(
  data: ParamsDict | ParamBaseTypes | ParamBaseTypes[] | null | undefined,
): ParamType[] {
  if (data === null || data === undefined) {
    return [];
  }
  if (typeof data === 'object') {
    if (data instanceof Date) {
      return [{value: data.toISOString()}];
    } else if (Array.isArray(data)) {
      const flattenedArrayItems: ParamType[] = [];
      for (const arrayItem of data as ParamType[]) {
        flattenedArrayItems.push(...flattenParams(arrayItem));
      }
      return flattenedArrayItems;
    } else {
      const flattenedParams: ParamType[] = [];
      for (const [key, value] of Object.entries(data)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        for (const result of flattenParams(value)) {
          if (result.key) {
            flattenedParams.push({key: `${key}.${result.key}`, value: result.value});
          } else {
            flattenedParams.push({key, value: result.value});
          }
        }
      }
      return flattenedParams;
    }
  } else {
    return [{value: data}];
  }
}

export function buildParams(data?: ParamsDict, count = false): HttpParams {
  let params = new HttpParams();
  if (!data) {
    return params;
  }

  for (const param of flattenParams(data)) {
    if (!param.key) {
      continue;
    }
    if (count) {
      switch (param.key) {
        case 'page': // Fallthough
        case 'size':
          continue;
        default:
          break;
      }
    }
    params = params.append(param.key, String(param.value));
  }

  return params;
}

export function appendParams(url: string, data?: ParamsDict, count = false): string {
  const params = buildParams(data, count).toString();
  if (params) {
    return `${url}?${params}`;
  }

  return url;
}
