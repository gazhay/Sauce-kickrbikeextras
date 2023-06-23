if (!window.isSecureContext) {
    setStatus("You are not running on https - this will fail");
    if (location.protocol=="http:"){
        let port = ~~location.port+1 || 1081;
        url      = `https://${location.hostname}:${port}${location.pathname}`;
        setStatus(`Trying a redirect\n\t${url}`);
        // document.write(url)
        location.href = url;
    }
}
rpcCall = async function(name, ...args) {
    const f = await fetch(`/api/rpc/v1/${name}`, {
        method: 'POST',
        headers: {"content-type": 'application/json'},
        body: JSON.stringify(args),
    });
    const r = await f.json();
    if (r.success) {
        return r.value;
    } else {
        throw makeRPCError(r.error);
    }
};
const rpc = new Proxy({}, {
    get: (_, prop) => (...args) => rpcCall(prop, ...args)
});

async function addSpiceToSauce(cr,gr){
    if (cr){
        await rpc.updateAthleteStats('self',{gear_c:cr, gear_g:gr});
    }
}
async function main() {
    try {
        setStatus("Find Bike");
        const uuid   = 'a026ee0d-0a7d-4ab3-97fa-f1500f9feb8b'; // Gear button presses
        const rxUuid = 'a026e03a-0a7d-4ab3-97fa-f1500f9feb8b';
        const txUuid = 'a026e03a-0a7d-4ab3-97fa-f1500f9feb8b';

        // Request device with specific service UUID
        const device           = await navigator.bluetooth.requestDevice({
            filters         : [{ namePrefix: "KICKR BIKE" }],
            optionalServices: [uuid, txUuid, rxUuid],
        });
        device.addEventListener('gattserverdisconnected', () => {
            setStatus("Disconnected")
            setButton("Disconnected", "disconnected");
        });
        const server           = await device.gatt.connect();                    // Connect to device
        setButton("Connected", "connected");
        setStatus("Connected to Bike");
        const service          = await  server.getPrimaryService(uuid);          // Get service
        const txCharacteristic = await service.getCharacteristic(txUuid);        // Get characteristics
        const rxCharacteristic = await service.getCharacteristic(rxUuid);

        await txCharacteristic.startNotifications();
        txCharacteristic.addEventListener("characteristicvaluechanged", (event) => {
            const packet = event.target.value;
            let [CR, GR] = [packet.getUint8(2), packet.getUint8(3)];
            // console.log(` Chainring ${CR+1} Gear ${GR+1}`);
            try {
                addSpiceToSauce(CR+1,GR+1);
                try{
                    document.querySelector(".chainring" ).textContent = CR+1;
                    document.querySelector(".gearnumber").textContent = GR+1;
                } catch {}
            } catch (e) {
                console.log(e);
            }
        });

        // stop receiving
        // await txCharacteristic.stopNotifications();
        // // disconnect
        // await server.disconnect();
    } catch (e) {
        setStatus("KICKR ERROR : ", e.message, e);
        setButton("Connect")
    }
}

var domStatus = null;
var domButton = null;

var states = ["connecting", "connected", "disconnected", "error", "disbaled"];

function setButton(txt = "Connect", kclass = "") {
    for (let state of states) domButton.classList.remove(state);
    if (kclass == "") kclass = "default";
    domButton.classList.add(kclass);
    domButton.textContent = txt;
}

function setStatus(txt = "") {
    if (!domStatus) return console.error(txt);
    domStatus.textContent = txt;
}

document.addEventListener("DOMContentLoaded", () => {
    domButton = document.querySelector("#start");
    domStatus = document.querySelector(".status");
    domButton.addEventListener("click", main);
})
