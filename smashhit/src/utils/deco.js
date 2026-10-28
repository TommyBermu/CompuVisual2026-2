/*
    utils/deco.js
    -------------
    Constructor de DECORADO para un tramo del recorrido.

    Un tramo puede llevar decenas de piezas (costillas, columnas, lámparas,
    monolitos...). Crear un Mesh por pieza sería carísimo, así que este helper
    acumula cajas por MATERIAL y al final las fusiona en UNA malla por material
    (mergeGeometries). Las posiciones se dan en coords LOCALES del recorrido en
    un punto s (x a la derecha, y arriba desde el suelo, z hacia atrás), igual
    que los obstáculos, así el decorado sigue curvas y rampas.

    Si una caja lleva `physics: true`, además se añade como forma estática al
    body del tramo (las bolas rebotan en ella).
*/

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { pointToWorld, quatToWorld } from './frame.js';

const unitBox = new THREE.BoxGeometry(1, 1, 1);

// Geometrías unitarias para el decorado (todas con position/normal/uv e índice,
// así se pueden fusionar con las cajas)
export const UNIT = {
    box: unitBox,
    // Pirámide de base cuadrada 1x1 y alto 1, centrada en el origen (como la caja)
    pyramid: new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1).rotateY(Math.PI / 4),
    cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 12),
    sphere: new THREE.SphereGeometry(1, 14, 8),
};
const tmpP = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();
const tmpS = new THREE.Vector3();
const tmpM = new THREE.Matrix4();
const Y_AXIS = new THREE.Vector3(0, 1, 0);

export default class DecoBuilder {
    constructor(track, body) {
        this.track = track;
        this.body = body;
        this.parts = new Map(); // clave de material -> [geometrías en mundo]
    }

    /*
        Caja de tamaño (w, h, d) centrada en (x, y, z) local del punto s.
        options:
            q:       orientación local (THREE.Quaternion) o null
            physics: también como forma estática del tramo
            shadow:  la malla de ese material proyecta sombra (se decide por material)
    */
    box(key, s, x, y, w, h, d, { z = 0, q = null, physics = false, upright = false } = {}) {
        this.shape(key, unitBox, s, x, y, w, h, d, { z, q, upright });
        if (physics && this.body) {
            const f = this.track.frameAt(s);
            const p = pointToWorld(f, x, y, z, tmpP);
            const quat = quatToWorld(f, q, tmpQ);
            this.body.addShape(
                new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2)),
                new CANNON.Vec3(p.x, p.y, p.z),
                new CANNON.Quaternion(quat.x, quat.y, quat.z, quat.w),
            );
        }
    }

    // Cualquier geometría "unitaria" (cubo, cono, esfera, cilindro de tamaño 1)
    // escalada a (sx, sy, sz) y colocada como box(). Solo visual.
    //   upright: vertical de verdad (solo el rumbo del recorrido, sin la pendiente
    //            de las rampas): templos, monolitos... no se inclinan en una cuesta.
    shape(key, unitGeo, s, x, y, sx, sy, sz, { z = 0, q = null, upright = false } = {}) {
        const f = this.track.frameAt(s);
        const p = pointToWorld(f, x, y, z, tmpP);
        const quat = upright ? tmpQ.setFromAxisAngle(Y_AXIS, f.yaw) : quatToWorld(f, null, tmpQ);
        if (q) quat.multiply(q);
        tmpM.compose(p, quat, tmpS.set(sx, sy, sz));
        this._push(key, unitGeo.clone().applyMatrix4(tmpM));
    }

    // Pilar VERTICAL colgado de un punto (x, top, z) del recorrido que baja h
    // metros en vertical de mundo: pedestales de islas, pilonos que se pierden en
    // la niebla. En una rampa no se inclina (si se inclinara, 260 m de pilar se
    // desplazarían decenas de metros).
    //   geo:  geometría unitaria (por defecto cubo; p.ej. UNIT.cylinder)
    //   yaw:  giro extra alrededor de la vertical
    //   rise: true = el punto es la BASE y el pilar sube h metros (cuelga del cielo al revés)
    hanging(key, s, x, top, w, h, d, { z = 0, geo = unitBox, yaw = 0, rise = false } = {}) {
        const f = this.track.frameAt(s);
        const p = pointToWorld(f, x, top, z, tmpP);
        p.y += rise ? h / 2 : -h / 2;
        tmpM.compose(p, tmpQ.setFromAxisAngle(Y_AXIS, f.yaw + yaw), tmpS.set(w, h, d));
        this._push(key, geo.clone().applyMatrix4(tmpM));
    }

    _push(key, geo) {
        if (!this.parts.has(key)) this.parts.set(key, []);
        this.parts.get(key).push(geo);
    }

    // Fusiona todo en una malla por material. materials: { clave: material }
    // shadowKeys: claves cuyas mallas proyectan sombra.
    build(materials, shadowKeys = new Set()) {
        const meshes = [];
        for (const [key, list] of this.parts) {
            const merged = mergeGeometries(list, false);
            list.forEach((g) => g.dispose());
            if (!merged) continue;
            const mesh = new THREE.Mesh(merged, materials[key]);
            mesh.castShadow = shadowKeys.has(key);
            mesh.receiveShadow = true;
            meshes.push(mesh);
        }
        this.parts.clear();
        return meshes;
    }
}
