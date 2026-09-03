---
spec_version: "V_0-1-0"
spec_url: "https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/iNNfo_V_0-1-0_NN.md"
level: 3
parent_spec:
  name: "procedures_V_0-1-0"
  url: "https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/templates/procedures/procedures_V_0-1-0_NN.md"
model_version: "V_1-0-0"
title: "Procedimiento Viaje al Futuro DeLorean"
---

> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor or view and edit it with [cogNNitive](https://innfo.cognnitive.com/app/innfo-doc).

# NN index

* [[Work]]
* [[Artifact]]
* [[Tools]]
* [[Roles]]

# NN Roles

## NN Roles: Piloto del DeLorean
scope:: internal
Persona encargada de conducir el vehículo y fijar los parámetros del viaje temporal.

## NN Roles: Científico / Asistente
scope:: internal
Encargado de la preparación de combustible y supervisión del condensador de flujo.

# NN Tools

## NN Tools: DeLorean DMC-12
Vehículo deportivo acondicionado como máquina del tiempo.

## NN Tools: Condensador de Flujo
Componente central que hace posible el viaje a través del tiempo.

## NN Tools: Circuitos del Tiempo
Panel de control para ingresar la fecha y hora de destino.

# NN Artifact

## NN Artifact: Plutonio / Mr. Fusion
Fuente de energía necesaria para generar los 1.21 gigavatios requeridos.

## NN Artifact: Coordenadas Temporales
Fecha y hora de destino configuradas en el panel digital.

# NN Work

## NN Work: Verificación de Energía
step_type:: task
tool:: Condensador de Flujo
input:: Plutonio / Mr. Fusion
next:: Configurar Destino
Carga y comprobación del sistema para garantizar el suministro de 1.21 gigavatios de potencia.

## NN Work: Configurar Destino
step_type:: task
tool:: Circuitos del Tiempo
output:: Coordenadas Temporales
next:: Acelerar a 88 MPH
Programación de la fecha futura deseada en los tres paneles (tiempo presente, tiempo de destino, último tiempo visitado).

## NN Work: Acelerar a 88 MPH
step_type:: task
tool:: DeLorean DMC-12
input:: Coordenadas Temporales
condition:: Velocidad == 88 mph
Paso final donde el vehículo alcanza la velocidad de desplazamiento temporal para activar la discontinuidad espaciotemporal.
