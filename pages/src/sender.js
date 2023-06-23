import { ble, _ } from "./lib-ble.js";
import { uuids  } from './uuids.js';

var KICKR_device         = null;
var KICKR_characteristic = null;
var PWR_characteristic   = null;
var btnState             = "connect"
var ws;
var parser;

const CONNECT_TIMEOUT    = 300;
const MODE               = "Sauce";
const BRAKE_MODE         = false;
var BRAKE_LATCH          = false;

var POWERMODE = true;
// --

// The wake lock sentinel.
let wakeLock = null;

// Function that attempts to request a screen wake lock.
const requestWakeLock = async () => {
    try {
        wakeLock = await navigator.wakeLock.request();
        wakeLock.addEventListener('release', () => {
            console.log('Screen Wake Lock released:', wakeLock.released);
        });
    } catch (err) {
        setStatus(`${err.name}, ${err.message}`);
    }
};

// Wakelocks drop if you navigate away, so have to reaquire them
const handleVisibilityChange = async () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
    }
};

document.addEventListener('visibilitychange', handleVisibilityChange);

// --------------------------------------------------------/ Send to servers /--
async function getSauce(name="", args=null){
    // if (name.includes(".")) name = name.replace(".","/");
    let url = `https://${location.hostname}:${location.port}/api/rpc/v1/${name}`;
    console.log(url, args);
    if (args && args.method=="POST"){
      let bodyJson = JSON.stringify(args.body);
      console.log(bodyJson); // JSON.stringify(args.body)
        const f = await fetch(url, {
            method : 'POST',
            headers: {
              "Content-Type": 'application/json',
              "Accept": 'application/json',
            },
            body   : args.body,
        }).catch(err=>{console.error(err)});
        try{
            const r = await f.json();
            return r;
        } catch (e) {
            console.error(e);
        }
    } else {
        const f = await fetch(url, {
            method : 'GET',
            mode   : 'no-cors',
            headers: {"content-type": 'application/json'},
        });
        try{
            const r = await f.json();
            return r;
        } catch (e) {
            console.error(e);
        }
    }
}
async function postSauce( name, params ){
    let url = `https://${location.hostname}:${location.port}/api/rpc/v1/${name}`;
    const f = await fetch(url, {
        method : 'POST',
        headers: {
          "Content-Type": 'application/json',
          "Accept": 'application/json',
        },
        body   : JSON.stringify(params),
    }).catch(err=>{console.error(err)});
    try{
        const r = await f.json();
        return r;
    } catch (e) {
        console.error(e);
    }
}
async function sendToSauce(packdata){
    let data   = packdata.data || packdata;
    // if (data.cr){
    let ATHLETE = 'self';
    // let params = [athlete.athleteId,{wPrime:athlete.Wbal}];
    let update = {};
    if (data.type=="status"){///gears/${data.cr+1||0}.${data.gr+1||0}
      await postSauce(`updateAthleteData`,['self',{KICKRgear:{
        cr:data.cr+1,
        gr:data.gr+1
      }}]);
    } else if (data.type=="brake"){
      await postSauce(`updateAthleteData`,['self',{KICKRbrake:{
        side:data.side,
        down :data.down,
        latch : data.latch,
      }}]);

      // getSauce(`rpc/v1/updateAthleteState/break/${data.side}.${data.down}.${data.latch}`);
      // update.brake = `${data.side}.${data.down}.${data.latch}`;
    } else if (data.type=='power'){
      await postSauce(`updateAthleteData`,['self',{KICKRpower:data.ip}]);

      // getSauce(`rpc/v1/updateAthleteState/break/${data.ip}`);
      // update.trainerPower = data.ip;
    }
    // let params = [ATHLETE,update];
    // console.log("Send to sauce ",params,update); //TODO
    // getSauce("rpc/v1/updateAthleteData/${}", {
    //     method : 'POST',
    //     body   : update
    // }).then((msg)=>{console.log("sent ok",msg)}).catch(err=>console.error(err));
    // }
}
async function connectToZudio() {
    const ws  = new WebSocket(`wss://${location.hostname}:8443`);
    let start = Date.now();
    return new Promise((resolve, reject) => {
        const timer = setInterval(() => {
            if (ws.readyState === 1) {
                clearInterval(timer);
                ws.onclose = ()=>{
                  disconnectKickr(true);
                  setStatus('Lost target');
                };
                resolve(ws);
            }
            if (Date.now() - start > CONNECT_TIMEOUT) {
                console.log("Zudio not running");
                clearInterval(timer)
                return;
            }
        }, 10);
    });
}
if (MODE=="Zudio"){
    ws = await connectToZudio();
}
async function sendToZudio(data){
    if (!ws) console.error("Not conected to WS");
    if (data.type=="gear"  ) return ws.send( JSON.stringify({ cmd: "gearInput" , data: { cr: data.cr, gr: data.gr }}) );
    if (data.type=="brake" ) return ws.send( JSON.stringify({ cmd: "brakeInput", data: { side: data.side, down:data.down }}) );
    if (data.type=="status") return ws.send( JSON.stringify({ cmd: "gearInput" , data: { cr: data.cr, gr: data.gr }}) );
    if (data.type=="power" ) return ws.send( JSON.stringify({ cmd: "KICKRpower", data: { ip:data.ip }}) );
    console.warn("unhandled Type". data);
}

