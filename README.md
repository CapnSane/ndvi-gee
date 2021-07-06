# ndvi-gee
> ndvi-gee is a typescript library for acquiring NDVI images with few clouds from Google Earth Engine and it returns a promise with an object of interesting data.

## Quick Start

ndvi-gee uses geometry system to crop a satellite image, and calculate the size of the image acquired from Google Earth Engine (GEE) using a given image width in pixels, and returns an object with many interesting data.

## Install

Install with npm:

```bash
npm install ndvi-gee
```

To use with node just import the module:

```js
const ndviGee = require("ndvi-gee");
```

## Usage

`ndvi-gee` provides a function to acquire an array of objects with the longitude (lng) and latitude (lat) coordinates of an area.