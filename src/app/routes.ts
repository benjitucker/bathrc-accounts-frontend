import {Routes} from '@angular/router';
import {HomeComponent} from './home/home.component';
import {DetailsComponent} from './details/details.component';
import {CallbackComponent} from "./callback/callback.component";

const routeConfig: Routes = [
  {
    path: '',
    component: HomeComponent,
    title: 'Home page (TODO) Logout page??'
  },
  {
    path: 'home',
    component: HomeComponent,
    title: 'Home page'
  },
  {
    path: 'details/:id',
    component: DetailsComponent,
    title: 'Home details'
  },
  {
    path: 'callback',
    component: CallbackComponent
  }
];

export default routeConfig;
