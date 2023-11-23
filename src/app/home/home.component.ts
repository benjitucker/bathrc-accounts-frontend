import {Component, inject, OnDestroy, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {HousingLocationComponent} from '../housing-location/housing-location.component';
import {HousingLocation} from '../housinglocation';
import {HousingService} from "../housing.service";
import {RegularTodo} from "../regular-todo";
import {Todo} from "../todo";
import {combineLatest, Subscription, throwError} from "rxjs";
import deepEqual from 'deep-equal';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    HousingLocationComponent
  ],
  template: `
    <section>
      <form>
        <input type="text" placeholder="Filter by city" #filter>
        <button class="primary" type="button" (click)="filterResults(filter.value)">Search</button>
      </form>
    </section>
    <section class="results">
      <app-housing-location *ngFor="let housingLocation of filteredLocationList"
                            [housingLocation]="housingLocation">
      </app-housing-location>
    </section>
  `,
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription[] = [];
  housingLocationList: HousingLocation[] = [];
  housingService: HousingService = inject(HousingService);
  filteredLocationList: HousingLocation[] = [];
  private allTodos: Todo[] = [];
  public error?: string;
  private filterCity?: string;

  constructor() {
/*    this.getAllTodo()
    this.getAllHousingLocations()

 */
    /*
    this.housingService.getAllHousingLocations().then((housingLocationList: HousingLocation[]) => {
      this.housingLocationList = housingLocationList;
      this.filteredLocationList = housingLocationList;
    });

     */
  }

  getAllTodo() {
    this.housingService.getTodoList().subscribe(res => {
      this.allTodos = res;
    });
  }

  getAllHousingLocations() {
    this.housingService.getHousingLocationList().subscribe(res => {
      this.housingLocationList = res;
    });
  }

  filterResults(text: string) {
    this.filterCity = text
    if (!text) {
      this.filteredLocationList = this.housingLocationList;
    }

    this.filteredLocationList = this.housingLocationList.filter(
      housingLocation => housingLocation?.city.toLowerCase().includes(text.toLowerCase())
    );
  }

  ngOnDestroy(): void {
    for (const subscription of this.subscriptions) {
      subscription.unsubscribe();
    }
    this.subscriptions = [];
  }

  ngOnInit(): void {
    this.subscriptions.push(
      combineLatest([
        this.housingService.getTodoList(),
        this.housingService.getHousingLocationList(),
      ])
 //       .pipe(take(1))
        .subscribe(
          ([todo, housingLocationList]) => {
            if (!deepEqual(this.housingLocationList, housingLocationList)) {
              this.housingLocationList = housingLocationList;
              if (this.filterCity != undefined) {
                this.filterResults(this.filterCity);
              } else {
                this.filteredLocationList = this.housingLocationList;
              }
            }
            this.allTodos = todo;
            if (!todo) {
              this.error = `Error retrieving todo list`;
              throwError(this.error);
            }
          },
          error => {
            this.error = `Error retrieving artifact devices: ${error}`;
            throwError(this.error);
          },
        ),
    );
  }
}
