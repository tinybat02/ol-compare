import React, { PureComponent } from 'react';
import { PanelProps } from '@grafana/data';
import { PanelOptions } from 'types';
import { Map, View } from 'ol';
import XYZ from 'ol/source/XYZ';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import VectorSource from 'ol/source/Vector';
import { fromLonLat } from 'ol/proj';
import { defaults, DragPan, MouseWheelZoom } from 'ol/interaction';
import { platformModifierKeyOnly } from 'ol/events/condition';
import { truth, predicts, labels } from 'config/Constant';
import { createLineString, createLine } from './utils/helperFunc';
import { nanoid } from 'nanoid';
import 'ol/ol.css';
import './styles/MainStyle.css';

interface Props extends PanelProps<PanelOptions> {}
interface State {
  showTotalRoute: boolean;
  iterRoute: number;
  uncertainStart: string;
  uncertainEnd: string;
}

export class MainPanel extends PureComponent<Props, State> {
  id = 'id' + nanoid();
  map: Map;
  randomTile: TileLayer;
  partialRoute: VectorLayer;
  totalRoute: VectorLayer;

  state: State = {
    iterRoute: 0,
    showTotalRoute: true,
    uncertainStart: labels[0],
    uncertainEnd: labels[1],
  };

  componentDidMount() {
    const { tile_url, zoom_level, center_lon, center_lat } = this.props.options;

    const carto = new TileLayer({
      source: new XYZ({
        url: 'https://{1-4}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      }),
    });

    this.map = new Map({
      interactions: defaults({ dragPan: false, mouseWheelZoom: false, onFocusOnly: true }).extend([
        new DragPan({
          condition: function(event) {
            return platformModifierKeyOnly(event) || this.getPointerCount() === 2;
          },
        }),
        new MouseWheelZoom({
          condition: platformModifierKeyOnly,
        }),
      ]),
      layers: [carto],
      view: new View({
        center: fromLonLat([center_lon, center_lat]),
        zoom: zoom_level,
      }),
      target: this.id,
    });

    if (tile_url !== '') {
      this.randomTile = new TileLayer({
        source: new XYZ({
          url: tile_url,
        }),
        zIndex: 1,
      });
      this.map.addLayer(this.randomTile);
    }

    const truthLine = createLineString(truth, '#49A8DE');
    const predictLine = createLineString(predicts, '#FFA500');

    const firstTruthLine = createLine(truth[0], truth[1], false);
    const firstPredictLine = createLine(predicts[0], predicts[1], true);

    this.totalRoute = new VectorLayer({
      source: new VectorSource({
        features: [truthLine, predictLine],
      }),
      zIndex: 2,
    });
    this.map.addLayer(this.totalRoute);

    this.partialRoute = new VectorLayer({
      source: new VectorSource({
        features: [firstTruthLine, firstPredictLine],
      }),
      zIndex: 2,
    });
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (
      prevProps.options.center_lat !== this.props.options.center_lat ||
      prevProps.options.center_lon !== this.props.options.center_lon
    ) {
      this.map.getView().animate({
        center: fromLonLat([this.props.options.center_lon, this.props.options.center_lat]),
        duration: 2000,
      });
    }

    if (prevProps.options.tile_url !== this.props.options.tile_url) {
      if (this.randomTile) {
        this.map.removeLayer(this.randomTile);
      }

      if (this.props.options.tile_url !== '') {
        this.randomTile = new TileLayer({
          source: new XYZ({
            url: this.props.options.tile_url,
          }),
          zIndex: 1,
        });
        this.map.addLayer(this.randomTile);
      }
    }

    if (prevProps.options.zoom_level !== this.props.options.zoom_level) {
      this.map.getView().setZoom(this.props.options.zoom_level);
    }

    if (prevState.showTotalRoute !== this.state.showTotalRoute) {
      if (this.state.showTotalRoute) {
        this.map.removeLayer(this.partialRoute);
        this.map.removeLayer(this.totalRoute);
        this.map.addLayer(this.totalRoute);
      } else {
        this.map.removeLayer(this.totalRoute);
        this.map.removeLayer(this.partialRoute);
        this.map.addLayer(this.partialRoute);
      }
    }
  }

  handleShowTotalRoute = () => {
    this.setState({ showTotalRoute: !this.state.showTotalRoute });
  };

  handleIterRoute = (type: string) => () => {
    const { iterRoute } = this.state;

    if (type === 'previous' && iterRoute > 0) {
      this.map.removeLayer(this.partialRoute);
      this.setState(
        {
          ...this.state,
          iterRoute: iterRoute - 1,
          uncertainStart: labels[iterRoute - 1],
          uncertainEnd: labels[iterRoute],
        },
        () => {
          const truthFeature = createLine(truth[this.state.iterRoute], truth[this.state.iterRoute + 1], false);
          const predictFeature = createLine(predicts[this.state.iterRoute], predicts[this.state.iterRoute + 1], true);

          this.partialRoute = new VectorLayer({
            source: new VectorSource({
              features: [truthFeature, predictFeature],
            }),
            zIndex: 2,
          });
          this.map.addLayer(this.partialRoute);
        }
      );
    }

    if (type === 'next' && iterRoute < truth.length - 2) {
      this.map.removeLayer(this.partialRoute);
      this.setState(
        {
          ...this.state,
          iterRoute: iterRoute + 1,
          uncertainStart: labels[iterRoute + 1],
          uncertainEnd: labels[iterRoute + 2],
        },
        () => {
          const truthFeature = createLine(truth[this.state.iterRoute], truth[this.state.iterRoute + 1], false);
          const predictFeature = createLine(predicts[this.state.iterRoute], predicts[this.state.iterRoute + 1], true);
          this.partialRoute = new VectorLayer({
            source: new VectorSource({
              features: [truthFeature, predictFeature],
            }),
            zIndex: 2,
          });
          this.map.addLayer(this.partialRoute);
        }
      );
    }
  };

  render() {
    const { width, height } = this.props;
    const { showTotalRoute, iterRoute, uncertainStart, uncertainEnd } = this.state;

    return (
      <div style={{ width, height }}>
        <div>
          <button className="custom-btn" onClick={this.handleShowTotalRoute}>
            {showTotalRoute ? 'Show Single' : 'Show Total'} Route
          </button>
          {!showTotalRoute && (
            <>
              <button
                className="custom-btn"
                onClick={this.handleIterRoute('previous')}
                disabled={showTotalRoute}
                style={{ backgroundColor: showTotalRoute ? '#ccc' : '#326666' }}
              >
                &#60;&#60;
              </button>
              <button
                className="custom-btn"
                onClick={this.handleIterRoute('next')}
                disabled={showTotalRoute}
                style={{ backgroundColor: showTotalRoute ? '#ccc' : '#326666' }}
              >
                &#62;&#62;
              </button>
              <span style={{ marginLeft: 10 }}>
                {' '}
                {`${iterRoute + 1} / ${truth.length - 1} - Uncertainty: Start ${uncertainStart} End ${uncertainEnd}`}
              </span>
            </>
          )}
        </div>

        <div
          id={this.id}
          style={{
            width,
            height: height - 40,
          }}
        ></div>
      </div>
    );
  }
}
