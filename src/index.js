import { Server } from "./server";
 
const server = new Server();
 
server.listen(function(){
 console.log(`Server is listening on http://localhost:`);
});