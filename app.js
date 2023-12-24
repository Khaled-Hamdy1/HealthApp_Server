const express = require("express");
const { createServer } = require("node:http");
const { Server } = require("socket.io");

const { SerialPort } = require("serialport");
const { DelimiterParser } = require("@serialport/parser-delimiter");

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const port = new SerialPort({
  path: "COM5",
  baudRate: 9600,
  dataBits: 8,
  parity: "none",
  stopBits: 1,
  autoOpen: false,
});

port.open((err) => {
  if (err) {
    return console.log("Error opening port: ", err.message);
  }
});

port.on("error", console.log);

const parser = port.pipe(new DelimiterParser({ delimiter: "\n" }));

const arr = [];

io.on("connection", (socket) => {
  console.log("a user connected");

  

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

parser.on("data", (data) => {
  const [key, value] = data.toString().split(":");
  const dto = { [key]: value.trim() };

  const isOdd = arr.length & 1;

  if (isOdd) {
    arr[arr.length - 1] = { ...arr[arr.length - 1], ...dto };
  } else {
    arr.push(dto);
  }

  const dataObj = arr[0]
  if(Object.keys(dataObj).length === 2) {
    io.emit("data", dataObj);
    arr.length = 0;
  }
});

server.listen(3000, () => {
  console.log("server running at http://localhost:3000");
});
