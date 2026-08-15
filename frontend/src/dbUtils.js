import { setDoc, updateDoc, addDoc } from 'firebase/firestore';

/**
 * Escudo Final (Sanitizador Global)
 * Recorre recursivamente cualquier objeto antes de enviarlo a la base de datos
 * y transforma todos los valores tipo string a MAYÚSCULAS, excepto los correos.
 */
function sanitizeData(data) {
    if (data === null || data === undefined) return data;
    
    // Si es un string simple, lo convertimos
    if (typeof data === 'string') {
        return data.toUpperCase();
    }
    
    // Si es un array, sanitizamos cada elemento
    if (Array.isArray(data)) {
        return data.map(item => sanitizeData(item));
    }
    
    // Si es un objeto, revisamos sus propiedades
    if (typeof data === 'object') {
        // Ignorar objetos especiales de Firestore (FieldValues, Timestamps, Dates)
        if (data.constructor !== Object && data.constructor.name !== 'Object') return data;
        
        const sanitized = {};
        for (const [key, value] of Object.entries(data)) {
            const lowerKey = key.toLowerCase();
            // Excepciones: si la clave incluye email, correo, password, token, uid
            if (lowerKey.includes('email') || lowerKey.includes('correo') || lowerKey === 'rol') {
                sanitized[key] = typeof value === 'string' ? value.toLowerCase() : value;
            } else if (lowerKey.includes('password') || lowerKey.includes('token') || lowerKey.includes('uid')) {
                sanitized[key] = value;
            } else {
                sanitized[key] = sanitizeData(value);
            }
        }
        return sanitized;
    }
    
    return data;
}

export async function safeSetDoc(docRef, data, options = {}) {
    const cleanData = sanitizeData(data);
    return await setDoc(docRef, cleanData, options);
}

export async function safeUpdateDoc(docRef, data) {
    const cleanData = sanitizeData(data);
    return await updateDoc(docRef, cleanData);
}

export async function safeAddDoc(collectionRef, data) {
    const cleanData = sanitizeData(data);
    return await addDoc(collectionRef, cleanData);
}
