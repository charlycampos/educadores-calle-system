import os
import shutil
import subprocess

src_6977 = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\scratch\NnaCreatePage_reconstructed_6977.tsx"
src_first = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\scratch\NnaCreatePage_reconstructed.tsx"
dest_file = r"D:\Usuarios\ccampos\Documents\Python Scripts\Educadores_calle\educadores-calle-system\client\src\features\nna\NnaCreatePage.tsx"
workspace_dir = r"D:\Usuarios\ccampos\Documents\Python Scripts\Educadores_calle\educadores-calle-system\client"

# Read top lines of Reconstructed_First (which has correct code at lines 18-35)
# Wait, let's just use the correct imports:
correct_top = """import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Plus, Trash2, Save, ArrowLeft, ArrowRight, UserPlus, Info, Check, 
    AlertCircle, Search, HelpCircle, Eye, EyeOff, Calendar, Clock, BookOpen, 
    Moon, Briefcase, FileText, ChevronRight, X, ChevronDown, CheckCircle2,
    Building2, FileCode2, MapPin
} from 'lucide-react';
import { useNnaStore } from './store';
import { useAuthStore } from '../auth/store';
import clsx from 'clsx';
import { NNA_API_URL } from '../../config';
import { DEPARTAMENTOS, PROVINCIAS, DISTRITOS } from '../../data/ubigeo';

interface Familiar {
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno?: string;
    tipoDoc: string;
    numeroDoc?: string;
    sexo?: string;
    fechaNacimiento?: string;
    viveConNna: number;
    vinculo: string;
    vinculoEspecifique?: string;
    estudiaActualmente?: number;
    nivelEducativo?: string;
    gradoEstudio?: string;
    sufreEnfermedad?: number;
    detalleEnfermedad?: string;
    tieneDiscapacidad?: number;
    tipoDiscapacidad?: string;
    detalleDiscapacidad?: string;
    created_at?: string;
    updated_at?: string;
}

interface DiaActividad {
    dia: string;
    inicio: string;
    fin: string;
    inicio2?: string;
    fin2?: string;
    tieneTurno2?: boolean;
}

interface ActividadPerfil {
    actividad: string;
    actividadEspecifique?: string;
    tiempoValor: string;
    tiempoUnidad: string;
    tiempoDetalle?: string;
    jornada?: DiaActividad[];
}
"""

with open(src_6977, 'r', encoding='utf-8') as f:
    lines_6977 = f.read().splitlines()

# The checklist is in lines 1-15, and the rest is TSX code starting around line 16.
# Let's replace the checklist with our correct_top
# In reconstructed_6977, lines 17-20 are imports that belong after correct_top.
# Let's see: where does the code actually start?
# In our previous view:
# 16: 
# 17:     OPCIONES_CONVIVENCIA_2026, 
# 18:     OPCIONES_VINCULO_TUTOR_2026,
# This looks like part of an import block that was cut!
# Yes, it is the import from '../../data/constants' or similar!
# Let's check lines 16 to 40 of NnaCreatePage_reconstructed_6977.tsx

print("First few lines of Reconstructed_6977 starting at index 15:")
for idx in range(15, min(40, len(lines_6977))):
    print(f"  {idx+1}: {lines_6977[idx]}")
