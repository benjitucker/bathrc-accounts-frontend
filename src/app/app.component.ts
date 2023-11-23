import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';
import {HomeComponent} from './home/home.component';
import {RouterModule} from '@angular/router';
import {AuthService} from "./auth.service";
import {HttpClientModule} from '@angular/common/http';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HomeComponent,
    RouterModule,
    HttpClientModule,
  ],
  /*
  template: `
    <main>
      <header class="brand-name">
        <img class="brand-logo" src="/assets/logo.svg" alt="logo" aria-hidden="true">
      </header>
      <section class="content">
        <router-outlet></router-outlet>
      </section>
    </main>
  `,
   */
  template: `
    <main>
      <nav class="navbar navbar-default">
        <div class="container-fluid">
          <div class="navbar-header">
            <a class="navbar-brand" href="#">Auth0 - Angular</a>

            <button
              class="btn btn-light btn-margin"
              routerLink="/">
              Home
            </button>

            <button
              class="btn btn-light btn-margin"
              *ngIf="!auth.isAuthenticated()"
              (click)="auth.login()">
              Log In
            </button>

            <button
              class="btn btn-light btn-margin "
              *ngIf="auth.isAuthenticated()"
              (click)="auth.logout()">
              Log Out
            </button>
          </div>
        </div>
      </nav>

      <div class="container-fluid">
        <div class="row">
          <div class="col-sm">
            <router-outlet></router-outlet>
          </div>
        </div>
      </div>
    </main>
  `,
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  title = 'homes';

  constructor(public auth: AuthService) {
  }
}
