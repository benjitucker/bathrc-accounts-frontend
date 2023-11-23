/*
*  Protractor support is deprecated in Angular.
*  Protractor is used in this example for compatibility with Angular documentation tools.
*/

import {bootstrapApplication, provideProtractorTestingSupport} from '@angular/platform-browser';
import {AppComponent} from './app/app.component';
import {provideRouter} from '@angular/router';
import routeConfig from './app/routes';
import {AuthService} from "./app/auth.service";
import {HTTP_INTERCEPTORS, HttpClientModule} from "@angular/common/http";
import {importProvidersFrom} from "@angular/core";
import {TokenInterceptor} from "./app/token.interceptor";

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(HttpClientModule),
    AuthService,
    provideProtractorTestingSupport(),
    provideRouter(routeConfig),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: TokenInterceptor,
      multi: true
    }],
}).catch(err => console.error(err));

