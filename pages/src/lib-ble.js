import { uuids } from './uuids.js';

function equals(a, b) {
    return Object.is(a, b);
}
function exists(x) {
    if(isNull(x) || isUndefined(x)) { return false; }
    return true;
}
function first(xs) {
    if(!isArray(xs) && !isString(xs) && !isUndefined(xs)) {
        throw new Error(`first takes ordered collection or a string: ${xs}`);
    }
    if(isUndefined(xs)) return undefined;
    if(empty(xs)) return undefined;
    return xs[0];
}
function isNull(x) {
    return Object.is(x, null);
}
function isUndefined(x) {
    return Object.is(x, undefined);
}
function existance(value, fallback) {
    if(exists(value))    return value;
    if(exists(fallback)) return fallback;
    throw new Error(`existance needs a fallback value `, value);
}
function isFunction(x) {
    return equals(typeof x, 'function');
}
function isArray(x) {
    return Array.isArray(x);
}
function isObject(x) {
    return equals(typeof x, 'object') && !(isArray(x));
}
function isCollection(x) {
    return isArray(x) || isObject(x);
}
function isString(x) {
    return equals(typeof x, 'string');
}
function isNumber(x) {
    if(isNaN(x)) return false;
    return equals(typeof x, 'number');
}
function isAtomic(x) {
    return isNumber(x) || isString(x);
}
function empty(x) {
    if(isNull(x)) throw new Error(`empty called with null: ${x}`);
    if(!isCollection(x) && !isString(x) && !isUndefined(x)) {
        throw new Error(`empty takes a collection: ${x}`);
    }
    if(isUndefined(x)) return true;
    if(isArray(x))  {
        if(equals(x.length, 0)) return true;
    }
    if(isObject(x)) {
        if(equals(Object.keys(x).length, 0)) return true;
    }
    if(isString(x)) {
        if(equals(x, "")) return true;
    }
    return false;
};
const _type = 'web-ble';

const _hrm          = {
    filters: [{services: [uuids.heartRate]}],
    optionalServices: [uuids.deviceInformation]
};
const _controllable = {
    filters: [
        {services: [uuids.fitnessMachine]},
        {services: [uuids.fec]},
        {services: [uuids.wahooFitnessMachine]},
        {services: [uuids.cyclingPower]},
    ],
    optionalServices: [uuids.deviceInformation, ]
};
const _power        = {
    filters: [{services: [uuids.cyclingPower]}],
    optionalServices: [uuids.deviceInformation]
};
const _speedCadence = {
    filters: [{services: [uuids.speedCadence]}],
    optionalServices: [uuids.deviceInformation]
};
const _wahooGears   = {
    filters: [{ namePrefix: "KICKR BIKE" }],
    optionalServices: [uuids.wahooGears, uuids.wahooFitnessMachineGearsNotify]
};
const _wahooPowerGears = {
    filters: [{ namePrefix: "KICKR BIKE" }],
    optionalServices: [
        uuids.wahooGears,
        uuids.cyclingPower,
        uuids.cyclingPowerMeasurement,
        uuids.wahooFitnessMachineGearsNotify,
        uuids.cyclingPowerFeature,
        uuids.cyclingPowerControlPoint,
        uuids.wahooTrainer,
        uuids.speedCadenceMeasurement,
        uuids.speedCadenceFeature,
        uuids.speedCadenceControlPoint,
        uuids.wahooFitnessMachineControlPoint,
    ]
}

const _all = {acceptAllDevices: true};
function filterIn(coll, prop, value) { return first(coll.filter(x => x[prop] === value)); }
function filterByValue(  obj, value) { return Object.entries(obj).filter(kv => kv[1] === value); }
function findByValue(    obj, value) { return first(first(filterByValue(obj, value))); }
function filterDevice(  devices, id) { return filterIn(devices, id); }
function includesDevice(devices, id) { return devices.map(device => device.id).includes(device => equals(device.id, id)); }


const _ = { filterDevice, includesDevice };

