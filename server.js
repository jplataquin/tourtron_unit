const nodeCleanup             = require('node-cleanup');
const SerialPort              = require("serialport");
const Readline                = require('@serialport/parser-readline');
const { Server }              = require("socket.io");

const config = {
  port:3000
};

//chromium-browser http://www.google.com/ --start-fullscreen
function getPort(){
   
    return new Promise((resolve,reject) => {
      
      SerialPort.list().then((ports) => {
      
        ports.forEach((port) => {
          if(port.productId == 7523){
            resolve(port.path);
          }
        });

      });

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
      

      port.write('STOP', function(err) {
        
        console.log('CLOSING PORT');
        port.close();
        console.log('CLEAN UP END');
      });
      
    });

    //{ delimiter: '\r\n' }
    const parser  = port.pipe(new Readline());

    port.on('open',(err) => {
      if (err) {
        return console.log('Error opening port: ', err.message)
      }
      
      console.log('Port '+path+' openned');

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



getPort().then(path=>{

 
  return initialize(path);


}).then(serial=>{

  const io = new Server({  
    cors: {    
      origin: "*" 
    }
  });

  let listen = ()=>{
    io.listen(config.port);
    console.log('Listening to port: '+config.port);
  }

  
  io.on('connection', (socket) => {

    console.log('Connected');
    
    let cancelCommand;
    let delayStop = 3000;

    
    //Send back serial data
    
    serial.parser.on('data',(data)=>{
      
      let arr = data.split(':');

      //Manual correction of proximity sensor
      arr[3] = !arr[3];
      arr[4] = !arr[4];
      arr[5] = !arr[5];

      socket.emit('data',arr.join(':'));
    });
    
    
    //Forward
    socket.on('forward',()=>{
      
      clearTimeout(cancelCommand);

      console.log('FORWARD');
      serial.send('FORWARD');

      cancelCommand = setTimeout(()=>{
        console.log('-STOP');
        serial.send('STOP');
      },delayStop);

    });

    //Backward
    socket.on('backward',()=>{
      
      clearTimeout(cancelCommand);
      
      console.log('BACKWARD');
      serial.send('BACKWARD');

      cancelCommand = setTimeout(()=>{
        console.log('-STOP');
        serial.send('STOP');
      },delayStop);

    });


    //Stop
    socket.on('stop',()=>{
      
      clearTimeout(cancelCommand);
      
      console.log('STOP');
      serial.send('STOP');

    });

    //Rotate left
    socket.on('rotate-left',()=>{
      
      clearTimeout(cancelCommand);
      
      console.log('ROT_LEFT');
      serial.send('ROT_LEFT');

      cancelCommand = setTimeout(()=>{
        console.log('-STOP');
        serial.send('STOP');
      },delayStop);

    });

    //Rotate right
    socket.on('rotate-right',()=>{
      
      clearTimeout(cancelCommand);
      
      console.log('ROT_RIGHT');
      serial.send('ROT_RIGHT');

      cancelCommand = setTimeout(()=>{
        console.log('-STOP');
        serial.send('STOP');
      },delayStop);

    });


    socket.conn.on('close', (reason) => {    
      console.log('Socket closed');
    });


    socket.on('disconnected',()=>{
      console.log('disconnected');
      serial.send('STOP');
    });

  });


  listen();

});









