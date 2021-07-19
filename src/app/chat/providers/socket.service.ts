import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import {webSocket, WebSocketSubject} from 'rxjs/webSocket';
import { Message } from '../types/chat.interface';


export const WS_ENDPOINT = 'ws://192.168.29.227:8081';

@Injectable({
  providedIn: 'root'
})
export class SocketService {

  private socket$: WebSocketSubject<Message>;
  private messageSubject = new Subject<Message>();
  public message$ = this.messageSubject.asObservable();

  constructor() { }

  connect(): void {
    this.socket$ = this.getNewWebSocket();
    this.socket$.subscribe((msg) => {
      console.log('Recieved message of type: '+ msg.type);
      this.messageSubject.next(msg);
    })
  }

  getNewWebSocket(): WebSocketSubject<any> {
    return webSocket({
      url: WS_ENDPOINT,
      openObserver: {
        next: () => {
          console.log('Socket Service: Connection OK');
        }
      },
      closeObserver: {
        next: () => {
          console.log('Socket Service: Connection Closed');
          this.socket$ = undefined;
          this.connect();
        }
      }
    })
  }

  sendMessage(msg: Message) {
    console.log('sending message:' + msg.type);
    this.socket$.next(msg);
  }

}
