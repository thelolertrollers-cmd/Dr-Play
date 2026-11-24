# Doctor Play · taller

Gestión interna del servicio técnico: reparaciones, clientes, fichaje y cuentas, más una consulta de precios para la tablet del mostrador.

## 1. Crear las tablas

En Supabase el proyecto está vacío y la clave del navegador no puede crear tablas. Abre el editor SQL y pega el archivo completo `supabase/schema.sql`:

https://supabase.com/dashboard/project/eosxgpwuzhrynjgjpuyl/sql/new

Después, en **Authentication → Sign In / Providers → Email**, desactiva **Confirm email** para que el equipo entre sin esperar un correo.

## 2. Arrancar en local

```bash
npm install
npm run dev
```

La primera cuenta, en `/registro`, será administración y no pide código. Las siguientes usan el código del taller. El código inicial es `TALLER-DP`; cámbialo en Ajustes.

## 3. Pantallas

- `/consulta` — tablet. Consola, avería, precio y días. Si hay más reparaciones sin fecha de reparado que el umbral (5 por defecto), sube el precio y el plazo el porcentaje de Ajustes (15% por defecto).
- `/panel` — equipo. Recepciones, filtros, fichaje y cuentas.
- `/panel/admin` — precios, empleados, NIF, serie de factura y código de alta.

Los precios de la guía son una orientación inicial, con IVA incluido. Ajústalos a los vuestros: la tablet lee esos números.

## 4. Publicar en Vercel

Conecta este proyecto a Vercel y define:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

La tablet usa la URL pública acabada en `/consulta`. El equipo entra por `/login`.

## Fichajes y Verifactu

El fichaje guarda la hora de entrada y de salida en el servidor. Un empleado no puede cambiarla. Administración puede corregirla: se conserva la hora original y un motivo. Es una herramienta para el registro de jornada, no un asesoramiento legal.

Las facturas guardan serie, número, NIF, base e IVA, y dejan hueco para la huella de Verifactu. Todavía no se envían a la Agencia Tributaria.
