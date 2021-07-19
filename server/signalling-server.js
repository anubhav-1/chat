const webSocket = require('ws');
const Https = require('https');


const httpsServer = Https.createServer({
    key: '',
    cert:''
  });

const wss = new webSocket.Server({host: '192.168.29.227', port: 8081, server: httpsServer}, () => {
    console.log('Signalling Server Started at 8081');
})

wss.broadcast = (ws, data) => {
    wss.clients.forEach(client => {
        if (client!== ws && client.readyState === webSocket.OPEN) {
            client.send(data);
        }
    })
}

wss.on('connection', ws => {
    console.log(`Client Connected. Total connected clients: ${wss.clients.size}`);
    ws.on('message', message => {
        console.log(message + '\n\n');
        wss.broadcast(ws, message);
    });

    ws.on('close', ws => {
        console.log(`Client Disconnected. Total connected clients: ${wss.clients.size}`);
    });

    ws.on('error', ws => {
        console.error(`Client Error. Total connected clients: ${wss.clients.size}`);
    })


})