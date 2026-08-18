/**
 * Utilidades del texto con formato de los campos largos (negrita, cursiva y
 * viñetas).
 *
 * El contenido se guarda como HTML acotado. Dos motivos para acotarlo:
 *
 * - Es un formato oficial: si cada educador escribe con colores y tamaños, la
 *   ficha impresa deja de parecerse al anexo aprobado.
 * - Lo que se pega desde Word arrastra estilos, `<span>`, `<font>` y hasta
 *   `<script>`. Todo eso se descarta al entrar.
 */

/** Lo único que sobrevive a la limpieza. */
const ETIQUETAS_PERMITIDAS = ['B', 'STRONG', 'I', 'EM', 'U', 'INS', 'UL', 'LI', 'BR', 'P', 'DIV'];

/**
 * Deja el HTML en las etiquetas permitidas, sin atributos.
 *
 * Se apoya en el parser del navegador en vez de expresiones regulares: el HTML
 * real trae anidamientos y comillas que una regex no cubre, y ahí es donde se
 * cuelan los scripts.
 */
export const limpiarHtml = (html: string): string => {
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
    const raiz = doc.body.firstElementChild;
    if (!raiz) return '';

    const recorrer = (nodo: Element) => {
        [...nodo.children].forEach(hijo => {
            recorrer(hijo);
            if (!ETIQUETAS_PERMITIDAS.includes(hijo.tagName)) {
                // La etiqueta se descarta pero su texto se conserva.
                hijo.replaceWith(...Array.from(hijo.childNodes));
                return;
            }
            [...hijo.attributes].forEach(attr => hijo.removeAttribute(attr.name));
        });
    };
    recorrer(raiz);
    return raiz.innerHTML;
};

/**
 * Versión en texto plano, para donde no se puede pintar HTML: la tabla del
 * historial, los resúmenes y el correo. Sin esto se leería
 * "&lt;b&gt;acuerdo&lt;/b&gt;" en medio de la frase.
 */
export const htmlAtexto = (html: string): string => {
    if (!html) return '';
    if (!/<[a-z][\s\S]*>/i.test(html)) return html;   // ya era texto plano
    const doc = new DOMParser().parseFromString(
        html.replace(/<li>/gi, '<li>• ').replace(/<\/(li|p|div|ul)>/gi, '\n'),
        'text/html',
    );
    return (doc.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
};

/** ¿Tiene contenido, más allá de las etiquetas vacías que deja el editor? */
export const tieneContenido = (html: string): boolean => htmlAtexto(html).trim().length > 0;
