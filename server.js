const nodeCleanup             = require('node-cleanup');
const SerialPort              = require("serialport");
const Readline                = require('@serialport/parser-readline');
const { readFileSync }        = require("fs");
const { Server }              = require("socket.io");
const express                 = require("express");
const path                    = require('path');

const config = {
  port:3000
};


function getPortsList(){
    let portsList = [];
  
    return SerialPort.list().then((ports) => {
      
      ports.forEach((port) => {
        portsList.push(port.path);
      });
  
      return portsList;
    });
};



function initialize(path){

  return new Promise((resolve,reject)=>{

    const port = new SerialPort(path,{
      baudRate: 115200//9600
    });

    //Do clean up
    nodeCleanup(()=>{
      console.log('CLEAN UP START');
      port.close();
      console.log('CLEAN UP END');
    });

    //{ delimiter: '\r\n' }
    const parser  = port.pipe(new Readline());

    port.open( (err) => {
      if (err) {
        return console.log('Error opening port: ', err.message)
      }
      
      resolve({
        port:port,
        parser:parser,
        send: (message)=>{
          return new Promise((resolve,reject)=>{

              port.write(message, function(err) {
        
                  if (err) {
        
                      port.close();
                      return reject("Error on write: ", err.message);
                  }
        
                  resolve(true);
              });//write
          
          });//promise
        
        }//send

      });//resolve
    
    });
    


    port.on('close',()=>{
      console.log('Port closed');
    });
  
  });
}




getPortsList().then(item=>{
  console.log(item);

  return true;
}).then(path=>{

  //return initialize(path);

  return true;

}).then(serial=>{

  const io = new Server({  
    cors: {    
      origin: "http://localhost:8000"  
    }
  });

  let listen = ()=>{
    io.listen(config.port);
    console.log('Listening to port: '+config.port);
  }

  
  io.on('connection', (socket) => {

    console.log('Connected');
    
    let cancelCommand;
    let status;
    let delayStop = 3000;

    /*
    //Send back serial data
    serial.parser.emit('data',(data)=>{
      status = data;
      socket.emit('data',data);
    });
    */

    
    //Forward
    socket.on('forward',()=>{
      
      clearTimeout(cancelCommand);

      console.log('FORWARD');
      //serial.send('FORWARD');

      cancelCommand = setTimeout(()=>{
        console.log('-STOP');
        //serial.send('STOP');
      },delayStop);

    });

    //Backward
    socket.on('backward',()=>{
      
      clearTimeout(cancelCommand);
      
      console.log('BACKWARD');
      //serial.send('BACKWARD');

      cancelCommand = setTimeout(()=>{
        console.log('-STOP');
        //serial.send('STOP');
      },delayStop);

    });


    //Stop
    socket.on('stop',()=>{
      
      clearTimeout(cancelCommand);
      
      console.log('STOP');
      //serial.send('STOP');

    });

    //Rotate left
    socket.on('rotate-left',()=>{
      
      clearTimeout(cancelCommand);
      
      console.log('ROT_LEFT');
      //serial.send('ROT_LEFT');

      cancelCommand = setTimeout(()=>{
        console.log('-STOP');
        //serial.send('STOP');
      },delayStop);

    });

    //Rotate right
    socket.on('rotate-right',()=>{
      
      clearTimeout(cancelCommand);
      
      console.log('ROT_RIGHT');
      //serial.send('ROT_RIGHT');

      cancelCommand = setTimeout(()=>{
        console.log('-STOP');
        //serial.send('STOP');
      },delayStop);

    });


    socket.conn.on('close', (reason) => {    
      console.log('Socket closed');
    });

  });


  listen();

});



const app = express();

app.get('/',(req,res)=>{
  res.sendFile(path.join(__dirname, '/ui.html'));
});

app.listen(8000, (err) => {
  if(err){
    throw new Error(err)
  }
  console.log("Listening on port 8000")
})