function handleSend(data){
    try{
        if (MODE=="Zudio"){
            sendToZudio(data);
        } else {
            // Assume sauce
            sendToSauce(data);
        }
        if (data.type=="gear"||data.type=='status'){
            document.querySelector(".chainring" ).textContent = data.cr+1;
            document.querySelector(".gearnumber").textContent = data.gr+1;
        } else if (data.type=='brake'){
            document.querySelectorAll(".left, .right").forEach( (e,i)=>{
                e.classList.remove("brakesOn");
            })
            if (data.down){
                document.querySelector(`.${data.side}`).classList.add("brakesOn");
            }
            // setStatus(`Brake ${data.side} ${data.down}`);
        } else if (data.type=='power'){
            document.querySelector(".watts").textContent = data.ip;
        }
    } catch {}
}
// --------------------------------------------------------/ Dom tools /--------
function setStatus(txt = "") {
    document.querySelector(".status").textContent = txt;
}
function setBtn(state="connect"){
    const cssstates = ["disconnected","connecting","connected"];
    let btn = document.querySelector("#start");
    btn.classList.remove(...cssstates);
    switch(state){
        case "connect":
            btn.textContent = "Connect";
            btnState        = "connect";
            btn.classList.add("disconnected");
            break;
        case "disconnect":
            btn.textContent = "Disconnect";
            btn.classList.add("connected");
            btnState        = "disconnect";
            break;
        case "connecting":
            btn.textContent = "Connecting";
            btnState        = "connecting";
            btn.classList.add("connecting");
            break;
        case "reload":
            btn.textContent = "Reload";
            btnState        = "reload";
            btn.classList.add("disconnected");
            break;
    }
}

// --------------------------------------------------------/ KICKR stuff /-------
async function connectKickr(){
    let connection = await ble.connect(ble.requestFilters.wahooPowerGears);
    if (!connection){
        setBtn("connect");
        setStatus("KICKR Connection failed");
        return;
    }
    setBtn("disconnect");
    KICKR_device       = connection.device;
    let service        = await ble.getService( connection.server, uuids.wahooGears);
    let characteristic = await ble.getCharacteristic( service, uuids.wahooFitnessMachineGearsNotify );
    if (!characteristic){
        setStatus("KICKR Gear finder failed");
        return;
    }
    KICKR_characteristic = characteristic;
    await ble.startNotifications( characteristic, KICKR_packet );


    if (POWERMODE){
        let pwr_service        = await ble.getService( connection.server, uuids.cyclingPower);
        PWR_characteristic     = await ble.getCharacteristic( pwr_service, uuids.cyclingPowerMeasurement );
        await ble.startNotifications( PWR_characteristic, KICKR_powerpacket );
    }
}
async function disconnectKickr(noreconnect=false){
    try{
        if (KICKR_characteristic){
            await ble.stopNotifications( KICKR_characteristic, KICKR_packet )
            if (POWERMODE){ await ble.stopNotifications( PWR_characteristic, KICKR_powerpacket ); }
        }
        await ble.disconnect(KICKR_device);
    } catch (e) {}
    if (noreconnect){
        setBtn("reload");
    } else {
        setBtn("connect");
    }
}
function handleClick(){
    switch(btnState){
        case "connect" :
            setStatus("");
            connectKickr();
            setBtn("connecting");
        break;
        case "connecting":
            break;
        case "disconnect":
            disconnectKickr();
            break;
        case "reload":
            location.reload();
            break;
    }
}
function KICKR_packet(evt){
    const packet = event.target.value;
    let [ type, chain, gear ] = [packet.getUint8(0), packet.getUint8(2), packet.getUint8(3)];
    if (type==7){
        //status packet
        // for now send as gears
        handleSend({
            type : "status",
            cr   : chain,
            gr   : gear,
        })
    } else if (type==2){
        // chain = brake lever
        if (BRAKE_MODE && chain) BRAKE_LATCH=!BRAKE_LATCH;
        console.log("Shifter code", chain);
        if (chain==90){
            handleSend({
                type  : "brake",
                side  : "left",
                down  : (gear>0),
                latch : BRAKE_LATCH
            })
        } else if(chain==227){
            handleSend({
                type  : "brake",
                side  : "right",
                down  : (gear>0),
                latch : BRAKE_LATCH
            })
        } else {
            handleSend({
                type  : "brake",
                side  : "up",
                down  : false,
                latch : BRAKE_LATCH
            })
        }
    } else if (type=="1"){
        //Shifter
        handleSend({
            type : "status",
            cr   : chain,
            gr   : gear,
        })
    }
}
// --------------------------------------------------------/ Power etc /--------
function KICKR_powerpacket(evt){
    const packet = event.target.value;
    // let bLen = packet.byteLength;
    // let hexy = [];
    // while(bLen){
    //     bLen--;
    //     hexy.unshift(packet.getUint8(bLen).toString(16).padStart(2, '0'));
    // }
    const instant_power = packet.getInt16(2, true)  // Resolution is 1 watts
    handleSend({
        type : "power",
        ip   : instant_power,
    })
    // console.log(hexy.join(" "),"  ",instant_power);
}

// --------------------------------------------------------/ Main-ish /---------
document.querySelector("#start").addEventListener("click", handleClick);
