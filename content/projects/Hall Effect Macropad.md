---
title: Hall Effect Macropad
---

# Hall Effect Macropad

A custom Hall-effect macropad designed from the ground up.

## Overview

This project combines:

- Mixed-signal PCB design
- RP2040 firmware
- Hall-effect sensing
- Analog multiplexing
- Mechanical design
- Sensor characterization

## Hardware

The PCB was designed in KiCad.

The RP2040 reads the Hall-effect sensors through an analog multiplexer.

## Firmware

The firmware is written in C and handles the analog scanning and sensor processing.

## Results

The system achieved sub-0.1 mm keystroke resolution during characterization, and costs around 2x less than commercial equivalents.