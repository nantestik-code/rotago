
/// <reference types="vite/client" />

// Google Maps API type declarations
interface Window {
  google: typeof google;
  initMap: () => void;
}

declare namespace google {
  namespace maps {
    class Map {
      constructor(mapDiv: Element, opts?: MapOptions);
      setCenter(latLng: LatLng | LatLngLiteral): void;
      setZoom(zoom: number): void;
      panTo(latLng: LatLng | LatLngLiteral): void;
      getCenter(): LatLng;
      getZoom(): number;
    }

    class Marker {
      constructor(opts?: MarkerOptions);
      setMap(map: Map | null): void;
      setPosition(latLng: LatLng | LatLngLiteral): void;
      addListener(eventName: string, handler: Function): MapsEventListener;
      setAnimation(animation: any): void;
    }

    class DirectionsRenderer {
      constructor(opts?: DirectionsRendererOptions);
      setMap(map: Map | null): void;
      setDirections(directions: DirectionsResult): void;
    }

    class DirectionsService {
      route(request: DirectionsRequest, callback: (result: DirectionsResult, status: DirectionsStatus) => void): void;
    }

    class Size {
      constructor(width: number, height: number, widthUnit?: string, heightUnit?: string);
    }

    class LatLng {
      constructor(lat: number, lng: number);
      lat(): number;
      lng(): number;
    }

    class Point {
      constructor(x: number, y: number);
      x: number;
      y: number;
      equals(other: Point): boolean;
      toString(): string;
    }

    const Animation: {
      BOUNCE: number;
      DROP: number;
    };

    const SymbolPath: {
      CIRCLE: number;
      FORWARD_CLOSED_ARROW: number;
    };

    const DirectionsStatus: {
      OK: string;
      NOT_FOUND: string;
      ZERO_RESULTS: string;
      MAX_WAYPOINTS_EXCEEDED: string;
      INVALID_REQUEST: string;
      OVER_QUERY_LIMIT: string;
      REQUEST_DENIED: string;
      UNKNOWN_ERROR: string;
    };

    const TravelMode: {
      BICYCLING: string;
      DRIVING: string;
      TRANSIT: string;
      WALKING: string;
    };

    interface MapOptions {
      center?: LatLng | LatLngLiteral;
      zoom?: number;
      mapTypeId?: string;
      draggable?: boolean;
      mapTypeControl?: boolean;
      streetViewControl?: boolean;
      fullscreenControl?: boolean;
      zoomControl?: boolean;
    }

    interface LatLngLiteral {
      lat: number;
      lng: number;
    }

    interface MarkerOptions {
      position: LatLng | LatLngLiteral;
      map?: Map;
      title?: string;
      icon?: string | Icon;
      label?: string | MarkerLabel;
      animation?: number;
    }

    interface DirectionsRequest {
      origin: string | LatLng | LatLngLiteral;
      destination: string | LatLng | LatLngLiteral;
      travelMode: string;
      waypoints?: DirectionsWaypoint[];
      optimizeWaypoints?: boolean;
    }

    interface DirectionsWaypoint {
      location: string | LatLng | LatLngLiteral;
      stopover: boolean;
    }

    interface DirectionsResult {
      routes: DirectionsRoute[];
    }

    interface DirectionsRoute {
      legs: DirectionsLeg[];
      overview_path: LatLng[];
      warnings: string[];
      waypoint_order: number[];
    }

    interface DirectionsLeg {
      distance: Distance;
      duration: Duration;
      start_location: LatLng;
      end_location: LatLng;
      steps: DirectionsStep[];
    }

    interface DirectionsStep {
      distance: Distance;
      duration: Duration;
      instructions: string;
      path: LatLng[];
    }

    interface Distance {
      text: string;
      value: number;
    }

    interface Duration {
      text: string;
      value: number;
    }

    interface Icon {
      url: string;
      size?: Size;
      scaledSize?: Size;
      origin?: Point;
      anchor?: Point;
      labelOrigin?: Point;
    }

    interface Point {
      x: number;
      y: number;
    }

    interface DirectionsRendererOptions {
      directions?: DirectionsResult;
      map?: Map;
      panel?: Element;
      polylineOptions?: PolylineOptions;
      suppressMarkers?: boolean;
      suppressPolylines?: boolean;
    }

    interface PolylineOptions {
      clickable?: boolean;
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
    }

    interface MarkerLabel {
      text: string;
      color?: string;
      fontSize?: string;
      fontFamily?: string;
    }

    interface MapsEventListener {
      remove(): void;
    }
  }
}
