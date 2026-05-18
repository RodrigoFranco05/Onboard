---

name: Lutente Core Integral
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1c1b1b'
  on-surface-variant: '#504533'
  inverse-surface: '#313030'
  inverse-on-surface: '#f3f0ef'
  outline: '#e4d8c9'
  outline-variant: '#d5c4ac'
  surface-tint: '#7c5800'
  primary: '#7c5800'
  on-primary: '#1a1a1a'
  primary-container: '#f4b10e'
  on-primary-container: '#654700'
  inverse-primary: '#ffbb1e'
  secondary: '#845401'
  on-secondary: '#ffffff'
  secondary-container: '#ffbd68'
  on-secondary-container: '#774b00'
  tertiary: '#006686'
  on-tertiary: '#ffffff'
  tertiary-container: '#40caff'
  on-tertiary-container: '#00526c'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdea7'
  primary-fixed-dim: '#ffbb1e'
  on-primary-fixed: '#271900'
  on-primary-fixed-variant: '#5e4200'
  secondary-fixed: '#ffddb7'
  secondary-fixed-dim: '#fbba65'
  on-secondary-fixed: '#2a1700'
  on-secondary-fixed-variant: '#653e00'
  tertiary-fixed: '#bfe8ff'
  tertiary-fixed-dim: '#6ed2ff'
  on-tertiary-fixed: '#001f2b'
  on-tertiary-fixed-variant: '#004d65'
  background: '#fcf9f8'
  on-background: '#1c1b1b'
  surface-variant: '#f8f9fa'
  surface-body: '#ffffff'
  primary-hover: '#d99d0c'
  success: '#10b981'
  text-muted: '#9a8d7c'
  surface-selected: '#fffcf5'
typography:
  headline-h1:
    fontFamily: Raleway
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  section-header:
    fontFamily: Raleway
    fontSize: 18px
    fontWeight: '700'
    lineHeight: '1.4'
  subtitle:
    fontFamily: Raleway
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-medium:
    fontFamily: Raleway
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.5'
  label-bold:
    fontFamily: Raleway
    fontSize: 14px
    fontWeight: '700'
    lineHeight: '1.2'
  placeholder:
    fontFamily: Raleway
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max-width: 900px
  container-min-width: 800px
  inner-padding: 48px
  stack-sm: 8px
  stack-md: 32px
  gap-icon: 8px
  input-padding: 12px 16px

## btn-padding: 12px 24px

# Lutente Core: Sistema de Diseño Integral

Este documento define la arquitectura visual y las reglas de implementación para el flujo de onboarding de Lutente ERP, garantizando consistencia absoluta en componentes, espaciado y comportamiento.

## 1. Fundamentos Visuales

### Paleta de Colores

- **Surface (Body background):** `#ffffff` (Blanco puro).
- **Surface Variant (Main Container):** `#f8f9fa` (Gris ultra claro para el contenedor principal).
- **Primary (CTAs):** `#f4b10e` (Amarillo Lutente).
- **Primary Hover:** `#d99d0c`.
- **On Primary (CTA Text):** `#1a1a1a` (Casi negro).
- **Secondary (Accents):** `#8d5b0a` (Marrón Dorado para indicadores de pasos).
- **Outline (Borders):** `#e4d8c9` (Beige neutro).
- **Success:** `#10b981` (Esmeralda para estados de éxito).

### Tipografía

- **Fuente:** **Raleway** (Sans-serif moderna).
- **Headlines (H1):** 32px | Bold (700) | `#1a1a1a` | Margin-bottom: 8px.
- **Subtitles:** 16px | Regular (400) | `#9a8d7c` | Margin-bottom: 32px.
- **Section Headers:** 18px | Bold (700) | `#1a1a1a` | Icono a la izquierda con gap de 8px.
- **Labels:** 14px | Bold (700) | `#1a1a1a` | Margin-bottom: 8px.
- **Body / Content:** 14px | Medium (500) | `#1a1a1a`.
- **Placeholder:** 14px | Regular (400) | `#9a8d7c`.

### Sombras y Elevación

- **Shadow:** `0px 4px 20px rgba(0, 0, 0, 0.05)`.
- **Uso:** Exclusivamente en el contenedor principal de la tarjeta central para separarla del fondo del body.

## 2. Contenedores Estructurales

### Body

- **Background:** `#ffffff`.
- **Layout:** Flexbox centrado vertical y horizontalmente (min-h-screen).

### Contenedor Principal (Main Card)

- **Ancho:** `800px` a `900px` (Desktop).
- **Background:** `#ffffff`.
- **Border:** `1px solid #e4d8c9`.
- **Border Radius:** `12px`.
- **Padding:** `48px` internos.
- **Header:** Logo centrado o a la izquierda según el paso. Línea divisoria inferior de `4px` color `#f4b10e` en pasos de formulario.

## 3. Componentes de UI

### Botones (CTAs)

- **Primary Button:**
  - **Fondo:** `#f4b10e`.
  - **Texto:** `#1a1a1a`, Bold, 14px.
  - **Padding:** `12px 24px`.
  - **Radius:** `8px`.
  - **Hover:** Cambio de fondo a `#d99d0c`, elevación ligera.
  - **Icono:** `arrow_forward` (Material Symbol) a la derecha, gap 8px.
- **Secondary / Back Button:**
  - **Estilo:** Ghost/Text.
  - **Texto:** `#1a1a1a`, Medium, 14px.
  - **Icono:** `arrow_back` a la izquierda.

### Entradas de Texto (Inputs)

- **Border:** `1px solid #e4d8c9`.
- **Background:** `#f8f9fa`.
- **Radius:** `8px`.
- **Padding:** `12px 16px`.
- **Focus State:** Borde cambia a `#f4b10e`, ring sutil de `2px` con opacidad.

### Stepper (Barra de Pasos)

- **Horizontal (Top):** Barra de progreso de `4px` de alto. Color `#f4b10e` para el progreso actual, `#e4d8c9` para el restante.
- **Vertical (Sidebar - Opcional):**
  - **Círculo Activo:** Borde `#8d5b0a`, punto central `#8d5b0a`.
  - **Círculo Completado:** Fondo `#8d5b0a` con check blanco.

### Módulos (Checkboxes/Cards)

- **Card State (Normal):** Borde `#e4d8c9`, background blanco.
- **Card State (Selected):** Borde `2px solid #f4b10e`, background `#fffcf5`.
- **Checkbox:** Círculo de `20px`. Seleccionado: Fondo `#f4b10e` con check.

## 4. Iconografía

- **Estilo:** Material Symbols Outlined.
- **Tamaño:** 20px para UI general, 32px para encabezados de sección.
- **Color:** `#f4b10e` para acentos decorativos, `#1a1a1a` para iconos funcionales.