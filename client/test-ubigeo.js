const Ubigeos = require('ubigeos');
try {
    const ubigeos = new Ubigeos();
    console.log('Departamentos:', ubigeos.getDepartamentos().slice(0, 3));
    console.log('Provincias de Amazonas:', ubigeos.getProvincias('01').slice(0, 3));
    console.log('Distritos de Chachapoyas:', ubigeos.getDistritos('0101').slice(0, 3));
} catch (e) {
    console.error('Error usando ubigeos:', e);
}
