import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import { Style, Stroke, Icon } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import Arrow from '../img/arrow.png';
import Arrow1 from '../img/Arrow1.png';

export const createLineString = (data: number[][], color: string) => {
  const lineFeature = new Feature(new LineString(data).transform('EPSG:4326', 'EPSG:3857'));
  lineFeature.setStyle(
    new Style({
      stroke: new Stroke({
        color: color,
        width: 2,
      }),
    })
  );
  return lineFeature;
};

export const createLine = (start: number[], end: number[], predict: boolean) => {
  let pic = Arrow,
    color = '#49A8DE';
  if (predict) {
    pic = Arrow1;
    color = '#FFA500';
  }

  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const rotation = Math.atan2(dy, dx);

  const lineFeature = new Feature(new LineString([start, end]).transform('EPSG:4326', 'EPSG:3857'));

  lineFeature.setStyle([
    new Style({
      stroke: new Stroke({
        color: color,
        width: 2,
      }),
    }),
    new Style({
      geometry: new Point(fromLonLat(end)),
      image: new Icon({
        src: pic,
        anchor: [0.75, 0.5],
        rotateWithView: true,
        rotation: -rotation,
      }),
    }),
  ]);

  return lineFeature;
};
