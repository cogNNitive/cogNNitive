---
level: 3
parent_spec:
  name: "tutorias_V_0-1-0"
  url: "https://example.invalid/tutorias_V_0-1-0.md"
title: "Tutorias"
scope_elements:
  - concept: Programa
  - concept: "Prestación de Servicios"
    parent: programa_ref
---

# NN Programa

## NN Programa: Programa Alfa
slug:: programa-alfa

## NN Programa: Programa Beta
slug:: programa-beta
idioma:: ca

# NN Tutor

## NN Tutor: Tutora Uno - Programa Alfa
nombre:: Tutora Uno
programa_ref:: [[Programa Alfa]]

## NN Tutor: Tutora Uno - Programa Beta
nombre:: Tutora Uno
programa_ref:: [[Programa Beta]]

# NN Prestación de Servicios

## NN Prestación de Servicios: Pedido 001
programa_ref:: [[Programa Alfa]]
numero_pedido:: 001

## NN Prestación de Servicios: Pedido 002
programa_ref:: [[Programa Beta]]
numero_pedido:: 002
precio_hora_tutoria:: "90"

## NN Prestación de Servicios: Pedido 003
programa_ref:: [[Programa Fantasma]]
numero_pedido:: 003
precio_hora_tutoria:: "84"
