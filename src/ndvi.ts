// Require client library and private key.
import ee = require('@google/earthengine');

type Coord = {
  lng: number;
  lat: number;
};

/**
 * It acquires NDVI images with few clouds from Google Earth Engine and gives a promise with an object of interesting data.
 * The library uses the Google Earth Engine for acquiring the NDVI image of a region of longitude and latitude coordinates.
 * It is necessary passing the private key as parameter to the function. See `{@link https://developers.google.com/earth-engine/apidocs/ee-data-authenticateviaprivatekey?hl=en}`.
 *
 *
 * @param devKey <AuthPrivateKey> - The JSON content of private key.
 * @param polygon <Coord[]> - The longitude and latitude coordinates of a given image.
 * @param width <number> - The width of an image in pixels.
 * @param dateStart <number> - The first date in timestamp of an image collection date.
 * @param dateEnd <number> - The last date in timestamp of an image collection date.
 * @returns The function returns a promise with an object containing:
 * - width <number> - The width of an image in pixels.
 * - height <number> - The height of an image in pixels normalised by the given width.
 * - centroid <Object> - The centroid or geometric center of a plane figure. It is the point at which a cutout of the shape could be perfectly balanced on the tip of a pin.
 * - bounds <Object[]> - Corners of the bounding box of the polygon.
 * - time_start <number> - It is set to the nominal composite start period for temporal composites. (timestamp)
 * - time_end <number> - The ending time stamp is set to the nominal image acquisition time for single scenes. It is set to midnight on the day after the nominal composite end period for MODIS (`@link https://modis.gsfc.nasa.gov/`) temporal composites. (timestamp)
 * - index <string> - The image index given by satellite system.
 * - img_url <string> - The NDVI cropped image url.
 *
 */