class WebBLE {
    requestFilters = {
        hrm             : _hrm,
        controllable    : _controllable,
        speedCadence    : _speedCadence,
        power           : _power ,
        wahooGears      : _wahooGears,
        wahooPowerGears : _wahooPowerGears,
        all             : _all
    };
    constructor(args) {}
    get   type() { return _type; }
    async connect(            filter) {
        try{
            const self     = this;
            const device   = await self.request(filter);
            const server   = await self.gattConnect(device);
            const services = await self.getPrimaryServices(server);
            return { device, server, services };
        } catch (e){
            console.error(e);
            return null;
        }
    }
    async disconnect(         device) {
        const self = this;
        await self.gattDisconnect(device);
        return device;
    }
    isConnected(              device) {
        if(!exists(device.gatt)) return false;
        return device.gatt.connected;
    }
    async watchAdvertisements(id) {
        const devices = await navigator.bluetooth.getDevices();
        const device  = first(devices.filter(d => d.id === id));

        let resolve;
        const p = new Promise(function(res, rej) { resolve = res; });

        const abortController = new AbortController();
        device.addEventListener('advertisementreceived', onAdvertisementReceived.bind(this), {once: true});

        async function onAdvertisementReceived(e) {
            abortController.abort();
            console.log(e);
            resolve(e.device);
        }

        await device.watchAdvertisements({signal: abortController.signal});

        return p;
    }
    async sub(                characteristic, handler) {
        const self = this;
        await self.startNotifications(characteristic, handler);
        return characteristic;
    }
    async unsub(              characteristic, handler) {
        const self = this;
        await self.stopNotifications(characteristic, handler);
        return characteristic;
    }
    async request(            filter) {
        return await navigator.bluetooth.requestDevice(filter);
    }
    async getDevices() {
        const self = this;
        return await navigator.bluetooth.getDevices();
    }
    async isPaired(           device) {
        const self = this;
        const devices = await self.getDevices();
        return includesDevice(devices, device.id);
    }
    async getPairedDevice(    deviceId) {
        const self = this;
        const devices = await self.getDevices();
        return filterDevice(devices, deviceId);
    }
    async gattConnect(        device) {
        const self = this;
        const server = await device.gatt.connect();
        return server;
    }
    async gattDisconnect(     device) {
        const self = this;
        return await device.gatt.disconnect();
    }
    async getPrimaryServices( server) {
        const self = this;
        const services = await server.getPrimaryServices();
        return services;
    }
    async getService(         server, uuid) {
        const self = this;
        const service = await server.getPrimaryService(uuid);
        return service;
    }
    async getCharacteristic(  service, uuid) {
        const self = this;
        const characteristic = await service.getCharacteristic(uuid);
        return characteristic;
    }
    async getCharacteristics( service) {
        const self = this;
        const characteristics = await service.getCharacteristics();
        return characteristics;
    }
    async getDescriptors(     characteristic) {
        const self = this;
        const descriptors = await characteristic.getDescriptors();
        return descriptors;
    }
    async getDescriptor(      characteristic, uuid) {
        const self = this;
        const descriptor = await characteristic.getDescriptor(uuid);
        return descriptor;
    }
    async startNotifications( characteristic, handler) {
        const self = this;
        await characteristic.startNotifications();
        characteristic.addEventListener('characteristicvaluechanged', handler);
        console.log(`Notifications started on ${findByValue(uuids, characteristic.uuid)}: ${characteristic.uuid}.`);
        return characteristic;
    }
    async stopNotifications(  characteristic, handler) {
        let self = this;
        await characteristic.stopNotifications();
        characteristic.removeEventListener('characteristicvaluechanged', handler);
        console.log(`Notifications stopped on ${findByValue(uuids, characteristic.uuid)}: ${characteristic.uuid}.`);
        return characteristic;
    }
    async writeCharacteristic(characteristic, value) {
        const self = this;
        let res = undefined;
        try{
            if(exists(characteristic.writeValueWithResponse)) {
                res = await characteristic.writeValueWithResponse(value);
            } else {
                res = await characteristic.writeValue(value);
            }
        } catch(e) {
            console.error(`characteristic.writeValue:`, e);
        }
        return res;
    }
    async readCharacteristic( characteristic) {
        const self = this;
        let value = new DataView(new Uint8Array([0]).buffer); // ????
        try{
            value = await characteristic.readValue();
        } catch(e) {
            console.error(`characteristic.readValue: ${e}`);
        }
        return value;
    }
    isSupported() {
        if(!exists(navigator)) throw new Error(`Trying to use web-bluetooth in non-browser env!`);
        return 'bluetooth' in navigator;
    }
    isSwitchedOn() {
        return navigator.bluetooth.getAvailability();
    }
}

const ble = new WebBLE();

export { ble, _ };
