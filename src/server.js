import express, { Application } from "express";
const socketIO = require('socket.io')
import { createServer, Server as HTTPServer } from "http";
const path = require('path');

const https = require('https');
const fs = require('fs');

var key = fs.readFileSync(__dirname + '/../key.pem');
var cert = fs.readFileSync(__dirname + '/../cert.pem');
var options = {
    key: key,
    cert: cert
};

export class Server {

    constructor() {
        this.app;
        this.io;
        this.httpServer;
        this.activeSockets = [];

        this.DEFAULT_PORT = 443;


        this.initialize();
        this.handleRoutes();
        this.configureApp();
        this.handleSocketConnection();
    }

    initialize() {
        this.app = express();
        this.httpServer = https.createServer(options, this.app);
        //this.httpServer = createServer(this.app);
        this.io = socketIO(this.httpServer);
    }
    handleRoutes() {
        this.app.get("/", (req, res) => {
            res.send(`<h1>Hello World</h1>`);
        });
    }
    handleSocketConnection() {
        this.io.on("connection", socket => {
            let user;

            console.log("Socket connected", socket.handshake.headers.referer, socket.handshake.query, this.activeSockets);
            if (socket.handshake.headers.referer.includes('admin')) {
                console.log("Admin is connected");
                user = "admin";
            } else {
                console.log("client is connected -", socket.handshake.headers.referer + "?admin&sid=" + socket.id);
                user = "client";
            }
            if (this.activeSockets) {
                const existingSocket = this.activeSockets.find(
                    existingSocket => existingSocket === socket.id
                );

                if (!existingSocket) {
                    this.activeSockets.push(socket.id);

                    socket.on("call-user", data => {
                        socket.to(data.to).emit("call-made", {
                            offer: data.offer,
                            socket: socket.id
                        });
                    });


                    if (user === "admin") {
                        socket.emit("update-user-list", {
                            users: this.activeSockets.filter(
                                existingSocket => existingSocket !== socket.id
                            )
                        });
                    }

                    if (user === "admin") {
                        socket.broadcast.emit("update-user-list", {
                            users: [socket.id]
                        });
                    }

                    socket.on("disconnect", () => {
                        this.activeSockets = this.activeSockets.filter(
                            existingSocket => existingSocket !== socket.id
                        );
                        socket.broadcast.emit("remove-user", {
                            socketId: socket.id
                        });
                    });

                    socket.on("make-answer", (data) => {
                        socket.to(data.to).emit("answer-made", {
                            socket: socket.id,
                            answer: data.answer,
                        });
                    });

                }
            }
        });
    }

    configureApp() {
        this.app.use(express.static(path.join(__dirname, "../public")));
    }

    listen(callback) {
        this.httpServer.listen(this.DEFAULT_PORT, () =>
            callback(this.DEFAULT_PORT)
        );
    }


}