export function ndviGen(
  devKey: Object,
  polygon: Coord[],
  width: number,
  dateStart: number,
  dateEnd: number
): Promise<any> {
  // -----------------------------------------------------------------------------------------------------
  // --------------------------- Initialise the client library e o run analysis --------------------------
  // -----------------------------------------------------------------------------------------------------
  let runAnalysis: any = () => {
    ee.initialize(
      null,
      null,
      function () {},
      function (e: any) {
        console.error('Initialization error: ' + e);
      }
    );

    // -----------------------------------------------------------------------------------------------------
    // ---- Calculating the proportions to correct the image according to its lng and lat coordinates  -----
    // -----------------------------------------------------------------------------------------------------

    let coord: Array<Array<number>> = polygon.map((a: any) => [a.lng, a.lat]);
    let coordLng: Array<number> = polygon.map((a: Coord) => a.lng);
    let coordLat: Array<number> = polygon.map((a: Coord) => a.lat);

    var maxLng: number = coordLng.reduce(function (a, b) {
      return Math.max(a, b);
    });
    var minLng: number = coordLng.reduce(function (a, b) {
      return Math.min(a, b);
    });
    var maxLat: number = coordLat.reduce(function (a, b) {
      return Math.max(a, b);
    });
    var minLat: number = coordLat.reduce(function (a, b) {
      return Math.min(a, b);
    });

    let deltaLng: number = maxLng - minLng;
    let deltaLat: number = maxLat - minLat;

    let dimensionLng: number = Math.round(width);
    let dimensionLat: number = Math.round((width * deltaLat) / deltaLng);

    let centroidLng: number = get_polygon_centroid(polygon).lng;
    let centroidLat: number = get_polygon_centroid(polygon).lat;

    // -----------------------------------------------------------------------------------------------------
    // - Based on the coordinate harvest points, declares the center point in the lng and lat of the photo -
    // -----------------------------------------------------------------------------------------------------
    let point: object = ee.Geometry.Point([centroidLng, centroidLat]);

    // -----------------------------------------------------------------------------------------------------
    // ----------------------- Import the Landsat 8 T1_32DAY_NDVI image collection -------------------------
    // -----------------------------------------------------------------------------------------------------
    let l8: any = ee.ImageCollection('LANDSAT/LC08/C01/T1_32DAY_NDVI');

    // -----------------------------------------------------------------------------------------------------
    // ------------------------------------ Colour palette definitions -------------------------------------
    // -----------------------------------------------------------------------------------------------------
    const palette: any = {
      default: ['blue', 'white', 'green'],
      ndvi: ['640000', 'ff0000', 'ffff00', '00c800', '006400'],
      ndvi1: ['306466', '9cab68', 'cccc66', '9c8448', '6e462c'],
      ndvi2: ['8bc4f9', 'c9995c', 'c7d270', '8add60', '097210'], // min: -0.2, max: 0.8
      ndviAgro: [
        // Contrast palette #1 - paletteid = 3 https://agromonitoring.com/api/images#palette
        'd7d7d7',
        'd5d5d5',
        'd2d2d2',
        'c7c7c7',
        'a70204',
        'e50004',
        'fb6300',
        'ffb001',
        'f5e702',
        'c2e100',
        '81cd00',
        '5cbe02',
        '46a703',
        '36a801',
        '209e01',
        '029302',
        '008900',
        '027e02',
        '047101',
        '006400'
      ], // min: -0.2, max: 0.8
      green: [
        'FFFFFF',
        'CE7E45',
        'DF923D',
        'F1B555',
        'FCD163',
        '99B718',
        '74A901',
        '66A000',
        '529400',
        '3E8601',
        '207401',
        '056201',
        '004C00',
        '023B01',
        '012E01',
        '011D01',
        '011301'
      ], // min: 0.5, max: 1
      redToGreen: ['ff0000', 'ffff00', '00ff00'],
      mosaic: ['00FFFF', '0000FF']
    };

    // -----------------------------------------------------------------------------------------------------
    // --------------------------------------- Create an RGB imagem ----------------------------------------
    // -----------------------------------------------------------------------------------------------------
    let rangeDate: Array<number> = [dateStart, dateEnd];

    let image: any = ee.Image(
      l8
        // .filterBounds(point)
        .filterDate(dateStart, dateEnd)
        .sort('CLOUD_COVER')
        .first()
    );

    let vis: any = image
      .visualize({
        bands: ['NDVI'],
        // min e max dependem da paleta utilizada
        min: -0.2,
        max: 0.8,
        opacity: 1, // The opacity of the layer (0.0 is fully transparent and 1.0 is fully opaque)
        palette: palette.ndviAgro
      })
      .clip(ee.Geometry.Polygon(coord));

    let time_start: number = image.getInfo().properties['system:time_start'];
    let time_end: number = image.getInfo().properties['system:time_end'];
    let index: string = image.getInfo().properties['system:index'];

    // -----------------------------------------------------------------------------------------------------
    // -------------------------------------- Generates the image url --------------------------------------
    // -----------------------------------------------------------------------------------------------------
    let urlImg: string = vis.getThumbURL({
      dimensions: [dimensionLng, dimensionLat],
      region: ee.Geometry.Polygon(coord)
    });

    // -----------------------------------------------------------------------------------------------------
    // -------------------------------------------- Ret object ---------------------------------------------
    // -----------------------------------------------------------------------------------------------------
    let ret: object = {
      width: dimensionLng,
      height: dimensionLat,
      centroid: { lng: centroidLng, lat: centroidLat },
      bounds: [
        { lng: maxLng, lat: maxLat },
        { lng: minLng, lat: minLat }
      ],
      time_start: time_start,
      time_end: time_end,
      index: index,
      img_url: urlImg
    };
    return ret;
  };

  // -----------------------------------------------------------------------------------------------------
  // ------------------------------- Autenticação usando o service account -------------------------------
  // -----------------------------------------------------------------------------------------------------
  return new Promise(async function (resolve, reject) {
    return await ee.data.authenticateViaPrivateKey(
      devKey,
      () => {
        resolve(runAnalysis());
      },
      (e: any) => {
        reject('Authentication error: ' + e);
      }
    );
  });
}

// -----------------------------------------------------------------------------------------------------
// --------------------------- Cálculo do centróide de um polígono qualquer ----------------------------
// -----------------------------------------------------------------------------------------------------
let get_polygon_centroid = (pts: any) => {
  let first = pts[0],
    last = pts[pts.length - 1];
  if (first.lng != last.lng || first.lat != last.lat) pts.push(first);
  let area: number = 0,
    lng = 0,
    lat = 0,
    nPts = pts.length,
    p1: { lat: number; lng: number },
    p2: { lng: number; lat: number },
    f: number;
  for (let i = 0, j = nPts - 1; i < nPts; j = i++) {
    p1 = pts[i];
    p2 = pts[j];
    f =
      (p1.lat - first.lat) * (p2.lng - first.lng) -
      (p2.lat - first.lat) * (p1.lng - first.lng);
    area += f;
    lng += (p1.lng + p2.lng - 2 * first.lng) * f;
    lat += (p1.lat + p2.lat - 2 * first.lat) * f;
  }
  f = area * 3;
  return { lng: lng / f + first.lng, lat: lat / f + first.lat };
};
