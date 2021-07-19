import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { SocketService } from './providers/socket.service';
import { Message } from './types/chat.interface';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})

export class ChatComponent implements AfterViewInit {

  mediaConstratints = {
    audio: true,
    video: {width: 720, height: 540}
  };

  offerConstraint = {
    offerToReceiveAudio: true,
    offerToReceiveVideo: true
  };
   
  localStream: MediaStream;
  @ViewChild('localVideo') localVideo: ElementRef;
  @ViewChild('remoteVideo') remoteVideo: ElementRef;

  peerConnection: RTCPeerConnection;

  constructor(
    private socketService: SocketService
  ) { }

  ngAfterViewInit() {
    this.addIncomingMessageHandler();
    this.requestMediaDevices();
  }

  async requestMediaDevices(): Promise <void> {
    this.localStream = await navigator.mediaDevices.getUserMedia(this.mediaConstratints);
    this.pauseLocalVideo();

  }

  addIncomingMessageHandler() {
    this.socketService.connect();
    this.socketService.message$.subscribe(msg => {
      switch(msg.type) {

        case 'offer':
          this.handleOfferMessages(msg.data);
          break;

        case 'answer':
          this.handleAnswerMessage(msg.data);
          break;

        case 'closeVideoCall':
          this.handlecloseVideoCallMessage(msg.data);
          break;

        case 'ice-candidate':
          this.handleIceCandidateMessage(msg.data);
          break;

        default:
          console.log('unknown message type');

      }
    }, error => {
      console.error(error);
    })
  }

  startLocalVideo() {
    this.localStream.getTracks().forEach(track => {
      track.enabled = true;
    });
    this.localVideo.nativeElement.srcObject = this.localStream;
  }

  pauseLocalVideo() {
    this.localStream.getTracks().forEach(track => {
      track.enabled = false;
    });

    this.localVideo.nativeElement.srcObject = undefined;
  }

  async call(): Promise<void> {
    this.createPeerConnection();
    this.localStream.getTracks().forEach(track => {
      this.peerConnection.addTrack(track, this.localStream);
    });

    try {
      const offer: RTCSessionDescriptionInit = await this.peerConnection.createOffer(this.offerConstraint);
      await this.peerConnection.setLocalDescription(offer);
      const message: Message = {
        type: 'offer',
        data: offer
      }
      this.socketService.sendMessage(message);
    } catch (error) {
      this.handleGetUserMediaError(error);
    }
  }

  createPeerConnection() {
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        {
          urls: ['stun:stun.kundenserver.de:3478']
        }
      ]
    });

    this.peerConnection.onicecandidate = this.handleICECandidateEvent;
    this.peerConnection.oniceconnectionstatechange = this.handleICEConnectionStateChangeEvent;
    this.peerConnection.onsignalingstatechange = this.handleSignallingStateChangeEvent;
    this.peerConnection.ontrack = this.handleTrackEvents;
  }

  closeVideoCall() {
    if(this.peerConnection) {
      this.peerConnection.onicecandidate = null;
      this.peerConnection.oniceconnectionstatechange = null;
      this.peerConnection.onsignalingstatechange = null;
      this.peerConnection.ontrack = null;
    }

    this.peerConnection.getTransceivers().forEach(trans => {
      trans.stop();
    });

    this.peerConnection.close();
    this.peerConnection = null;
  }

  handleGetUserMediaError(error: Error) {
    switch(error.name) {
      case 'NotFoundError':
        alert('Not medi input devices found');
        break;

      case 'SecurityError':
      case 'PermissionDeniedError':
        break;

      default:
        console.error(error);
        alert('Error opening your media inputs' + error.message);
    }

    this.closeVideoCall();
  }

  handleICECandidateEvent = (event: RTCPeerConnectionIceEvent) => {
    console.log(event);
    if (event.candidate) {
      this.socketService.sendMessage({
        type: 'ice-candidate',
        data: event.candidate
      })
    }
  }

  handleICEConnectionStateChangeEvent = (event: Event) => {
    console.log(event);

    switch(this.peerConnection.iceConnectionState) {
      
      case 'closed':
      case 'failed':
      case 'disconnected':
        this.closeVideoCall();
        break;
    }
  }

  handleSignallingStateChangeEvent = (event: Event) => {
    console.log(event);

    switch(this.peerConnection.signalingState) {

      case 'closed':
        this.closeVideoCall();
        break;
    }
  }

  handleTrackEvents = (event: RTCTrackEvent) => {
    console.log(event);

    this.remoteVideo.nativeElement.srcObject = event.streams[0];
  }


  handleOfferMessages(msg: RTCSessionDescriptionInit) {
    if(!this.peerConnection) {
      this.createPeerConnection();
    }
    if(!this.localStream) {
      this.startLocalVideo();
    }

    this.peerConnection.setRemoteDescription(new RTCSessionDescription(msg)).then(() =>{
      this.localVideo.nativeElement.srcObject = this.localStream;

      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      })
    }).then(() => {
      return this.peerConnection.createAnswer();
    }).then((answer) => {
      return this.peerConnection.setLocalDescription(answer)
    }).then(() => {
      this.socketService.sendMessage({
        type: 'answer',
        data: this.peerConnection.localDescription
      })
    }).catch(this.handleGetUserMediaError)
  }

  handleAnswerMessage(data) {
    this.peerConnection.setRemoteDescription(data)
  }

  handlecloseVideoCallMessage(message: Message) {
    this.closeVideoCall();
  }

  handleIceCandidateMessage(data) {
    this.peerConnection.addIceCandidate(data).catch(this.reportError);
  }

  reportError = (e: Error) => {
    console.error('got Error'+ e.name);
    console.error(e);
  }

  hangup() {
    this.socketService.sendMessage({
      type: 'handup',
      data: ''
    })
    this.closeVideoCall();
  }
}
