/**
 * Calcula la edad en base a una fecha de nacimiento.
 * @param dobString Fecha de nacimiento en formato string o Date.
 * @returns Edad como número, o '-' si la fecha no es válida.
 */
export const calculateAge = (dobString: string | Date | null): number | '-' => {
    if (!dobString) return '-';
    const today = new Date();
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return '-';
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age >= 0 ? age : '-';
};
