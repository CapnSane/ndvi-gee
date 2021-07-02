// Require client library and private key.
import ee = require('@google/earthengine');

export function ndviGen(
  devKey: any,
  polygon: any,
  pixels: number,
  date1: number,
  date2: number
): Promise<any> {
  // -----------------------------------------------------------------------------------------------------
  // ---------------------------- Inicializa o client library e o run analysis ---------------------------
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

    // -----------------------------------------------------------------------------------------------------
    // ----- Cálculo das proporções para corrigir a imagem de acordo com suas coordenadas de lng e lat -----
    // -----------------------------------------------------------------------------------------------------

    let coord: Array<Array<number>> = polygon.map((a: any) => [a.lng, a.lat]);
    let coordLng: Array<number> = polygon.map((a: any) => [a.lng]).flat();
    let coordLat: Array<number> = polygon.map((a: any) => [a.lat]).flat();

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

    let dimensionLng: number = Math.round(pixels);
    let dimensionLat: number = Math.round((pixels * deltaLat) / deltaLng);

    let centroidLng: number = get_polygon_centroid(polygon).lng;
    let centroidLat: number = get_polygon_centroid(polygon).lat;

    // -----------------------------------------------------------------------------------------------------
    // ---- Com base nos pontos das coordenadas do talhão, declara o ponto central na lng e lat da foto ----
    // -----------------------------------------------------------------------------------------------------
    let point: object = ee.Geometry.Point([centroidLng, centroidLat]);

    // -----------------------------------------------------------------------------------------------------
    // ------------------------ Importa o Landsat 8 T1_32DAY_NDVI image collection -------------------------
    // -----------------------------------------------------------------------------------------------------
    let l8: any = ee.ImageCollection('LANDSAT/LC08/C01/T1_32DAY_NDVI');

    // -----------------------------------------------------------------------------------------------------
    // ----------------------------------- Definição de paletas de cores -----------------------------------
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
    // ------------------------------- Converte timestamp em formato de data -------------------------------
    // -----------------------------------------------------------------------------------------------------
    let formattedTime: any = (timeRange: any) => {
      let range: Array<string> = [];
      for (let i = 0; i < timeRange.length; i++) {
        let unix_timestamp: any = timeRange[i];
        let year = new Date(unix_timestamp).getFullYear();
        let month = new Date(unix_timestamp).getMonth() + 1;
        let day = new Date(unix_timestamp).getDate();
        let formattedTime =
          year + '/' + ('0' + month).slice(-2) + '/' + ('0' + day).slice(-2);
        range.push(formattedTime);
      }
      return range;
    };

    // -----------------------------------------------------------------------------------------------------
    // ---------------------------------------- Cria uma imagem RGB ----------------------------------------
    // -----------------------------------------------------------------------------------------------------
    let rangeDate: Array<number> = [date1, date2];
    let startDate: string = formattedTime(rangeDate)[0];
    let endDate: string = formattedTime(rangeDate)[1];

    let image: any = ee.Image(
      l8
        // .filterBounds(point)
        .filterDate(date1, date2)
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
    // ----------------------------------------- Gera link da foto -----------------------------------------
    // -----------------------------------------------------------------------------------------------------
    let urlImg: string = vis.getThumbURL({
      dimensions: [dimensionLng, dimensionLat],
      region: ee.Geometry.Polygon(coord)
    });

    // console.log(urlImg); // Mostra a url no console

    // -----------------------------------------------------------------------------------------------------
    // -------------------------------------------- Gera objeto --------------------------------------------
    // -----------------------------------------------------------------------------------------------------
    let myObj: object = {
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
    // console.log(myObj);
    return myObj;
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
