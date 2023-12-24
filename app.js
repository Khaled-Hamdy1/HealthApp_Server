const express = require("express");
const { createServer } = require("node:http");
const { Server } = require("socket.io");
const { createClient } = require("@supabase/supabase-js");

const { SerialPort } = require("serialport");
const { DelimiterParser } = require("@serialport/parser-delimiter");

const app = express();
const supabaseUrl = "https://ctfuvqknojlnfxlkqccc.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0ZnV2cWtub2psbmZ4bGtxY2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDI2NjQ4NTYsImV4cCI6MjAxODI0MDg1Nn0.7Q4Xtp_kJuo7dMeZuAF0ZZKRShJidQvfUSeGmjljvWs";

const supabase = createClient(supabaseUrl, supabaseKey);
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
const users = {};

io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("newUser", (data) => {
    users[socket.id] = data;
    io.emit("users", users);
    console.log(users);
  });

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

  const dataObj = arr[0];
  if (Object.keys(dataObj).length === 2) {
    io.emit("data", dataObj);
    for (const val of Object.values(users)) {
      supabase
        .from("user_profiles")
        .insert([
          {
            blood_oxygen: dataObj["SPO2"],
            heart_rate: dataObj["heart_rate"],
            user_id: val,
          },
        ])
        .then((res) => {
          console.log(res);
        })
        .catch((err) => {
          console.log(err);
        });
    }
    arr.length = 0;
  }
});

server.listen(3000, () => {
  console.log("server running at http://localhost:3000");
});
