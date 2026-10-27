/*
    utils/frame.js
    --------------
    Pasar de coords LOCALES de un marco del recorrido (Track.frameAt: x a la
    derecha, y arriba, -z hacia delante) a coords de MUNDO y al revés.

    Los obstáculos se diseñan en local ("una puerta de pared a pared a 3 m de
    altura") y estas funciones los colocan donde toque del recorrido, aunque
    ahí el pasillo esté girando o en rampa.

    Un frame es { position: Vector3, quaternion: Quaternion } (THREE).
*/

import * as THREE from 'three';

const tmpQ = new THREE.Quaternion();

// Punto local (x, y, z) -> mundo
export function pointToWorld(frame, x, y, z, out = new THREE.Vector3()) {
    return out.set(x, y, z).applyQuaternion(frame.quaternion).add(frame.position);
}

// Orientación local -> mundo (localQ puede ser null = sin girar)
export function quatToWorld(frame, localQ, out = new THREE.Quaternion()) {
    out.copy(frame.quaternion);
    if (localQ) out.multiply(localQ);
    return out;
}

// Punto de mundo -> local
export function pointToLocal(frame, p, out = new THREE.Vector3()) {
    tmpQ.copy(frame.quaternion).invert();
    return out.set(p.x, p.y, p.z).sub(frame.position).applyQuaternion(tmpQ);
}

// Dirección de mundo -> local (sin trasladar)
export function dirToLocal(frame, d, out = new THREE.Vector3()) {
    tmpQ.copy(frame.quaternion).invert();
    return out.set(d.x, d.y, d.z).applyQuaternion(tmpQ);
}

// Dirección local -> mundo
export function dirToWorld(frame, d, out = new THREE.Vector3()) {
    return out.set(d.x, d.y, d.z).applyQuaternion(frame.quaternion);
}
