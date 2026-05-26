const Ubigeos = require('ubigeos');

// Probamos diversas formas de acceso
try {
    console.log('Testing Default Import...');
    const u1 = new Ubigeos.Reniec(); // A veces es { Reniec }
    console.log('Deps Reniec:', u1.departamentos().slice(0, 1));
} catch (e1) {
    try {
        const u2 = new Ubigeos();
        console.log('Deps Common:', u2.getDepartamentos().slice(0, 1));
    } catch (e2) {
        console.log('Failed:', e1.message, e2.message);
    }
}
