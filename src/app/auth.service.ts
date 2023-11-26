/*import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor() { }
}

 */
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';

/* note needed to run: npm i --save-dev @types/auth0-js */
import * as auth0 from 'auth0-js';
import {Auth0DecodedHash} from "auth0-js";

(window as any).global = window;

@Injectable()
export class AuthService {
  constructor(public router: Router)  {}

  access_token: string | undefined;
  id_token: string | undefined;
  expires_at: string | undefined;

  auth0 = new auth0.WebAuth({
    clientID: environment.clientId,
    domain: environment.domain,
    responseType: 'token id_token',
    audience: environment.audience,
    redirectUri: window.location.origin + '/bathrc/ui/callback',
//    redirectUri: environment.callback,
    scope: 'openid'
  });

  public login(): void {
    this.auth0.authorize();
  }

  public handleAuthentication(): void {
    this.auth0.parseHash((err, authResult) => {
      if (err) console.log(err);
      if (!err && authResult && authResult.accessToken && authResult.idToken) {
        window.location.hash = '';
        this.setSession(authResult);
      }
      this.router.navigate(['/home']);
    });
  }

  private setSession(authResult : Auth0DecodedHash): void {
    // Set the time that the Access Token will expire at
    const expiresAt = JSON.stringify((authResult.expiresIn ? authResult.expiresIn * 1000 : 1000) + new Date().getTime());
    this.access_token = authResult.accessToken;
    this.id_token = authResult.idToken;
    this.expires_at = expiresAt;
  }

  public logout(): void {
    this.access_token = undefined;
    this.id_token = undefined;
    this.expires_at = undefined;
    // Go back to the home route
    this.router.navigate(['/']);
  }

  public isAuthenticated(): boolean {
    // Check whether the current time is past the
    // Access Token's expiry time
    const expiresAt = JSON.parse(this.expires_at || '{}');
    return new Date().getTime() < expiresAt;
  }

  public createAuthHeaderValue(): string {
    return 'Bearer ' + this.access_token;
  }
}
