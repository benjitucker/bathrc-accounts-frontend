import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {HousingLocation} from "./housinglocation";
import {Observable} from "rxjs";
import {Todo} from "./todo";
import {ObservableDataLoader} from "./utilities/observable-data-loader";
import {createGetLoader, DATA_LOADER_CONFIG_SHORT} from "./observable-data-loader-config";
import {appendParams} from "./utilities/param-utils";
import {environment} from "../environments/environment";

const TODO_ROUTE = '/todo';
const HOUSING_LOCATIONS_ROUTE = '/housing_location';

@Injectable({
  providedIn: 'root'
})
export class HousingService {
  readonly baseUrl = 'https://angular.io/assets/images/tutorials/faa';

  private readonly httpClient: HttpClient;
  private getLoader: ObservableDataLoader<Todo[]>;
  private getHousingLocationListLoader: ObservableDataLoader<HousingLocation[]>;
  private getSingleLoader: ObservableDataLoader<any>;

  public constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
    this.getLoader = createGetLoader(this.httpClient);
    this.getHousingLocationListLoader = createGetLoader(this.httpClient);
    this.getSingleLoader = createGetLoader(this.httpClient, DATA_LOADER_CONFIG_SHORT);
  }

  /*
  housingLocationList: HousingLocation[] = [
    {
      id: 0,
      name: 'Acme Fresh Start Housing',
      city: 'Chicago',
      state: 'IL',
      photo: `${this.baseUrl}/bernard-hermant-CLKGGwIBTaY-unsplash.jpg`,
      availableUnits: 4,
      wifi: true,
      laundry: true
    },
    {
      id: 1,
      name: 'A113 Transitional Housing',
      city: 'Santa Monica',
      state: 'CA',
      photo: `${this.baseUrl}/brandon-griggs-wR11KBaB86U-unsplash.jpg`,
      availableUnits: 0,
      wifi: false,
      laundry: true
    },
    {
      id: 2,
      name: 'Warm Beds Housing Support',
      city: 'Juneau',
      state: 'AK',
      photo: `${this.baseUrl}/i-do-nothing-but-love-lAyXdl1-Wmc-unsplash.jpg`,
      availableUnits: 1,
      wifi: false,
      laundry: false
    },
    {
      id: 3,
      name: 'Homesteady Housing',
      city: 'Chicago',
      state: 'IL',
      photo: `${this.baseUrl}/ian-macdonald-W8z6aiwfi1E-unsplash.jpg`,
      availableUnits: 1,
      wifi: true,
      laundry: false
    },
    {
      id: 4,
      name: 'Happy Homes Group',
      city: 'Gary',
      state: 'IN',
      photo: `${this.baseUrl}/krzysztof-hepner-978RAXoXnH4-unsplash.jpg`,
      availableUnits: 1,
      wifi: true,
      laundry: false
    },
    {
      id: 5,
      name: 'Hopeful Apartment Group',
      city: 'Oakland',
      state: 'CA',
      photo: `${this.baseUrl}/r-architecture-JvQ0Q5IkeMM-unsplash.jpg`,
      availableUnits: 2,
      wifi: true,
      laundry: true
    },
    {
      id: 6,
      name: 'Seriously Safe Towns',
      city: 'Oakland',
      state: 'CA',
      photo: `${this.baseUrl}/phil-hearing-IYfp2Ixe9nM-unsplash.jpg`,
      availableUnits: 5,
      wifi: true,
      laundry: true
    },
    {
      id: 7,
      name: 'Hopeful Housing Solutions',
      city: 'Oakland',
      state: 'CA',
      photo: `${this.baseUrl}/r-architecture-GGupkreKwxA-unsplash.jpg`,
      availableUnits: 2,
      wifi: true,
      laundry: true
    },
    {
      id: 8,
      name: 'Seriously Safe Towns',
      city: 'Oakland',
      state: 'CA',
      photo: `${this.baseUrl}/saru-robert-9rP3mxf8qWI-unsplash.jpg`,
      availableUnits: 10,
      wifi: false,
      laundry: false
    },
    {
      id: 9,
      name: 'Capital Safe Towns',
      city: 'Portland',
      state: 'OR',
      photo: `${this.baseUrl}/webaliser-_TPTXZd9mOo-unsplash.jpg`,
      availableUnits: 6,
      wifi: true,
      laundry: true
    }
  ];

   */

  /*
  getAllHousingLocations(): HousingLocation[] {
    return this.housingLocationList;
  }
   */

  /*
  getHousingLocationById(id: number): HousingLocation | undefined {
    return this.housingLocationList.find(housingLocation => housingLocation.id === id);
  }
   */

  readonly url = 'http://localhost:13000/todo';

  async getAllHousingLocations(): Promise<HousingLocation[]> {
    const data = await fetch(this.url);
    return await data.json() ?? [];
  }

  /*
async getHousingLocationById(id: number): Promise<HousingLocation | undefined> {

  const data = await fetch(`${this.url}/${id}`);
  return await data.json() ?? {};
  }
   */

  submitApplication(firstName: string, lastName: string, email: string) {
    console.log(`Homes application received: firstName: ${firstName}, lastName: ${lastName}, email: ${email}.`);
  }

  getTodoList(): Observable<Todo[]> {
    return this.getLoader.load(appendParams(environment.gateway + TODO_ROUTE));
  }

  getHousingLocationList(): Observable<HousingLocation[]> {
    return this.getHousingLocationListLoader.load(appendParams(environment.gateway + HOUSING_LOCATIONS_ROUTE));
  }

  getHousingLocationById(id: number): Observable<HousingLocation> {
    return this.getSingleLoader.load(appendParams(environment.gateway + HOUSING_LOCATIONS_ROUTE + "/" + id));
  }

}
