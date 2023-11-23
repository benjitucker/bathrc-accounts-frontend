import {Todo} from "./todo";

export class RegularTodo implements Todo{
  get message(): string {
    return this._message;
  }

  set message(value: string) {
    this._message = value;
  }
  get id(): string {
    return this._id;
  }

  set id(value: string) {
    this._id = value;
  }
  get complete(): boolean {
    return this._complete;
  }

  set complete(value: boolean) {
    this._complete = value;
  }

  private _complete: boolean = false;
  private _id: string = "";
  private _message: string = "";
}
