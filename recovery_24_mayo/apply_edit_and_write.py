import os

source_file = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\scratch\NnaCreatePage_reconstructed.tsx"
dest_file = r"D:\Usuarios\ccampos\Documents\Python Scripts\Educadores_calle\educadores-calle-system\client\src\features\nna\NnaCreatePage.tsx"

if os.path.exists(source_file):
    with open(source_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Let's perform the replacement to insert the hidden input
    target = '                                                {/* VII. ACTIVIDADES DE TIEMPO LIBRE (REGISTRO DINMICO IDNTICO A CALLE) */}\n                                                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-slate-50/50 p-5 space-y-6">\n                                                    {/* Cabecera de la seccin */}'
    
    replacement = '                                                {/* VII. ACTIVIDADES DE TIEMPO LIBRE (REGISTRO DINMICO IDNTICO A CALLE) */}\n                                                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-slate-50/50 p-5 space-y-6">\n                                                    <input type="hidden" {...register(`nnas.${index}.actividadesTiempoLibreLista` as const)} />\n                                                    {/* Cabecera de la seccin */}'
    
    if target in content:
        print("Target pattern found! Replacing...")
        content = content.replace(target, replacement)
    else:
        # Let's try a fallback in case whitespace differs or  is represented differently
        print("Exact target pattern not found. Trying fallback regex/replacement...")
        # Fallback using more general replacement
        target_fallback = '{/* VII. ACTIVIDADES DE TIEMPO LIBRE'
        if target_fallback in content:
            print("Found fallback start pattern! Performing manual split/insert...")
            lines = content.splitlines()
            inserted = False
            for idx, line in enumerate(lines):
                if '{/* VII. ACTIVIDADES DE TIEMPO LIBRE' in line:
                    # The next line is the div opening
                    if idx + 1 < len(lines) and 'className="border border-slate-200' in lines[idx+1]:
                        lines.insert(idx + 2, '                                                    <input type="hidden" {...register(`nnas.${index}.actividadesTiempoLibreLista` as const)} />')
                        inserted = True
                        print(f"Inserted hidden input at line {idx+3} of reconstructed file!")
                        break
            if inserted:
                content = "\n".join(lines)
            else:
                print("Fallback insertion failed.")
        else:
            print("Fallback start pattern not found.")
            
    # Save the restored code in UTF-8 to the destination file
    with open(dest_file, 'w', encoding='utf-8') as out_f:
        out_f.write(content)
    print(f"Successfully restored and saved the exact original uncorrupted file to: {dest_file}")
    print(f"Final file size: {os.path.getsize(dest_file)} bytes")
else:
    print("Source file not found")
