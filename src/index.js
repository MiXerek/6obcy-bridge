const WebSocket = require("ws");
const fs = require("fs");

console.log("6obcy bridge by MiXerek v0.0.1");

// Check if directory for connection dumps exists
if (!fs.existsSync("./connections")) {
  fs.mkdirSync("./connections");
}

// Unix timestamp is simple form of unique id of connection
const connId = new Date().getTime().toString();

console.log(`Connection id: ${connId}`);

// Client class
class Sock {
  constructor(name) {
    this.name = name;
    this.ws = new WebSocket(
      "wss://server.6obcy.pl:7009/6eio/?EIO=3&transport=websocket",
      {
        origin: "https://6obcy.org",
        userAgent:
          "Mozilla/5.0 (X11; Linux x86_64; rv:83.0) Gecko/20100101 Firefox/83.0",
      }
    );
    this.sid = "";
    this.hash = "";
    this.ceid = 1;
    this.cid = "";
    this.ckey = "";
  }

  start(sock) {
    this.ws.on("message", (data) => {
      const msg = JSON.parse(data.slice(1));

      if (typeof msg.sid != "undefined") {
        this.sid = msg.sid;
      } else if (msg.ev_name == "cn_acc") {
        this.hash = msg.ev_data.hash;

        // Sending data after creating connection with 6obcy websocket server
        this.ws.send(
          `4{"ev_name":"_cinfo","ev_data":{"cvdate":"2017-08-01","dpa":true,"mobile":false,"cver":"v2.5","adf":"ajaxPHP","hash":"${this.hash}","testdata":{"ckey":0,"recevsent":false}}}`
        );

        // Sending "owack" - I don't know why this is required
        this.ws.send('4{"ev_name":"_owack"}');

        // Creating connection with random 6obcy user
        this.ws.send(
          '4{"ev_name":"_sas","ev_data":{"channel":"main","myself":{"sex":0,"loc":0},"preferences":{"sex":0,"loc":0}},"ceid":1}'
        );
      } else if (msg.ev_name == "talk_s") {
        this.cid = msg.ev_data.cid;
        this.ckey = msg.ev_data.ckey;

        // Sending data to 6obcy server after creating new connection with 6obcy user
        this.ws.send(
          `4{"ev_name":"_begacked","ev_data":{"ckey":"${this.ckey}"},"ceid":${this.ceid}`
        );

        this.ceid++;

        console.log(`Connected with ${this.name}!`);
      } else if (msg.ev_name == "rmsg") {
        console.log(this.name + ": " + msg.ev_data.msg);

        // Sending message to second 6obcy user
        sock.ws.send(
          `4{"ev_name":"_pmsg","ev_data":{"ckey":"${sock.ckey}","msg":"${msg.ev_data.msg}","idn":0},"ceid":${sock.ceid}}`
        );

        sock.ceid++;

        // Appending message in file
        fs.appendFile(
          "./connections/" + connId + ".txt",
          this.name + ": " + msg.ev_data.msg + "\n",
          (err) => {
            err == null ? null : console.log(err);
          }
        );
      } else if (msg.ev_name == "styp") {
        // Sending "user is typing..." event to second 6obcy user
        this.ws.send(
          `4{"ev_name":"_mtyp","ev_data":{"ckey":"${this.ckey}","val":true}}`
        );
      } else if (msg.ev_name == "sdis") {
        // User clicked "next" :( Exiting program...
        console.log(`Disconnected with ${this.name}!`);

        process.exit(1);
      }
    });
  }
}

// Creating new clients
const sock1 = new Sock("1");
const sock2 = new Sock("2");

// Starting connection between clients
sock1.start(sock2);
sock2.start(sock1);
